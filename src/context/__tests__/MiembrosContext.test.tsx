import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { type ReactElement, useState } from "react";
import { Button, Text, TextInput, View } from "react-native";

import { eventosIniciales } from "../../data/eventosIniciales";
import { inicializarBaseDeDatos } from "../../database/migrations";
import {
  eliminarEvento as eliminarEventoEnBase,
  guardarEvento as guardarEventoEnBase,
  listarEventos,
} from "../../database/repositories/eventosRepository";
import {
  eliminarMiembro as eliminarMiembroEnBase,
  guardarMiembro as guardarMiembroEnBase,
  listarMiembros,
} from "../../database/repositories/miembrosRepository";
import type { Evento } from "../../types/evento";
import type { Miembro } from "../../types/miembro";
import { EventosProvider, useEventosContext } from "../EventosContext";
import {
  MiembrosProvider,
  useMiembrosContext,
} from "../MiembrosContext";

jest.mock("../../database/migrations", () => ({
  inicializarBaseDeDatos: jest.fn(),
}));

// EventosProvider forma parte del árbol, así que su repositorio también se sustituye
jest.mock("../../database/repositories/eventosRepository", () => ({
  listarEventos: jest.fn(),
  guardarEvento: jest.fn(),
  eliminarEvento: jest.fn(),
}));

jest.mock("../../database/repositories/miembrosRepository", () => ({
  listarMiembros: jest.fn(),
  guardarMiembro: jest.fn(),
  eliminarMiembro: jest.fn(),
}));

const mockInicializarBaseDeDatos = jest.mocked(inicializarBaseDeDatos);
const mockListarEventos = jest.mocked(listarEventos);
const mockGuardarEventoEnBase = jest.mocked(guardarEventoEnBase);
const mockEliminarEventoEnBase = jest.mocked(eliminarEventoEnBase);
const mockListarMiembros = jest.mocked(listarMiembros);
const mockGuardarMiembroEnBase = jest.mocked(guardarMiembroEnBase);
const mockEliminarMiembroEnBase = jest.mocked(eliminarMiembroEnBase);

const miembrosGuardados: Miembro[] = [
  { id: "1", nombre: "Ana" },
  { id: "2", nombre: "Bruno" },
];

const musicos: Miembro[] = [
  { id: "1", nombre: "Paco" },
  { id: "2", nombre: "Rafa" },
];

function crearEvento(id: string, miembroIds: string[]): Evento {
  return {
    id,
    titulo: `Evento ${id}`,
    tipo: "concierto",
    fecha: "2026-12-01",
    hora: "",
    lugar: "",
    notas: "",
    estado: "pendiente",
    tecnicoIds: [],
    miembroIds,
  };
}

function EstadoCarga() {
  const { cargando: cargandoEventos } = useEventosContext();
  const { cargando, errorPersistencia } = useMiembrosContext();

  return (
    <View>
      <Text>
        {cargando || cargandoEventos ? "Cargando" : "Carga terminada"}
      </Text>
      {errorPersistencia !== "" && <Text>{errorPersistencia}</Text>}
    </View>
  );
}

async function renderizarConProvider(contenido: ReactElement) {
  const resultado = await render(
    <EventosProvider>
      <MiembrosProvider>
        {contenido}
        <EstadoCarga />
      </MiembrosProvider>
    </EventosProvider>
  );

  await screen.findByText("Carga terminada");

  return resultado;
}

function ConsumidorEventos() {
  const { eventos } = useEventosContext();

  return (
    <View>
      {eventos.map((evento) => (
        <Text key={evento.id}>
          Asignación {evento.id}: {evento.miembroIds.join(",") || "ninguna"}
        </Text>
      ))}
    </View>
  );
}

