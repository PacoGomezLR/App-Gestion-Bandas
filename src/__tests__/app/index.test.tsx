import { fireEvent, render } from "@testing-library/react-native";
import Index from "../../app/index";
import { useTecnicosContext } from "../../context/TecnicosContext";
import { useEventos } from "../../hooks/useEventos";
import type { Evento } from "../../types/evento";

jest.mock("../../hooks/useEventos");

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

const mockUseEventos = jest.mocked(useEventos);
const mockUseTecnicosContext = jest.mocked(useTecnicosContext);

const eventos: Evento[] = [
  {
    id: "1",
    titulo: "Concierto en Córdoba",
    tipo: "concierto",
    fecha: "2026-09-30",
    estado: "confirmado",
    tecnicoIds: [],
  },
  {
    id: "2",
    titulo: "Ensayo general",
    tipo: "ensayo",
    fecha: "2026-10-02",
    estado: "pendiente",
    tecnicoIds: [],
  },
  {
    id: "3",
    titulo: "Reunión de la banda",
    tipo: "reunion",
    fecha: "2026-10-05",
    estado: "pendiente",
    tecnicoIds: [],
  },
];

function crearValorUseEventos(
  fecha: string,
  setFecha: jest.Mock
): ReturnType<typeof useEventos> {
  return {
    eventos,
    titulo: "",
    tipo: "concierto",
    estado: "pendiente",
    fecha,
    tecnicoIds: [],
    error: "",
    eventoEditandoId: null,
    setTitulo: jest.fn(),
    setTipo: jest.fn(),
    setEstado: jest.fn(),
    setFecha,
    alternarTecnico: jest.fn(),
    guardarEvento: jest.fn(),
    eliminarEvento: jest.fn(),
    prepararEdicion: jest.fn(),
    cancelarEdicion: jest.fn(),
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
    guardarTecnico: jest.fn(),
    prepararEdicion: jest.fn(),
    cancelarEdicion: jest.fn(),
    eliminarTecnico: jest.fn(),
  };
}

describe("Index", () => {
  beforeEach(() => {
    mockUseTecnicosContext.mockReturnValue(crearValorUseTecnicosContext());
  });

  test("con fecha seleccionada muestra solo sus eventos y permite ver todos", async () => {
    const setFecha = jest.fn();
    mockUseEventos.mockReturnValue(
      crearValorUseEventos("2026-10-02", setFecha)
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
    mockUseEventos.mockReturnValue(
      crearValorUseEventos("", jest.fn())
    );

    const { getByText, queryByText } = await render(<Index />);

    expect(getByText("Concierto en Córdoba")).toBeTruthy();
    expect(getByText("Ensayo general")).toBeTruthy();
    expect(getByText("Reunión de la banda")).toBeTruthy();
    expect(queryByText("Ver todos")).toBeNull();
  });
});
