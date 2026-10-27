import { fireEvent, render } from "@testing-library/react-native";
import Index from "../../app/index";
import { useEventos } from "../../hooks/useEventos";
import type { Evento } from "../../types/evento";

jest.mock("../../hooks/useEventos");

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

const eventos: Evento[] = [
  {
    id: "1",
    titulo: "Concierto en Córdoba",
    tipo: "concierto",
    fecha: "2026-09-30",
    estado: "confirmado",
  },
  {
    id: "2",
    titulo: "Ensayo general",
    tipo: "ensayo",
    fecha: "2026-10-02",
    estado: "pendiente",
  },
  {
    id: "3",
    titulo: "Reunión de la banda",
    tipo: "reunion",
    fecha: "2026-10-05",
    estado: "pendiente",
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
    error: "",
    eventoEditandoId: null,
    setTitulo: jest.fn(),
    setTipo: jest.fn(),
    setEstado: jest.fn(),
    setFecha,
    guardarEvento: jest.fn(),
    eliminarEvento: jest.fn(),
    prepararEdicion: jest.fn(),
    cancelarEdicion: jest.fn(),
  };
}

describe("Index", () => {
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