function ConsumidorMusicos() {
  const { miembros, eliminarMiembro, errorEliminacion } = useMiembrosContext();
  const [resultado, setResultado] = useState("sin intentar");

  return (
    <View>
      <Text>Total músicos: {miembros.length}</Text>
      {miembros.map((miembro) => (
        <Text key={miembro.id}>Músico: {miembro.nombre}</Text>
      ))}
      <Text>
        {errorEliminacion !== "" ? errorEliminacion : "Sin error de eliminación"}
      </Text>
      <Text>Resultado: {resultado}</Text>
      <Button
        title="Eliminar Paco"
        onPress={() => {
          void eliminarMiembro("1").then((eliminado) =>
            setResultado(String(eliminado))
          );
        }}
      />
      <Button
        title="Eliminar id 9"
        onPress={() => {
          void eliminarMiembro("9").then((eliminado) =>
            setResultado(String(eliminado))
          );
        }}
      />
    </View>
  );
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
    mockListarEventos.mockResolvedValue(eventosIniciales);
    mockGuardarEventoEnBase.mockResolvedValue(undefined);
    mockEliminarEventoEnBase.mockResolvedValue(undefined);
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
    // Ana no está asignada a ningún evento: pasa la regla de negocio y llega a SQLite
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

  test("permite eliminar un músico sin eventos asignados", async () => {
    mockListarMiembros.mockResolvedValue(musicos);
    mockListarEventos.mockResolvedValue([crearEvento("10", ["2"])]);

    const { getByText, queryByText, findByText } = await renderizarConProvider(
      <ConsumidorMusicos />
    );

    await fireEvent.press(getByText("Eliminar Paco"));

    expect(await findByText("Resultado: true")).toBeTruthy();
    expect(mockEliminarMiembroEnBase).toHaveBeenCalledWith("1");
    expect(queryByText("Músico: Paco")).toBeNull();
    expect(getByText("Total músicos: 1")).toBeTruthy();
    expect(getByText("Sin error de eliminación")).toBeTruthy();
  });

  test("impide eliminar un músico asignado a un evento", async () => {
    mockListarMiembros.mockResolvedValue(musicos);
    mockListarEventos.mockResolvedValue([crearEvento("10", ["1"])]);

    const { getByText, findByText } = await renderizarConProvider(
      <>
        <ConsumidorEventos />
        <ConsumidorMusicos />
      </>
    );

    await fireEvent.press(getByText("Eliminar Paco"));

    expect(await findByText("Resultado: false")).toBeTruthy();
    expect(
      getByText("No se puede eliminar a Paco porque está asignado a 1 evento")
    ).toBeTruthy();
    expect(getByText("Músico: Paco")).toBeTruthy();
    expect(getByText("Total músicos: 2")).toBeTruthy();
    expect(getByText("Asignación 10: 1")).toBeTruthy();
    // La regla se aplica antes de llegar a SQLite
    expect(mockEliminarMiembroEnBase).not.toHaveBeenCalled();
  });

  test("indica en plural cuando el músico está asignado a varios eventos", async () => {
    mockListarMiembros.mockResolvedValue(musicos);
    mockListarEventos.mockResolvedValue([
      crearEvento("10", ["1"]),
      crearEvento("11", ["2", "1"]),
    ]);

    const { getByText, findByText } = await renderizarConProvider(
      <>
        <ConsumidorEventos />
        <ConsumidorMusicos />
      </>
    );

    await fireEvent.press(getByText("Eliminar Paco"));

    expect(await findByText("Resultado: false")).toBeTruthy();
    expect(
      getByText("No se puede eliminar a Paco porque está asignado a 2 eventos")
    ).toBeTruthy();
    expect(getByText("Músico: Paco")).toBeTruthy();
    expect(getByText("Asignación 10: 1")).toBeTruthy();
    expect(getByText("Asignación 11: 2,1")).toBeTruthy();
    expect(mockEliminarMiembroEnBase).not.toHaveBeenCalled();
  });

  test("usa 'este músico' si el id asignado no corresponde a ningún músico", async () => {
    mockListarMiembros.mockResolvedValue(musicos);
    mockListarEventos.mockResolvedValue([crearEvento("10", ["9"])]);

    const { getByText, findByText } = await renderizarConProvider(
      <ConsumidorMusicos />
    );

    await fireEvent.press(getByText("Eliminar id 9"));

    expect(await findByText("Resultado: false")).toBeTruthy();
    expect(
      getByText(
        "No se puede eliminar a este músico porque está asignado a 1 evento"
      )
    ).toBeTruthy();
    expect(mockEliminarMiembroEnBase).not.toHaveBeenCalled();
  });

  test("no permite eliminar mientras los eventos están cargando", async () => {
    let terminarCargaEventos: (eventos: Evento[]) => void = () => {};
    mockListarEventos.mockImplementation(
      () =>
        new Promise<Evento[]>((resolve) => {
          terminarCargaEventos = resolve;
        })
    );
    mockListarMiembros.mockResolvedValue(musicos);

    const { getByText, findByText } = await render(
      <EventosProvider>
        <MiembrosProvider>
          <ConsumidorMusicos />
        </MiembrosProvider>
      </EventosProvider>
    );

    // Los músicos ya están cargados, pero los eventos siguen pendientes
    expect(await findByText("Músico: Paco")).toBeTruthy();

    await fireEvent.press(getByText("Eliminar Paco"));

    expect(await findByText("Resultado: false")).toBeTruthy();
    expect(getByText("Músico: Paco")).toBeTruthy();
    expect(getByText("Total músicos: 2")).toBeTruthy();
    expect(getByText("Sin error de eliminación")).toBeTruthy();
    expect(mockEliminarMiembroEnBase).not.toHaveBeenCalled();

    await act(async () => {
      terminarCargaEventos(eventosIniciales);
    });
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
