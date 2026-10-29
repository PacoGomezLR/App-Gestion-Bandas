import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { type ReactElement, useState } from "react";
import { Button, Text, TextInput, View } from "react-native";

import { eventosIniciales } from "../../data/eventosIniciales";
import { tecnicosIniciales } from "../../data/tecnicosIniciales";
import { inicializarBaseDeDatos } from "../../database/migrations";
import { listarTecnicos as listarTecnicosSqlite } from "../../database/repositories/tecnicosRepository";
import { ErrorRepositorio } from "../../services/supabase/errores";
import type { DatosEvento } from "../../services/supabase/mapeoEventos";
import type { Evento } from "../../types/evento";
import type { Tecnico } from "../../types/tecnico";
import { useBandaContext } from "../BandaContext";
import { EventosProvider, useEventosContext } from "../EventosContext";
import {
  TecnicosProvider,
  useTecnicosContext,
} from "../TecnicosContext";

// Supabase se simula solo para comprobar que ya no se usa como fuente ni como respaldo
jest.mock("../../database/migrations", () => ({
  inicializarBaseDeDatos: jest.fn(),
}));

jest.mock("../../database/repositories/tecnicosRepository", () => ({
  listarTecnicos: jest.fn(),
  guardarTecnico: jest.fn(),
  eliminarTecnico: jest.fn(),
}));

const mockListarEventos = jest.fn<Promise<Evento[]>, []>();
const mockCrearEvento = jest.fn<Promise<Evento>, [DatosEvento]>();
const mockActualizarEvento = jest.fn<Promise<Evento>, [Evento]>();
const mockEliminarEventoEnBase = jest.fn<Promise<void>, [string]>();
const mockRepositorioPedido = jest.fn<void, [string]>();
const mockListarTecnicos = jest.fn<Promise<Tecnico[]>, []>();
const mockCrearTecnico = jest.fn<Promise<Tecnico>, [string]>();
const mockActualizarTecnico = jest.fn<Promise<Tecnico>, [Tecnico]>();
const mockEliminarTecnicoEnBase = jest.fn<Promise<void>, [string]>();

// EventosProvider forma parte del árbol, así que su repositorio también se sustituye
jest.mock("../../services/supabase/eventos", () => ({
  crearRepositorioEventosSupabase: () => ({
    listar: () => mockListarEventos(),
    crear: (...args: Parameters<typeof mockCrearEvento>) => mockCrearEvento(...args),
    actualizar: (...args: Parameters<typeof mockActualizarEvento>) =>
      mockActualizarEvento(...args),
    eliminar: (id: string) => mockEliminarEventoEnBase(id),
  }),
}));

jest.mock("../../services/supabase/personas", () => ({
  crearRepositorioTecnicosSupabase: (bandaId: string) => {
    mockRepositorioPedido(bandaId);

    return {
      listar: () => mockListarTecnicos(),
      crear: (nombre: string) => mockCrearTecnico(nombre),
      actualizar: (...args: Parameters<typeof mockActualizarTecnico>) =>
        mockActualizarTecnico(...args),
      eliminar: (id: string) => mockEliminarTecnicoEnBase(id),
    };
  },
}));

// Solo se simula el hook: el BandaContext real cargaría el cliente Supabase
jest.mock("../BandaContext", () => ({
  useBandaContext: jest.fn(),
}));

const mockInicializarBaseDeDatos = jest.mocked(inicializarBaseDeDatos);
const mockListarTecnicosSqlite = jest.mocked(listarTecnicosSqlite);
const mockUseBandaContext = jest.mocked(useBandaContext);

function simularBanda(bandaId: string, esAdmin = true) {
  mockUseBandaContext.mockReturnValue({
    bandas: [],
    bandaActual: { id: bandaId, nombre: `Banda ${bandaId}`, creadaPor: "u1", creadaEn: "2026-01-01" },
    pertenenciaActual: null,
    cargando: false,
    errorCarga: "",
    error: "",
    esAdmin,
    crearBanda: jest.fn(),
    seleccionarBanda: jest.fn(),
    recargarBandas: jest.fn(),
  });
}

function EstadoCarga() {
  const { cargando: cargandoEventos } = useEventosContext();
  const { cargando: cargandoTecnicos } = useTecnicosContext();

  return (
    <Text>
      {cargandoEventos || cargandoTecnicos ? "Cargando" : "Carga terminada"}
    </Text>
  );
}

