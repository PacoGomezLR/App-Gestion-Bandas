import { act, fireEvent, render } from "@testing-library/react-native";
import { useBandaContext } from "../../context/BandaContext";
import { CrearBanda } from "../CrearBanda";

// Solo se simula el hook: el BandaContext real cargaría el cliente Supabase
jest.mock("../../context/BandaContext", () => ({
  useBandaContext: jest.fn(),
}));

const useBandaContextMock = jest.mocked(useBandaContext);

function simularBanda(crearBanda: (nombre: string) => Promise<boolean>, error = "") {
  useBandaContextMock.mockReturnValue({
    bandas: [],
    bandaActual: null,
    pertenenciaActual: null,
    cargando: false,
    errorCarga: "",
    error,
    esAdmin: false,
    crearBanda,
    seleccionarBanda: jest.fn(),
    recargarBandas: jest.fn(),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("CrearBanda", () => {
  test("muestra el nombre de la banda y Crear banda, sin roles", async () => {
    simularBanda(jest.fn());

    const { getByPlaceholderText, getByRole, queryByText } = await render(<CrearBanda />);

    expect(getByPlaceholderText("Nombre de la banda")).toBeTruthy();
    expect(getByRole("button", { name: "Crear banda" })).toBeTruthy();
    expect(queryByText(/admin/i)).toBeNull();
  });

  test("con el nombre vacío avisa y no crea", async () => {
    const crearBanda = jest.fn();
    simularBanda(crearBanda);

    const { getByPlaceholderText, getByText } = await render(<CrearBanda />);

    await fireEvent.press(getByText("Crear banda"));
    await fireEvent.changeText(getByPlaceholderText("Nombre de la banda"), "   ");
    await fireEvent.press(getByText("Crear banda"));

    expect(getByText("Escribe el nombre de la banda")).toBeTruthy();
    expect(crearBanda).not.toHaveBeenCalled();
  });

  test("crea la banda con el nombre sin espacios usando BandaContext", async () => {
    const crearBanda = jest.fn(async () => true);
    simularBanda(crearBanda);

    const { getByPlaceholderText, getByText } = await render(<CrearBanda />);

    await fireEvent.changeText(getByPlaceholderText("Nombre de la banda"), "  Cathaline  ");
    await fireEvent.press(getByText("Crear banda"));

    expect(crearBanda).toHaveBeenCalledTimes(1);
    expect(crearBanda).toHaveBeenCalledWith("Cathaline");
  });

  test("muestra el error del contexto", async () => {
    simularBanda(jest.fn(), "No se ha podido crear la banda");

    const { getByText } = await render(<CrearBanda />);

    expect(getByText("No se ha podido crear la banda")).toBeTruthy();
  });

  test("bloquea el envío mientras crea y no permite crear dos veces", async () => {
    let terminarCreacion: (correcto: boolean) => void = () => {};
    const crearBanda = jest.fn(
      () =>
        new Promise<boolean>((resolve) => {
          terminarCreacion = resolve;
        })
    );
    simularBanda(crearBanda);

    const { getByPlaceholderText, getByRole, getByText } = await render(<CrearBanda />);

    await fireEvent.changeText(getByPlaceholderText("Nombre de la banda"), "Cathaline");
    await fireEvent.press(getByText("Crear banda"));

    expect(getByRole("button", { name: "Crear banda", disabled: true })).toBeTruthy();
    expect(getByPlaceholderText("Nombre de la banda").props.editable).toBe(false);

    await fireEvent.press(getByText("Crear banda"));
    expect(crearBanda).toHaveBeenCalledTimes(1);

    await act(async () => {
      terminarCreacion(true);
    });

    expect(getByRole("button", { name: "Crear banda", disabled: false })).toBeTruthy();
  });
});
