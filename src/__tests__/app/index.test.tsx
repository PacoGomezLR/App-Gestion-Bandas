import { fireEvent, render } from "@testing-library/react-native";
import Index from "../../app/index";
import { useBandaContext } from "../../context/BandaContext";
import { useEventosContext } from "../../context/EventosContext";
import { useTecnicosContext } from "../../context/TecnicosContext";
import type { Evento } from "../../types/evento";

// constants/theme importa global.css, que Jest no puede interpretar
jest.mock("../../global.css", () => ({}));

// Los contextos reales importan el cliente Supabase; aquí nunca se usa
jest.mock("../../lib/supabase", () => ({ supabase: {} }));

jest.mock("../../context/EventosContext", () => ({
  ...jest.requireActual("../../context/EventosContext"),
  useEventosContext: jest.fn(),
}));

jest.mock("../../context/TecnicosContext", () => ({
  ...jest.requireActual("../../context/TecnicosContext"),
  useTecnicosContext: jest.fn(),
}));

jest.mock("../../components/ListaEventos", () => {
  const { Text, View } = require("react-native");

  return {
    ListaEventos: ({
      eventos,
      puedeEditar,
    }: {
      eventos: Array<{ id: string; titulo: string }>;
      puedeEditar: boolean;
    }) => (
      <View>
        {eventos.map((evento) => (
          <Text key={evento.id}>{evento.titulo}</Text>
        ))}
        {puedeEditar && <Text>Acciones de edición</Text>}
      </View>
    ),
  };
});

jest.mock("../../components/FormularioEvento", () => {
  const { Text } = require("react-native");

  return {
    FormularioEvento: () => <Text>Formulario simulado</Text>,
  };
});

jest.mock("../../components/CalendarioEventos", () => {
  const { Text } = require("react-native");

  return {
    CalendarioEventos: () => <Text>Calendario simulado</Text>,
  };
});

// Solo se simula el hook: el BandaContext real cargaría el cliente Supabase
jest.mock("../../context/BandaContext", () => ({
  useBandaContext: jest.fn(),
}));

// El botón real usa AuthContext (cliente Supabase); su comportamiento se prueba aparte
jest.mock("../../components/BotonCerrarSesion", () => {
  const { Text } = require("react-native");

  return {
    BotonCerrarSesion: () => <Text>Cerrar sesión</Text>,
  };
});

const mockUseEventosContext = jest.mocked(useEventosContext);
const mockUseTecnicosContext = jest.mocked(useTecnicosContext);
const mockUseBandaContext = jest.mocked(useBandaContext);