async function renderizarConProviders(contenido: ReactElement) {
  const resultado = await render(
    <EventosProvider>
      <TecnicosProvider>
        {contenido}
        <EstadoCarga />
      </TecnicosProvider>
    </EventosProvider>
  );

  await screen.findByText("Carga terminada");

  return resultado;
}

function ConsumidorA() {
  const { nombre, setNombre, guardarTecnico } = useTecnicosContext();

  return (
    <View>
      <TextInput
        placeholder="Nombre en A"
        value={nombre}
        onChangeText={setNombre}
      />
      <Button
        title="Crear desde A"
        onPress={() => {
          void guardarTecnico();
        }}
      />
    </View>
  );
}

function ConsumidorB() {
  const { tecnicos } = useTecnicosContext();

  return (
    <View>
      <Text>Total en B: {tecnicos.length}</Text>
      {tecnicos.map((tecnico) => (
        <Text key={tecnico.id}>B ve a {tecnico.nombre}</Text>
      ))}
    </View>
  );
}

// Asigna técnicos a eventos usando solo la API pública de EventosContext
function ConsumidorEventos() {
  const { eventos, prepararEdicion, alternarTecnico, guardarEvento } =
    useEventosContext();

  return (
    <View>
      {eventos.map((evento) => (
        <View key={evento.id}>
          <Text>
            Evento {evento.id}: {evento.tecnicoIds.join(",") || "sin técnicos"}
          </Text>
          <Button
            title={`Editar evento ${evento.id}`}
            onPress={() => prepararEdicion(evento)}
          />
        </View>
      ))}
      <Button title="Asignar Carlos" onPress={() => alternarTecnico("1")} />
      <Button
        title="Guardar evento"
        onPress={() => {
          void guardarEvento();
        }}
      />
    </View>
  );
}

function ConsumidorTecnicos() {
  const { tecnicos, eliminarTecnico, errorEliminacion, errorPersistencia } =
    useTecnicosContext();
  const [resultado, setResultado] = useState("sin intentar");

  return (
    <View>
      <Text>Total técnicos: {tecnicos.length}</Text>
      {tecnicos.map((tecnico) => (
        <Text key={tecnico.id}>Técnico: {tecnico.nombre}</Text>
      ))}
      <Text>
        {errorEliminacion !== "" ? errorEliminacion : "Sin error de eliminación"}
      </Text>
      {errorPersistencia !== "" && <Text>{errorPersistencia}</Text>}
      <Text>Resultado: {resultado}</Text>
      <Button
        title="Eliminar Carlos"
        onPress={() => {
          void eliminarTecnico("1").then((eliminado) =>
            setResultado(String(eliminado))
          );
        }}
      />
    </View>
  );
}

function ConsumidorSinProvider() {
  useTecnicosContext();

  return null;
}

async function asignarCarlosAlEvento(eventoId: string) {
  await fireEvent.press(screen.getByText(`Editar evento ${eventoId}`));
  await fireEvent.press(screen.getByText("Asignar Carlos"));
  await fireEvent.press(screen.getByText("Guardar evento"));
  await screen.findByText(`Evento ${eventoId}: 1`);
}

