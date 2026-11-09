import { act, fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { Button, Text, View } from "react-native";

import { eventosIniciales } from "../../data/eventosIniciales";
import { inicializarBaseDeDatos } from "../../database/migrations";
import { listarEventos } from "../../database/repositories/eventosRepository";
import {
  crearRepositorioEventosSupabase,
  type RepositorioEventos,
} from "../../services/supabase/eventos";
import { convertirErrorSupabase } from "../../services/supabase/errores";
import type { DatosEvento } from "../../services/supabase/mapeoEventos";
import type { Evento } from "../../types/evento";
import { useBandaContext } from "../BandaContext";
import {
  EventosProvider,
  useEventosContext,
} from "../EventosContext";

// SQLite se simula solo para comprobar que ya no se usa como fuente ni como respaldo
jest.mock("../../database/migrations", () => ({
  inicializarBaseDeDatos: jest.fn(),
}));

jest.mock("../../database/repositories/eventosRepository", () => ({
  listarEventos: jest.fn(),
  guardarEvento: jest.fn(),
  eliminarEvento: jest.fn(),
}));

jest.mock("../../services/supabase/eventos", () => ({
  crearRepositorioEventosSupabase: jest.fn(),
}));

// Solo se simula el hook: el BandaContext real cargaría el cliente Supabase
jest.mock("../BandaContext", () => ({
  useBandaContext: jest.fn(),
}));

jest.mock("../../services/supabase/eventoFinanzas", () => ({
  crearRepositorioEventoFinanzasSupabase: () => ({ listar: async () => ({}) }),
}));

const mockInicializarBaseDeDatos = jest.mocked(inicializarBaseDeDatos);
const mockListarEventosSqlite = jest.mocked(listarEventos);
const mockCrearRepositorio = jest.mocked(crearRepositorioEventosSupabase);
const mockUseBandaContext = jest.mocked(useBandaContext);

type RepositorioSimulado = {
  [Metodo in keyof RepositorioEventos]: jest.Mock<
    ReturnType<RepositorioEventos[Metodo]>,
    Parameters<RepositorioEventos[Metodo]>
  >;
};

function crearRepositorioSimulado(eventos: Evento[]): RepositorioSimulado {
  return {
    listar: jest.fn(async () => eventos),
    crear: jest.fn(async (datos: DatosEvento) => ({ ...datos, id: "uuid-nuevo" })),
    crearConCache: jest.fn(async (datos: DatosEvento, _cache: number) => ({
      ...datos,
      id: "uuid-nuevo",
    })),
    actualizar: jest.fn(async (evento: Evento) => evento),
    actualizarConCache: jest.fn(async (evento: Evento, _cache: number | null) => evento),
    eliminar: jest.fn(async (_id: string) => undefined),
  };
}

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

let repositorio: RepositorioSimulado;

function EstadoCarga() {
  const { cargando, errorPersistencia } = useEventosContext();

  return (
    <View>
      <Text>{cargando ? "Cargando" : "Carga terminada"}</Text>
      {errorPersistencia !== "" && <Text>{errorPersistencia}</Text>}
    </View>
  );
}

function Arbol({ contenido }: { contenido: ReactElement }) {
  return (
    <EventosProvider>
      {contenido}
      <EstadoCarga />
    </EventosProvider>
  );
}

async function renderizarConProvider(contenido: ReactElement) {
  const resultado = await render(<Arbol contenido={contenido} />);

  await screen.findByText("Carga terminada");

  return resultado;
}

function ConsumidorA() {
  const {
    eventos,
    titulo,
    setLugar,
    setFecha,
    guardarEvento,
    eliminarEvento,
    prepararEdicion,
  } = useEventosContext();

  return (
    <View>
      <Text>Título en A: {titulo}</Text>
      <Button
        title="Rellenar en A"
        onPress={() => {
          setLugar("Compartido");
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
      <Button
        title="Editar evento 1"
        onPress={() => {
          const evento = eventos.find((actual) => actual.id === "1");

          if (evento !== undefined) {
            prepararEdicion(evento);
          }
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
        <Text key={evento.id}>
          {evento.titulo} ({evento.id})
        </Text>
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

function ConsumidorEliminacion() {
  const { eventos, eliminarEvento, errorEliminacion, errorPersistencia } = useEventosContext();

  return (
    <View>
      <Text>Eventos: {eventos.length}</Text>
      <Text>Aviso general: [{errorPersistencia}]</Text>
      <Text>Evento bloqueado: {errorEliminacion?.eventoId ?? "ninguno"}</Text>
      <Text>Motivo: {errorEliminacion?.mensaje ?? "ninguno"}</Text>
      <Button title="Eliminar 1" onPress={() => void eliminarEvento("1")} />
    </View>
  );
}

const ERROR_CLAVE_FORANEA = {
  code: "23503",
  message: 'update or delete on table "eventos" violates foreign key constraint',
};

const MOTIVO_MOVIMIENTOS =
  "Motivo: No se puede eliminar este evento porque tiene movimientos financieros asociados.";

describe("EventosContext", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    repositorio = crearRepositorioSimulado(eventosIniciales);
    mockCrearRepositorio.mockImplementation(() => repositorio);
    simularBanda("b1");
  });

  test("comparte la misma lista de eventos entre consumidores", async () => {
    const { getByText, queryByText, findByText } = await renderizarConProvider(
      <>
        <ConsumidorA />
        <ConsumidorB />
      </>
    );

    expect(getByText("Total en B: 3")).toBeTruthy();
    expect(queryByText(/Compartido 31\/12\/2026 \(/)).toBeNull();

    await fireEvent.press(getByText("Rellenar en A"));
    await fireEvent.press(getByText("Guardar en A"));

    expect(await findByText("Total en B: 4")).toBeTruthy();
    // El evento queda en el estado con el id que devuelve Supabase
    expect(getByText("Concierto abierto Compartido 31/12/2026 (uuid-nuevo)")).toBeTruthy();
  });

  test("carga desde Supabase los eventos de la banda activa, sin usar SQLite", async () => {
    const eventosGuardados: Evento[] = [
      {
        id: "20",
        titulo: "Festival de invierno",
        tipo: "concierto_abierto",
        fecha: "2027-01-15",
        hora: "",
        lugar: "",
        notas: "",
        estado: "confirmado",
        tecnicoIds: ["2"],
      },
    ];
    repositorio = crearRepositorioSimulado(eventosGuardados);

    const { getByTestId } = await renderizarConProvider(<ConsumidorJson />);

    expect(JSON.parse(getByTestId("eventos-json").props.children)).toEqual(
      eventosGuardados
    );
    expect(mockCrearRepositorio).toHaveBeenCalledWith("b1");
    expect(repositorio.listar).toHaveBeenCalledTimes(1);
    expect(mockInicializarBaseDeDatos).not.toHaveBeenCalled();
    expect(mockListarEventosSqlite).not.toHaveBeenCalled();
  });

  test("si Supabase falla al cargar muestra el error sin recurrir a SQLite", async () => {
    repositorio.listar.mockRejectedValueOnce(new Error("sin red"));

    const { getByText, getByTestId } = await renderizarConProvider(<ConsumidorJson />);

    expect(getByText("No se han podido cargar los eventos")).toBeTruthy();
    expect(JSON.parse(getByTestId("eventos-json").props.children)).toEqual([]);
    expect(mockListarEventosSqlite).not.toHaveBeenCalled();
  });

  test("guarda en Supabase antes de añadir el evento al estado", async () => {
    let terminarGuardado: () => void = () => {};
    repositorio.crear.mockImplementation(
      (datos: DatosEvento) =>
        new Promise<Evento>((resolve) => {
          terminarGuardado = () => resolve({ ...datos, id: "uuid-nuevo" });
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

    // Supabase ya ha recibido el evento (sin id: lo genera la base), pero no ha confirmado
    expect(repositorio.crear).toHaveBeenCalledTimes(1);
    expect(repositorio.crear).toHaveBeenCalledWith({
      titulo: "Concierto abierto Compartido 31/12/2026",
      fecha: "2026-12-31",
      hora: "",
      lugar: "Compartido",
      notas: "",
      tipo: "concierto_abierto",
      estado: "pendiente",
      tecnicoIds: [],
    });
    // Crear ya no envía ningún campo de músicos
    expect(repositorio.crear.mock.calls[0][0]).not.toHaveProperty("miembroIds");
    expect(repositorio.actualizar).not.toHaveBeenCalled();
    expect(queryByText(/Compartido 31\/12\/2026 \(/)).toBeNull();
    expect(getByText("Total en B: 3")).toBeTruthy();

    await act(async () => {
      terminarGuardado();
    });

    expect(await findByText("Concierto abierto Compartido 31/12/2026 (uuid-nuevo)")).toBeTruthy();
    expect(getByText("Total en B: 4")).toBeTruthy();
  });

  test("editar un evento usa actualizar con su id, no crear", async () => {
    const { getByText, findByText } = await renderizarConProvider(
      <>
        <ConsumidorA />
        <ConsumidorB />
      </>
    );

    await fireEvent.press(getByText("Editar evento 1"));
    await fireEvent.press(getByText("Rellenar en A"));
    await fireEvent.press(getByText("Guardar en A"));

    expect(await findByText("Concierto abierto Compartido 31/12/2026 (1)")).toBeTruthy();
    expect(repositorio.actualizar).toHaveBeenCalledTimes(1);
    expect(repositorio.actualizar).toHaveBeenCalledWith(
      expect.objectContaining({ id: "1", titulo: "Concierto abierto Compartido 31/12/2026" })
    );
    expect(repositorio.crear).not.toHaveBeenCalled();
  });

  test("no modifica la lista si Supabase falla al guardar", async () => {
    repositorio.crear.mockRejectedValueOnce(new Error("rechazado"));

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
    expect(queryByText(/Compartido 31\/12\/2026 \(/)).toBeNull();
    // El formulario no se limpia
    expect(getByText("Título en A: Concierto abierto Compartido 31/12/2026")).toBeTruthy();
  });

  test("un evento sin movimientos se elimina como siempre, sin ningún aviso", async () => {
    await renderizarConProvider(<ConsumidorEliminacion />);

    await fireEvent.press(screen.getByText("Eliminar 1"));

    expect(await screen.findByText("Eventos: 2")).toBeTruthy();
    expect(screen.getByText("Evento bloqueado: ninguno")).toBeTruthy();
    expect(screen.getByText("Aviso general: []")).toBeTruthy();
  });

  test("un evento con movimientos no se elimina y se explica el motivo", async () => {
    repositorio.eliminar.mockRejectedValueOnce(convertirErrorSupabase(ERROR_CLAVE_FORANEA));
    await renderizarConProvider(<ConsumidorEliminacion />);

    await fireEvent.press(screen.getByText("Eliminar 1"));

    expect(await screen.findByText(MOTIVO_MOVIMIENTOS)).toBeTruthy();
    expect(screen.getByText("Evento bloqueado: 1")).toBeTruthy();
    expect(screen.getByText("Eventos: 3")).toBeTruthy();
    // Nada de texto de PostgreSQL en ningún sitio
    expect(screen.queryByText(/23503|foreign key|violates/)).toBeNull();
  });

  test("el motivo no va al aviso general, que también ve Finanzas", async () => {
    repositorio.eliminar.mockRejectedValueOnce(convertirErrorSupabase(ERROR_CLAVE_FORANEA));
    await renderizarConProvider(<ConsumidorEliminacion />);

    await fireEvent.press(screen.getByText("Eliminar 1"));
    await screen.findByText(MOTIVO_MOVIMIENTOS);

    expect(screen.getByText("Aviso general: []")).toBeTruthy();
  });

  test("resueltos los movimientos, el mismo evento ya se elimina y el aviso desaparece", async () => {
    repositorio.eliminar.mockRejectedValueOnce(convertirErrorSupabase(ERROR_CLAVE_FORANEA));
    await renderizarConProvider(<ConsumidorEliminacion />);

    await fireEvent.press(screen.getByText("Eliminar 1"));
    await screen.findByText(MOTIVO_MOVIMIENTOS);
    await fireEvent.press(screen.getByText("Eliminar 1"));

    expect(await screen.findByText("Eventos: 2")).toBeTruthy();
    expect(screen.getByText("Evento bloqueado: ninguno")).toBeTruthy();
  });

  test("cualquier otro fallo mantiene el mensaje de siempre", async () => {
    repositorio.eliminar.mockRejectedValueOnce(new Error("sin conexión"));
    await renderizarConProvider(<ConsumidorEliminacion />);

    await fireEvent.press(screen.getByText("Eliminar 1"));

    expect(await screen.findByText("Aviso general: [No se ha podido eliminar el evento]")).toBeTruthy();
    expect(screen.getByText("Evento bloqueado: ninguno")).toBeTruthy();
  });

  test("no elimina localmente si Supabase falla", async () => {
    repositorio.eliminar.mockRejectedValueOnce(new Error("bloqueada"));

    const { getByText, findByText } = await renderizarConProvider(
      <>
        <ConsumidorA />
        <ConsumidorB />
      </>
    );

    await fireEvent.press(getByText("Eliminar evento 1"));

    expect(await findByText("No se ha podido eliminar el evento")).toBeTruthy();
    expect(repositorio.eliminar).toHaveBeenCalledWith("1");
    expect(getByText("Total en B: 3")).toBeTruthy();
  });

  test("sin ser admin no llama al repositorio para guardar ni eliminar", async () => {
    simularBanda("b1", false);

    const { getByText, findByText } = await renderizarConProvider(
      <>
        <ConsumidorA />
        <ConsumidorB />
      </>
    );

    await fireEvent.press(getByText("Rellenar en A"));
    await fireEvent.press(getByText("Guardar en A"));

    expect(await findByText("No se ha podido guardar el evento")).toBeTruthy();

    await fireEvent.press(getByText("Eliminar evento 1"));

    expect(await findByText("No se ha podido eliminar el evento")).toBeTruthy();
    expect(repositorio.crear).not.toHaveBeenCalled();
    expect(repositorio.actualizar).not.toHaveBeenCalled();
    expect(repositorio.eliminar).not.toHaveBeenCalled();
    expect(getByText("Total en B: 3")).toBeTruthy();
    // Sí puede leer
    expect(repositorio.listar).toHaveBeenCalledTimes(1);
  });

  test("al cambiar de banda carga la nueva y no mezcla una respuesta tardía de la anterior", async () => {
    let responderBandaUno: (eventos: Evento[]) => void = () => {};
    const repositorioUno = crearRepositorioSimulado([]);
    repositorioUno.listar.mockImplementation(
      () =>
        new Promise<Evento[]>((resolve) => {
          responderBandaUno = resolve;
        })
    );
    const eventoBandaDos: Evento = { ...eventosIniciales[0], id: "b2-1", titulo: "Ensayo banda dos" };
    const repositorioDos = crearRepositorioSimulado([eventoBandaDos]);
    mockCrearRepositorio.mockImplementation((bandaId) =>
      bandaId === "b1" ? repositorioUno : repositorioDos
    );

    const { rerender, getByText, queryByText, findByText } = await render(
      <Arbol contenido={<ConsumidorB />} />
    );

    expect(getByText("Cargando")).toBeTruthy();

    simularBanda("b2");
    await rerender(<Arbol contenido={<ConsumidorB />} />);

    expect(await findByText("Ensayo banda dos (b2-1)")).toBeTruthy();
    expect(mockCrearRepositorio).toHaveBeenCalledWith("b2");

    // La banda anterior responde tarde: se ignora
    await act(async () => {
      responderBandaUno(eventosIniciales);
    });

    expect(getByText("Total en B: 1")).toBeTruthy();
    expect(queryByText(/Concierto en Córdoba/)).toBeNull();
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
