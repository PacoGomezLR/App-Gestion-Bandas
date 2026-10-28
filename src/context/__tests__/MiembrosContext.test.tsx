import { act, fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { Button, Text, TextInput, View } from "react-native";

import { inicializarBaseDeDatos } from "../../database/migrations";
import {
  eliminarMiembro as eliminarMiembroEnBase,
  guardarMiembro as guardarMiembroEnBase,
  listarMiembros,
} from "../../database/repositories/miembrosRepository";
import type { Miembro } from "../../types/miembro";
import {
  MiembrosProvider,
  useMiembrosContext,
} from "../MiembrosContext";

jest.mock("../../database/migrations", () => ({
  inicializarBaseDeDatos: jest.fn(),
}));

jest.mock("../../database/repositories/miembrosRepository", () => ({
  listarMiembros: jest.fn(),
  guardarMiembro: jest.fn(),
  eliminarMiembro: jest.fn(),
}));

const mockInicializarBaseDeDatos = jest.mocked(inicializarBaseDeDatos);
const mockListarMiembros = jest.mocked(listarMiembros);
const mockGuardarMiembroEnBase = jest.mocked(guardarMiembroEnBase);
const mockEliminarMiembroEnBase = jest.mocked(eliminarMiembroEnBase);

const miembrosGuardados: Miembro[] = [
  { id: "1", nombre: "Ana" },
  { id: "2", nombre: "Bruno" },
];

function EstadoCarga() {
  const { cargando, errorPersistencia } = useMiembrosContext();

  return (
    <View>
      <Text>{cargando ? "Cargando" : "Carga terminada"}</Text>
      {errorPersistencia !== "" && <Text>{errorPersistencia}</Text>}
    </View>
  );
}

async function renderizarConProvider(contenido: ReactElement) {
  const resultado = await render(
    <MiembrosProvider>
      {contenido}
      <EstadoCarga />
    </MiembrosProvider>
  );

  await screen.findByText("Carga terminada");

  return resultado;
}

function ConsumidorA() {
  const { nombre, setNombre, guardarMiembro, eliminarMiembro } =
    useMiembrosContext();

  return (
    <View>
      <TextInput
        placeholder="Nombre en A"
        value={nombre}
        onChangeText={setNombre}
      />
      {/* No se devuelve la promesa para que el test controle cuándo termina la escritura */}
      <Button
        title="Guardar en A"
        onPress={() => {
          void guardarMiembro();
        }}
      />
      <Button
        title="Eliminar miembro 1"
        onPress={() => {
          void eliminarMiembro("1");
        }}
      />
    </View>
  );
}

function ConsumidorB() {
  const { miembros } = useMiembrosContext();

  return (
    <View>
      <Text>Total en B: {miembros.length}</Text>
      {miembros.map((miembro) => (
        <Text key={miembro.id}>B ve a {miembro.nombre}</Text>
      ))}
    </View>
  );
}

function ConsumidorSinProvider() {
  useMiembrosContext();

  return null;
}

describe("MiembrosContext", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockInicializarBaseDeDatos.mockResolvedValue(undefined);
    mockListarMiembros.mockResolvedValue(miembrosGuardados);
    mockGuardarMiembroEnBase.mockResolvedValue(undefined);
    mockEliminarMiembroEnBase.mockResolvedValue(undefined);
  });

  test("comparte la misma lista entre consumidores", async () => {
    const { getByPlaceholderText, getByText, findByText } =
      await renderizarConProvider(
        <>
          <ConsumidorA />
          <ConsumidorB />
        </>
      );

    expect(getByText("Total en B: 2")).toBeTruthy();

    await fireEvent.changeText(getByPlaceholderText("Nombre en A"), "Carla");
    await fireEvent.press(getByText("Guardar en A"));

    expect(await findByText("B ve a Carla")).toBeTruthy();
    expect(getByText("Total en B: 3")).toBeTruthy();
  });

  test("carga los miembros desde SQLite", async () => {
    const { getByText } = await renderizarConProvider(<ConsumidorB />);

    expect(getByText("Total en B: 2")).toBeTruthy();
    expect(getByText("B ve a Ana")).toBeTruthy();
    expect(getByText("B ve a Bruno")).toBeTruthy();
    expect(mockInicializarBaseDeDatos.mock.invocationCallOrder[0]).toBeLessThan(
      mockListarMiembros.mock.invocationCallOrder[0]
    );
  });

  test("guarda en SQLite antes de añadir el miembro al estado", async () => {
    let terminarGuardado: () => void = () => {};
    mockGuardarMiembroEnBase.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          terminarGuardado = resolve;
        })
    );

    const { getByPlaceholderText, getByText, queryByText, findByText } =
      await renderizarConProvider(
        <>
          <ConsumidorA />
          <ConsumidorB />
        </>
      );

    await fireEvent.changeText(getByPlaceholderText("Nombre en A"), "Carla");
    await fireEvent.press(getByText("Guardar en A"));

    // SQLite ya ha recibido el miembro, pero todavía no ha confirmado
    expect(mockGuardarMiembroEnBase).toHaveBeenCalledWith({
      id: expect.any(String),
      nombre: "Carla",
    });
    expect(queryByText("B ve a Carla")).toBeNull();

    await act(async () => {
      terminarGuardado();
    });

    expect(await findByText("B ve a Carla")).toBeTruthy();
  });

  test("no añade el miembro si SQLite falla al guardar", async () => {
    mockGuardarMiembroEnBase.mockRejectedValueOnce(new Error("disco lleno"));

    const { getByPlaceholderText, getByDisplayValue, getByText, queryByText, findByText } =
      await renderizarConProvider(
        <>
          <ConsumidorA />
          <ConsumidorB />
        </>
      );

    await fireEvent.changeText(getByPlaceholderText("Nombre en A"), "Carla");
    await fireEvent.press(getByText("Guardar en A"));

    expect(await findByText("No se ha podido guardar el músico")).toBeTruthy();
    expect(getByText("Total en B: 2")).toBeTruthy();
    expect(queryByText("B ve a Carla")).toBeNull();
    expect(getByDisplayValue("Carla")).toBeTruthy();
  });

  test("no elimina el miembro si SQLite falla", async () => {
    mockEliminarMiembroEnBase.mockRejectedValueOnce(new Error("bloqueada"));

    const { getByText, findByText } = await renderizarConProvider(
      <>
        <ConsumidorA />
        <ConsumidorB />
      </>
    );

    await fireEvent.press(getByText("Eliminar miembro 1"));

    expect(await findByText("No se ha podido eliminar el músico")).toBeTruthy();
    expect(mockEliminarMiembroEnBase).toHaveBeenCalledWith("1");
    expect(getByText("B ve a Ana")).toBeTruthy();
    expect(getByText("Total en B: 2")).toBeTruthy();
  });

  test("falla si se usa fuera del provider", async () => {
    // React registra el error lanzado durante el render; se silencia para no ensuciar la salida
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await expect(render(<ConsumidorSinProvider />)).rejects.toThrow(
      "useMiembrosContext debe usarse dentro de MiembrosProvider"
    );

    consoleError.mockRestore();
  });
});
