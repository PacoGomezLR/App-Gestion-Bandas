import { fireEvent, render } from "@testing-library/react-native";
import Index from "../../app/index";
import { useEventosContext } from "../../context/EventosContext";
import { useMiembrosContext } from "../../context/MiembrosContext";
import { useTecnicosContext } from "../../context/TecnicosContext";
import type { Evento } from "../../types/evento";

jest.mock("../../context/EventosContext", () => ({
  ...jest.requireActual("../../context/EventosContext"),
  useEventosContext: jest.fn(),
}));

jest.mock("../../context/MiembrosContext", () => ({
  ...jest.requireActual("../../context/MiembrosContext"),
  useMiembrosContext: jest.fn(),
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
    }: {
      eventos: Array<{ id: string; titulo: string }>;
    }) => (
      <View>
        {eventos.map((evento) => (
          <Text key={evento.id}>{evento.titulo}</Text>
        ))}
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

const mockUseEventosContext = jest.mocked(useEventosContext);
const mockUseTecnicosContext = jest.mocked(useTecnicosContext);
const mockUseMiembrosContext = jest.mocked(useMiembrosContext);

const eventos: Evento[] = [
  {
    id: "1",
    titulo: "Concierto en Córdoba",
    tipo: "concierto",
    fecha: "2026-09-30",
    estado: "confirmado",
    tecnicoIds: [],
    miembroIds: [],
  },
  {
    id: "2",
    titulo: "Ensayo general",
    tipo: "ensayo",
    fecha: "2026-10-02",
    estado: "pendiente",
    tecnicoIds: [],
    miembroIds: [],
  },
  {
    id: "3",
    titulo: "Reunión de la banda",
    tipo: "reunion",
    fecha: "2026-10-05",
    estado: "pendiente",
    tecnicoIds: [],
    miembroIds: [],
  },
];

function crearValorUseEventosContext(
  fecha: string,
  setFecha: jest.Mock
): ReturnType<typeof useEventosContext> {
  return {
    eventos,
    titulo: "",
    tipo: "concierto",
    estado: "pendiente",
    fecha,
    tecnicoIds: [],
    miembroIds: [],
    error: "",
    eventoEditandoId: null,
    setTitulo: jest.fn(),
    setTipo: jest.fn(),
    setEstado: jest.fn(),
    setFecha,
    alternarTecnico: jest.fn(),
    alternarMiembro: jest.fn(),
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

function crearValorUseMiembrosContext(): ReturnType<typeof useMiembrosContext> {
  return {
    miembros: [
      {
        id: "1",
        nombre: "Paco",
      },
    ],
    nombre: "",
    error: "",
    miembroEditandoId: null,
    procesando: false,
    setNombre: jest.fn(),
    reemplazarMiembros: jest.fn(),
    guardarMiembro: jest.fn(),
    prepararEdicion: jest.fn(),
    cancelarEdicion: jest.fn(),
    eliminarMiembro: jest.fn(),
    errorEliminacion: "",
    cargando: false,
    errorPersistencia: "",
  };
}

describe("Index", () => {
  beforeEach(() => {
    mockUseTecnicosContext.mockReturnValue(crearValorUseTecnicosContext());
    mockUseMiembrosContext.mockReturnValue(crearValorUseMiembrosContext());
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

  test("espera también a que carguen los miembros", async () => {
    mockUseEventosContext.mockReturnValue(
      crearValorUseEventosContext("", jest.fn())
    );
    mockUseMiembrosContext.mockReturnValue({
      ...crearValorUseMiembrosContext(),
      cargando: true,
    });

    const { getByText, queryByText } = await render(<Index />);

    expect(getByText("Cargando datos...")).toBeTruthy();
    expect(queryByText("Formulario simulado")).toBeNull();
  });
});
