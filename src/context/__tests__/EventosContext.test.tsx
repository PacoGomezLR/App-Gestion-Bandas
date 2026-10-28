import { act, fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { Button, Text, View } from "react-native";

import { eventosIniciales } from "../../data/eventosIniciales";
import { inicializarBaseDeDatos } from "../../database/migrations";
import {
  eliminarEvento as eliminarEventoEnBase,
  guardarEvento as guardarEventoEnBase,
  listarEventos,
} from "../../database/repositories/eventosRepository";
import type { Evento } from "../../types/evento";
import {
  EventosProvider,
  useEventosContext,
} from "../EventosContext";

jest.mock("../../database/migrations", () => ({
  inicializarBaseDeDatos: jest.fn(),
}));

jest.mock("../../database/repositories/eventosRepository", () => ({
  listarEventos: jest.fn(),
  guardarEvento: jest.fn(),
  eliminarEvento: jest.fn(),
}));

const mockInicializarBaseDeDatos = jest.mocked(inicializarBaseDeDatos);
const mockListarEventos = jest.mocked(listarEventos);
const mockGuardarEventoEnBase = jest.mocked(guardarEventoEnBase);
const mockEliminarEventoEnBase = jest.mocked(eliminarEventoEnBase);

function EstadoCarga() {
  const { cargando, errorPersistencia } = useEventosContext();

  return (
    <View>
      <Text>{cargando ? "Cargando" : "Carga terminada"}</Text>
      {errorPersistencia !== "" && <Text>{errorPersistencia}</Text>}
    </View>
  );
}

async function renderizarConProvider(contenido: ReactElement) {
  const resultado = await render(
    <EventosProvider>
      {contenido}
      <EstadoCarga />
    </EventosProvider>
  );

  await screen.findByText("Carga terminada");

  return resultado;
}

function ConsumidorA() {
  const { titulo, setTitulo, setFecha, guardarEvento, eliminarEvento } =
    useEventosContext();

  return (
    <View>
      <Text>Título en A: {titulo}</Text>
      <Button
        title="Rellenar en A"
        onPress={() => {
          setTitulo("Concierto compartido");
          setFecha("2026-12-31");
        }}
      />
      {/* No se devuelve la promesa para que el test controle cuándo termina la escritura */}
      <Button
        title="Guardar en A"
        onPress={() => {
          void guardarEvento();
        }}
      />
      <Button
        title="Eliminar evento 1"
        onPress={() => {
          void eliminarEvento("1");
        }}
      />
    </View>
  );
}

function ConsumidorB() {
  const { eventos } = useEventosContext();

  return (
    <View>
      <Text>Total en B: {eventos.length}</Text>
      {eventos.map((evento) => (
        <Text key={evento.id}>{evento.titulo}</Text>
      ))}
    </View>
  );
}

function ConsumidorJson() {
  const { eventos } = useEventosContext();

  return <Text testID="eventos-json">{JSON.stringify(eventos)}</Text>;
}

function ConsumidorSinProvider() {
  useEventosContext();

  return null;
}

describe("EventosContext", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockInicializarBaseDeDatos.mockResolvedValue(undefined);
    mockListarEventos.mockResolvedValue(eventosIniciales);
    mockGuardarEventoEnBase.mockResolvedValue(undefined);
    mockEliminarEventoEnBase.mockResolvedValue(undefined);
  });

  test("comparte la misma lista de eventos entre consumidores", async () => {
    const { getByText, queryByText, findByText } = await renderizarConProvider(
      <>
        <ConsumidorA />
        <ConsumidorB />
      </>
    );

    expect(getByText("Total en B: 3")).toBeTruthy();
    expect(queryByText("Concierto compartido")).toBeNull();

    await fireEvent.press(getByText("Rellenar en A"));
    await fireEvent.press(getByText("Guardar en A"));

    expect(await findByText("Total en B: 4")).toBeTruthy();
    expect(getByText("Concierto compartido")).toBeTruthy();
  });

  test("carga los eventos desde SQLite al iniciar", async () => {
    const eventosGuardados: Evento[] = [
      {
        id: "20",
        titulo: "Festival de invierno",
        tipo: "concierto",
        fecha: "2027-01-15",
        estado: "confirmado",
        tecnicoIds: ["2"],
      },
    ];
    mockListarEventos.mockResolvedValue(eventosGuardados);

    const { getByTestId } = await renderizarConProvider(<ConsumidorJson />);

    expect(JSON.parse(getByTestId("eventos-json").props.children)).toEqual(
      eventosGuardados
    );
    // Primero se inicializa la base y después se lee
    expect(mockInicializarBaseDeDatos).toHaveBeenCalledTimes(1);
    expect(mockInicializarBaseDeDatos.mock.invocationCallOrder[0]).toBeLessThan(
      mockListarEventos.mock.invocationCallOrder[0]
    );
  });

  test("guarda en SQLite antes de añadir el evento al estado", async () => {
    let terminarGuardado: () => void = () => {};
    mockGuardarEventoEnBase.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          terminarGuardado = resolve;
        })
    );

    const { getByText, queryByText, findByText } = await renderizarConProvider(
      <>
        <ConsumidorA />
        <ConsumidorB />
      </>
    );

    await fireEvent.press(getByText("Rellenar en A"));
    await fireEvent.press(getByText("Guardar en A"));

    // SQLite ya ha recibido el evento, pero todavía no ha confirmado
    expect(mockGuardarEventoEnBase).toHaveBeenCalledTimes(1);
    expect(mockGuardarEventoEnBase).toHaveBeenCalledWith(
      expect.objectContaining({
        titulo: "Concierto compartido",
        fecha: "2026-12-31",
        tipo: "concierto",
        estado: "pendiente",
        tecnicoIds: [],
      })
    );
    expect(queryByText("Concierto compartido")).toBeNull();
    expect(getByText("Total en B: 3")).toBeTruthy();

    await act(async () => {
      terminarGuardado();
    });

    expect(await findByText("Concierto compartido")).toBeTruthy();
    expect(getByText("Total en B: 4")).toBeTruthy();
  });

  test("no modifica la lista si SQLite falla al guardar", async () => {
    mockGuardarEventoEnBase.mockRejectedValueOnce(new Error("disco lleno"));

    const { getByText, queryByText, findByText } = await renderizarConProvider(
      <>
        <ConsumidorA />
        <ConsumidorB />
      </>
    );

    await fireEvent.press(getByText("Rellenar en A"));
    await fireEvent.press(getByText("Guardar en A"));

    expect(await findByText("No se ha podido guardar el evento")).toBeTruthy();
    expect(getByText("Total en B: 3")).toBeTruthy();
    expect(queryByText("Concierto compartido")).toBeNull();
    // El formulario no se limpia
    expect(getByText("Título en A: Concierto compartido")).toBeTruthy();
  });

  test("no elimina localmente si SQLite falla", async () => {
    mockEliminarEventoEnBase.mockRejectedValueOnce(new Error("bloqueada"));

    const { getByText, findByText } = await renderizarConProvider(
      <>
        <ConsumidorA />
        <ConsumidorB />
      </>
    );

    await fireEvent.press(getByText("Eliminar evento 1"));

    expect(await findByText("No se ha podido eliminar el evento")).toBeTruthy();
    expect(mockEliminarEventoEnBase).toHaveBeenCalledWith("1");
    expect(getByText("Total en B: 3")).toBeTruthy();
    expect(getByText("Concierto en Córdoba")).toBeTruthy();
  });

  test("falla si se usa fuera del provider", async () => {
    // React registra el error lanzado durante el render; se silencia para no ensuciar la salida
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await expect(render(<ConsumidorSinProvider />)).rejects.toThrow(
      "useEventosContext debe usarse dentro de EventosProvider"
    );

    consoleError.mockRestore();
  });
});