describe("TecnicosContext", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    simularBanda("b1");
    mockListarEventos.mockResolvedValue(eventosIniciales);
    mockCrearEvento.mockImplementation(async (datos) => ({ ...datos, id: "uuid-evento" }));
    mockActualizarEvento.mockImplementation(async (evento) => evento);
    mockEliminarEventoEnBase.mockResolvedValue(undefined);
    mockListarTecnicos.mockResolvedValue(tecnicosIniciales);
    mockCrearTecnico.mockImplementation(async (nombre) => ({ id: `uuid-${nombre}`, nombre }));
    mockActualizarTecnico.mockImplementation(async (tecnico) => tecnico);
    mockEliminarTecnicoEnBase.mockResolvedValue(undefined);
  });

  test("comparte la misma lista de técnicos entre consumidores", async () => {
    const { getByPlaceholderText, getByText, findByText } =
      await renderizarConProviders(
        <>
          <ConsumidorA />
          <ConsumidorB />
        </>
      );

    expect(getByText("Total en B: 2")).toBeTruthy();

    await fireEvent.changeText(getByPlaceholderText("Nombre en A"), "Lucía");
    await fireEvent.press(getByText("Crear desde A"));

    expect(await findByText("Total en B: 3")).toBeTruthy();
    expect(getByText("B ve a Lucía")).toBeTruthy();
  });

  test("carga técnicos desde Supabase", async () => {
    mockListarTecnicos.mockResolvedValue([{ id: "7", nombre: "Lucía" }]);

    const { getByText, queryByText } = await renderizarConProviders(
      <ConsumidorTecnicos />
    );

    expect(getByText("Total técnicos: 1")).toBeTruthy();
    expect(getByText("Técnico: Lucía")).toBeTruthy();
    expect(queryByText("Técnico: Carlos")).toBeNull();
    // Repositorio de la banda activa; SQLite ya no se consulta
    expect(mockRepositorioPedido).toHaveBeenCalledWith("b1");
    expect(mockInicializarBaseDeDatos).not.toHaveBeenCalled();
    expect(mockListarTecnicosSqlite).not.toHaveBeenCalled();
  });

  test("guarda un técnico en Supabase", async () => {
    const { getByPlaceholderText, getByText, findByText } =
      await renderizarConProviders(
        <>
          <ConsumidorA />
          <ConsumidorB />
        </>
      );

    await fireEvent.changeText(getByPlaceholderText("Nombre en A"), "Lucía");
    await fireEvent.press(getByText("Crear desde A"));

    expect(await findByText("B ve a Lucía")).toBeTruthy();
    expect(mockCrearTecnico).toHaveBeenCalledTimes(1);
    // Sin id: lo genera Supabase
    expect(mockCrearTecnico).toHaveBeenCalledWith("Lucía");
  });

  test("no añade el técnico si Supabase falla", async () => {
    mockCrearTecnico.mockRejectedValueOnce(new Error("disco lleno"));

    const { getByPlaceholderText, getByDisplayValue, getByText, queryByText, findByText } =
      await renderizarConProviders(
        <>
          <ConsumidorA />
          <ConsumidorB />
          <ConsumidorTecnicos />
        </>
      );

    await fireEvent.changeText(getByPlaceholderText("Nombre en A"), "Lucía");
    await fireEvent.press(getByText("Crear desde A"));

    expect(await findByText("No se ha podido guardar el técnico")).toBeTruthy();
    expect(getByText("Total en B: 2")).toBeTruthy();
    expect(queryByText("B ve a Lucía")).toBeNull();
    // El formulario conserva lo escrito
    expect(getByDisplayValue("Lucía")).toBeTruthy();
  });

  test("permite eliminar un técnico sin eventos", async () => {
    const { getByText, queryByText, findByText } = await renderizarConProviders(
      <ConsumidorTecnicos />
    );

    expect(getByText("Total técnicos: 2")).toBeTruthy();

    await fireEvent.press(getByText("Eliminar Carlos"));

    expect(await findByText("Total técnicos: 1")).toBeTruthy();
    expect(mockEliminarTecnicoEnBase).toHaveBeenCalledWith("1");
    expect(queryByText("Técnico: Carlos")).toBeNull();
    expect(getByText("Técnico: Miguel")).toBeTruthy();
    expect(getByText("Sin error de eliminación")).toBeTruthy();
  });

  test("no elimina el técnico si Supabase falla", async () => {
    mockEliminarTecnicoEnBase.mockRejectedValueOnce(new Error("bloqueada"));

    const { getByText, findByText } = await renderizarConProviders(
      <ConsumidorTecnicos />
    );

    await fireEvent.press(getByText("Eliminar Carlos"));

    expect(await findByText("No se ha podido eliminar el técnico")).toBeTruthy();
    expect(getByText("Técnico: Carlos")).toBeTruthy();
    expect(getByText("Total técnicos: 2")).toBeTruthy();
  });

  test("impide eliminar un técnico asignado a un evento", async () => {
    const { getByText } = await renderizarConProviders(
      <>
        <ConsumidorEventos />
        <ConsumidorTecnicos />
      </>
    );

    await asignarCarlosAlEvento("1");

    await fireEvent.press(getByText("Eliminar Carlos"));

    expect(getByText("Técnico: Carlos")).toBeTruthy();
    expect(getByText("Total técnicos: 2")).toBeTruthy();
    expect(
      getByText("No se puede eliminar a Carlos porque está asignado a 1 evento")
    ).toBeTruthy();
    expect(getByText("Evento 1: 1")).toBeTruthy();
    // La regla se aplica antes de llegar a Supabase
    expect(mockEliminarTecnicoEnBase).not.toHaveBeenCalled();
  });

  test("indica en plural cuando el técnico está asignado a varios eventos", async () => {
    const { getByText } = await renderizarConProviders(
      <>
        <ConsumidorEventos />
        <ConsumidorTecnicos />
      </>
    );

    await asignarCarlosAlEvento("1");
    await asignarCarlosAlEvento("2");

    await fireEvent.press(getByText("Eliminar Carlos"));

    expect(getByText("Técnico: Carlos")).toBeTruthy();
    expect(
      getByText("No se puede eliminar a Carlos porque está asignado a 2 eventos")
    ).toBeTruthy();
    expect(getByText("Evento 1: 1")).toBeTruthy();
    expect(getByText("Evento 2: 1")).toBeTruthy();
    expect(mockEliminarTecnicoEnBase).not.toHaveBeenCalled();
  });

  test("no permite eliminar mientras los eventos están cargando", async () => {
    let terminarCargaEventos: (eventos: typeof eventosIniciales) => void =
      () => {};
    mockListarEventos.mockImplementation(
      () =>
        new Promise((resolve) => {
          terminarCargaEventos = resolve;
        })
    );

    const { getByText, findByText } = await render(
      <EventosProvider>
        <TecnicosProvider>
          <ConsumidorTecnicos />
        </TecnicosProvider>
      </EventosProvider>
    );

    // Los técnicos ya están cargados, pero los eventos siguen pendientes
    expect(await findByText("Técnico: Carlos")).toBeTruthy();

    await fireEvent.press(getByText("Eliminar Carlos"));

    expect(await findByText("Resultado: false")).toBeTruthy();
    expect(getByText("Técnico: Carlos")).toBeTruthy();
    expect(getByText("Total técnicos: 2")).toBeTruthy();
    expect(getByText("Sin error de eliminación")).toBeTruthy();
    expect(mockEliminarTecnicoEnBase).not.toHaveBeenCalled();

    await act(async () => {
      terminarCargaEventos(eventosIniciales);
    });
  });

  test("si la clave foránea rechaza el borrado muestra un mensaje sin detalles técnicos", async () => {
    mockEliminarTecnicoEnBase.mockRejectedValueOnce(new ErrorRepositorio("en_uso"));

    const { getByText, queryByText, findByText } = await renderizarConProviders(
      <ConsumidorTecnicos />
    );

    await fireEvent.press(getByText("Eliminar Carlos"));

    expect(
      await findByText("No se puede eliminar este técnico porque está asignado a algún evento")
    ).toBeTruthy();
    expect(getByText("Técnico: Carlos")).toBeTruthy();
    expect(queryByText(/23503|foreign key|violates/i)).toBeNull();
  });

  test("sin ser admin no llama al repositorio para crear ni eliminar", async () => {
    simularBanda("b1", false);

    const { getByPlaceholderText, getByText, findAllByText } =
      await renderizarConProviders(
        <>
          <ConsumidorA />
          <ConsumidorB />
          <ConsumidorTecnicos />
        </>
      );

    await fireEvent.changeText(getByPlaceholderText("Nombre en A"), "Lucía");
    await fireEvent.press(getByText("Crear desde A"));

    expect((await findAllByText("No se ha podido guardar el técnico")).length).toBeGreaterThan(0);

    await fireEvent.press(getByText("Eliminar Carlos"));

    expect((await findAllByText("No se ha podido eliminar el técnico")).length).toBeGreaterThan(0);
    expect(mockCrearTecnico).not.toHaveBeenCalled();
    expect(mockActualizarTecnico).not.toHaveBeenCalled();
    expect(mockEliminarTecnicoEnBase).not.toHaveBeenCalled();
    expect(getByText("Total en B: 2")).toBeTruthy();
  });

  test("al cambiar de banda descarta los técnicos anteriores y carga los nuevos", async () => {
    mockListarTecnicos
      .mockResolvedValueOnce(tecnicosIniciales)
      .mockResolvedValueOnce([{ id: "x1", nombre: "Xavi" }]);

    const crearArbol = () => (
      <EventosProvider>
        <TecnicosProvider>
          <ConsumidorB />
          <EstadoCarga />
        </TecnicosProvider>
      </EventosProvider>
    );

    const { rerender, queryByText, findByText } = await render(crearArbol());

    expect(await findByText("B ve a Carlos")).toBeTruthy();

    simularBanda("b2");
    await rerender(crearArbol());

    expect(await findByText("B ve a Xavi")).toBeTruthy();
    expect(queryByText("B ve a Carlos")).toBeNull();
    expect(mockRepositorioPedido).toHaveBeenCalledWith("b2");
  });

  test("falla si se usa fuera del provider", async () => {
    // React registra el error lanzado durante el render; se silencia para no ensuciar la salida
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await expect(render(<ConsumidorSinProvider />)).rejects.toThrow(
      "useTecnicosContext debe usarse dentro de TecnicosProvider"
    );

    consoleError.mockRestore();
  });
});
