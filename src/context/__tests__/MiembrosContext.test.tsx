import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { type ReactElement, useState } from "react";
import { Button, Text, TextInput, View } from "react-native";

import { eventosIniciales } from "../../data/eventosIniciales";
import { inicializarBaseDeDatos } from "../../database/migrations";
import { listarMiembros as listarMiembrosSqlite } from "../../database/repositories/miembrosRepository";
import { ErrorRepositorio } from "../../services/supabase/errores";
import type { DatosEvento } from "../../services/supabase/mapeoEventos";
import type { Evento } from "../../types/evento";
import type { Miembro } from "../../types/miembro";
import { useBandaContext } from "../BandaContext";
import { EventosProvider, useEventosContext } from "../EventosContext";
import {
  MiembrosProvider,
  useMiembrosContext,
} from "../MiembrosContext";

// Supabase se simula solo para comprobar que ya no se usa como fuente ni como respaldo
jest.mock("../../database/migrations", () => ({
  inicializarBaseDeDatos: jest.fn(),
}));

jest.mock("../../database/repositories/miembrosRepository", () => ({
  listarMiembros: jest.fn(),
  guardarMiembro: jest.fn(),
  eliminarMiembro: jest.fn(),
}));

const mockListarEventos = jest.fn<Promise<Evento[]>, []>();
const mockCrearEvento = jest.fn<Promise<Evento>, [DatosEvento]>();
const mockActualizarEvento = jest.fn<Promise<Evento>, [Evento]>();
const mockEliminarEventoEnBase = jest.fn<Promise<void>, [string]>();
const mockRepositorioPedido = jest.fn<void, [string]>();
const mockListarMiembros = jest.fn<Promise<Miembro[]>, []>();
const mockCrearMiembro = jest.fn<Promise<Miembro>, [string]>();
const mockActualizarMiembro = jest.fn<Promise<Miembro>, [Miembro]>();
const mockEliminarMiembroEnBase = jest.fn<Promise<void>, [string]>();

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
  crearRepositorioMiembrosSupabase: (bandaId: string) => {
    mockRepositorioPedido(bandaId);

    return {
      listar: () => mockListarMiembros(),
      crear: (nombre: string) => mockCrearMiembro(nombre),
      actualizar: (...args: Parameters<typeof mockActualizarMiembro>) =>
        mockActualizarMiembro(...args),
      eliminar: (id: string) => mockEliminarMiembroEnBase(id),
    };
  },
}));

// Solo se simula el hook: el BandaContext real cargaría el cliente Supabase
jest.mock("../BandaContext", () => ({
  useBandaContext: jest.fn(),
}));