function simularPermisos(esAdmin: boolean) {
  mockUseBandaContext.mockReturnValue({
    bandas: [],
    bandaActual: { id: "b1", nombre: "Cathaline", creadaPor: "u1", creadaEn: "2026-01-01" },
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

const eventos: Evento[] = [
  {
    id: "1",
    titulo: "Concierto en Córdoba",
    tipo: "concierto_abierto",
    fecha: "2026-09-30",
    hora: "",
    lugar: "",
    notas: "",
    estado: "confirmado",
    tecnicoIds: [],
  },
  {
    id: "2",
    titulo: "Ensayo general",
    tipo: "ensayo",
    fecha: "2026-10-02",
    hora: "",
    lugar: "",
    notas: "",
    estado: "pendiente",
    tecnicoIds: [],
  },
  {
    id: "3",
    titulo: "Reunión de la banda",
    tipo: "otro",
    fecha: "2026-10-05",
    hora: "",
    lugar: "",
    notas: "",
    estado: "pendiente",
    tecnicoIds: [],
  },
];

function crearValorUseEventosContext(
  fecha: string,
  setFecha: jest.Mock
): ReturnType<typeof useEventosContext> {
  return {
    eventos,
    titulo: "",
    tipo: "concierto_abierto",
    estado: "pendiente",
    fecha,
    hora: "",
    lugar: "",
    notas: "",
    tecnicoIds: [],
    error: "",
    eventoEditandoId: null,
    setTipo: jest.fn(),
    setEstado: jest.fn(),
    setFecha,
    setHora: jest.fn(),
    setLugar: jest.fn(),
    setNotas: jest.fn(),
    alternarTecnico: jest.fn(),
    reemplazarEventos: jest.fn(),
    guardarEvento: jest.fn(),
    eliminarEvento: jest.fn(),
    prepararEdicion: jest.fn(),
    cancelarEdicion: jest.fn(),
    procesando: false,
    cargando: false,
    errorPersistencia: "",
  };
}

function crearValorUseTecnicosContext(): ReturnType<typeof useTecnicosContext> {
  return {
    tecnicos: [
      {
        id: "1",
        nombre: "Carlos",
      },
    ],
    nombre: "",
    error: "",
    tecnicoEditandoId: null,
    setNombre: jest.fn(),
    reemplazarTecnicos: jest.fn(),
    guardarTecnico: jest.fn(),
    prepararEdicion: jest.fn(),
    cancelarEdicion: jest.fn(),
    eliminarTecnico: jest.fn(),
    errorEliminacion: "",
    procesando: false,
    cargando: false,
    errorPersistencia: "",
  };
}

describe("Index", () => {
  beforeEach(() => {
    mockUseTecnicosContext.mockReturnValue(crearValorUseTecnicosContext());
    simularPermisos(true);
  });

  test("el admin ve el formulario y las acciones de edición", async () => {
    mockUseEventosContext.mockReturnValue(
      crearValorUseEventosContext("", jest.fn())
    );

    const { getByText } = await render(<Index />);

    expect(getByText("Formulario simulado")).toBeTruthy();
    expect(getByText("Acciones de edición")).toBeTruthy();
  });

  test("sin ser admin ve el calendario y los eventos, pero ni formulario ni acciones", async () => {
    simularPermisos(false);
    mockUseEventosContext.mockReturnValue(
      crearValorUseEventosContext("", jest.fn())
    );

    const { getByText, queryByText } = await render(<Index />);

    expect(getByText("Calendario simulado")).toBeTruthy();
    expect(getByText("Concierto en Córdoba")).toBeTruthy();
    expect(getByText("Ensayo general")).toBeTruthy();
    expect(queryByText("Formulario simulado")).toBeNull();
    expect(queryByText("Acciones de edición")).toBeNull();
    // No se enseña el rol
    expect(queryByText(/admin|usuario|solo lectura/i)).toBeNull();
  });

  test("con fecha seleccionada muestra solo sus eventos y permite ver todos", async () => {
    const setFecha = jest.fn();
    mockUseEventosContext.mockReturnValue(
      crearValorUseEventosContext("2026-10-02", setFecha)
    );

    const { getByText, queryByText } = await render(<Index />);

    expect(getByText("Ensayo general")).toBeTruthy();
    expect(queryByText("Concierto en Córdoba")).toBeNull();
    expect(queryByText("Reunión de la banda")).toBeNull();
    expect(getByText("Ver todos")).toBeTruthy();

    await fireEvent.press(getByText("Ver todos"));

    expect(setFecha).toHaveBeenCalledWith("");
  });

  test("la sección de la lista se titula Fechas y no Eventos", async () => {
    mockUseEventosContext.mockReturnValue(
      crearValorUseEventosContext("", jest.fn())
    );

    const { getByText, queryByText } = await render(<Index />);

    expect(getByText("Fechas")).toBeTruthy();
    expect(queryByText("Eventos")).toBeNull();
  });

  test("el Calendario ofrece Cerrar sesión", async () => {
    mockUseEventosContext.mockReturnValue(
      crearValorUseEventosContext("", jest.fn())
    );

    const { getByText } = await render(<Index />);

    expect(getByText("Cerrar sesión")).toBeTruthy();
  });

  test("sin fecha seleccionada muestra todos los eventos y no muestra Ver todos", async () => {
    mockUseEventosContext.mockReturnValue(
      crearValorUseEventosContext("", jest.fn())
    );

    const { getByText, queryByText } = await render(<Index />);

    expect(getByText("Concierto en Córdoba")).toBeTruthy();
    expect(getByText("Ensayo general")).toBeTruthy();
    expect(getByText("Reunión de la banda")).toBeTruthy();
    expect(queryByText("Ver todos")).toBeNull();
  });

  test("deshabilita Ver todos mientras se está procesando", async () => {
    const setFecha = jest.fn();
    mockUseEventosContext.mockReturnValue({
      ...crearValorUseEventosContext("2026-10-02", setFecha),
      procesando: true,
    });

    const { getByRole, getByText } = await render(<Index />);

    expect(getByRole("button", { name: "Ver todos", disabled: true })).toBeTruthy();

    await fireEvent.press(getByText("Ver todos"));

    expect(setFecha).not.toHaveBeenCalled();
  });

  test("muestra solo Cargando datos... mientras se cargan los datos", async () => {
    mockUseEventosContext.mockReturnValue({
      ...crearValorUseEventosContext("", jest.fn()),
      cargando: true,
    });

    const { getByText, queryByText } = await render(<Index />);

    expect(getByText("Cargando datos...")).toBeTruthy();
    expect(queryByText("Formulario simulado")).toBeNull();
    expect(queryByText("Ensayo general")).toBeNull();
  });

  test("espera también a que carguen los técnicos", async () => {
    mockUseEventosContext.mockReturnValue(
      crearValorUseEventosContext("", jest.fn())
    );
    mockUseTecnicosContext.mockReturnValue({
      ...crearValorUseTecnicosContext(),
      cargando: true,
    });

    const { getByText, queryByText } = await render(<Index />);

    expect(getByText("Cargando datos...")).toBeTruthy();
    expect(queryByText("Formulario simulado")).toBeNull();
  });

  test("sin eventos en la fecha elegida muestra un estado vacío en lugar de la lista", async () => {
    mockUseEventosContext.mockReturnValue(
      crearValorUseEventosContext("2027-05-01", jest.fn())
    );

    const { getByText, queryByText } = await render(<Index />);

    expect(getByText("Sin eventos este día")).toBeTruthy();
    expect(getByText("No hay nada programado para el 01-05-2027.")).toBeTruthy();
    expect(queryByText("Concierto en Córdoba")).toBeNull();
  });
});