const mockInicializarBaseDeDatos = jest.mocked(inicializarBaseDeDatos);
const mockListarMiembrosSqlite = jest.mocked(listarMiembrosSqlite);
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
    tipo: "concierto_abierto",
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
    simularBanda("b1");
    mockListarEventos.mockResolvedValue(eventosIniciales);
    mockCrearEvento.mockImplementation(async (datos) => ({ ...datos, id: "uuid-evento" }));
    mockActualizarEvento.mockImplementation(async (evento) => evento);
    mockEliminarEventoEnBase.mockResolvedValue(undefined);
    mockListarMiembros.mockResolvedValue(miembrosGuardados);
    mockCrearMiembro.mockImplementation(async (nombre) => ({ id: `uuid-${nombre}`, nombre }));
    mockActualizarMiembro.mockImplementation(async (miembro) => miembro);
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

  test("carga desde Supabase los músicos de la banda activa", async () => {
    const { getByText } = await renderizarConProvider(<ConsumidorB />);

    expect(getByText("Total en B: 2")).toBeTruthy();
    expect(getByText("B ve a Ana")).toBeTruthy();
    expect(getByText("B ve a Bruno")).toBeTruthy();
    // Repositorio de la banda activa; SQLite ya no se consulta
    expect(mockRepositorioPedido).toHaveBeenCalledWith("b1");
    expect(mockInicializarBaseDeDatos).not.toHaveBeenCalled();
    expect(mockListarMiembrosSqlite).not.toHaveBeenCalled();
  });

  test("guarda en Supabase antes de añadir el miembro al estado", async () => {
    let terminarGuardado: () => void = () => {};
    mockCrearMiembro.mockImplementation(
      (nombre) =>
        new Promise<Miembro>((resolve) => {
          terminarGuardado = () => resolve({ id: "uuid-carla", nombre });
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

    // Supabase ya ha recibido el miembro, pero todavía no ha confirmado
    // Sin id: lo genera Supabase
    expect(mockCrearMiembro).toHaveBeenCalledWith("Carla");
    expect(queryByText("B ve a Carla")).toBeNull();

    await act(async () => {
      terminarGuardado();
    });

    expect(await findByText("B ve a Carla")).toBeTruthy();
  });

  test("no añade el miembro si Supabase falla al guardar", async () => {
    mockCrearMiembro.mockRejectedValueOnce(new Error("disco lleno"));

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

  test("no elimina el miembro si Supabase falla", async () => {
    // Ana no está asignada a ningún evento: pasa la regla de negocio y llega a Supabase
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
    // La regla se aplica antes de llegar a Supabase
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

  test("si la clave foránea rechaza el borrado muestra un mensaje sin detalles técnicos", async () => {
    // Paco no figura asignado en los eventos cargados, pero otro dispositivo lo asignó entretanto
    mockListarMiembros.mockResolvedValue(musicos);
    mockListarEventos.mockResolvedValue([]);
    mockEliminarMiembroEnBase.mockRejectedValueOnce(new ErrorRepositorio("en_uso"));

    const { getByText, queryByText, findByText } = await renderizarConProvider(
      <ConsumidorMusicos />
    );

    await fireEvent.press(getByText("Eliminar Paco"));

    expect(await findByText("Resultado: false")).toBeTruthy();
    expect(
      getByText("No se puede eliminar este músico porque está asignado a algún evento")
    ).toBeTruthy();
    expect(getByText("Músico: Paco")).toBeTruthy();
    expect(queryByText(/23503|foreign key|violates/i)).toBeNull();
  });

  test("sin ser admin no llama al repositorio para crear ni eliminar", async () => {
    simularBanda("b1", false);

    const { getByPlaceholderText, getByText, findByText } =
      await renderizarConProvider(
        <>
          <ConsumidorA />
          <ConsumidorB />
        </>
      );

    await fireEvent.changeText(getByPlaceholderText("Nombre en A"), "Carla");
    await fireEvent.press(getByText("Guardar en A"));

    expect(await findByText("No se ha podido guardar el músico")).toBeTruthy();

    await fireEvent.press(getByText("Eliminar miembro 1"));

    expect(await findByText("No se ha podido eliminar el músico")).toBeTruthy();
    expect(mockCrearMiembro).not.toHaveBeenCalled();
    expect(mockActualizarMiembro).not.toHaveBeenCalled();
    expect(mockEliminarMiembroEnBase).not.toHaveBeenCalled();
    expect(getByText("Total en B: 2")).toBeTruthy();
  });

  test("al cambiar de banda descarta los músicos anteriores y carga los nuevos", async () => {
    mockListarMiembros
      .mockResolvedValueOnce(miembrosGuardados)
      .mockResolvedValueOnce([{ id: "x1", nombre: "Xavi" }]);

    const arbol = (
      <EventosProvider>
        <MiembrosProvider>
          <ConsumidorB />
          <EstadoCarga />
        </MiembrosProvider>
      </EventosProvider>
    );

    const { rerender, queryByText, findByText } = await render(arbol);

    expect(await findByText("B ve a Ana")).toBeTruthy();

    simularBanda("b2");
    await rerender(
      <EventosProvider>
        <MiembrosProvider>
          <ConsumidorB />
          <EstadoCarga />
        </MiembrosProvider>
      </EventosProvider>
    );

    expect(await findByText("B ve a Xavi")).toBeTruthy();
    expect(queryByText("B ve a Ana")).toBeNull();
    expect(mockRepositorioPedido).toHaveBeenCalledWith("b2");
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
