import { act, fireEvent, render } from "@testing-library/react-native";
import { useBandaContext } from "../../context/BandaContext";
import { CrearBanda } from "../CrearBanda";

// constants/theme importa global.css, que Jest no puede interpretar
jest.mock("../../global.css", () => ({}));

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
  test("muestra MI Banda, Crea tu banda, el nombre de la banda y Crear banda, sin roles", async () => {
    simularBanda(jest.fn());

    const { getByLabelText, getByRole, getByText, queryByText } = await render(<CrearBanda />);

    expect(getByText("MI Banda")).toBeTruthy();
    expect(getByText("Crea tu banda")).toBeTruthy();
    expect(getByText("Empieza creando el espacio de tu banda.")).toBeTruthy();
    expect(getByLabelText("Nombre de la banda")).toBeTruthy();
    expect(getByRole("button", { name: "Crear banda" })).toBeTruthy();
    expect(queryByText(/admin/i)).toBeNull();
    expect(queryByText(/\brol\b|permiso/i)).toBeNull();
  });

  test("con el nombre vacío avisa y no crea", async () => {
    const crearBanda = jest.fn();
    simularBanda(crearBanda);

    const { getByLabelText, getByText } = await render(<CrearBanda />);

    await fireEvent.press(getByText("Crear banda"));
    await fireEvent.changeText(getByLabelText("Nombre de la banda"), "   ");
    await fireEvent.press(getByText("Crear banda"));

    expect(getByText("Escribe el nombre de la banda")).toBeTruthy();
    expect(crearBanda).not.toHaveBeenCalled();
  });

  test("crea la banda con el nombre sin espacios usando BandaContext", async () => {
    const crearBanda = jest.fn(async () => true);
    simularBanda(crearBanda);

    const { getByLabelText, getByText } = await render(<CrearBanda />);

    await fireEvent.changeText(getByLabelText("Nombre de la banda"), "  Cathaline  ");
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

    const { getByLabelText, getByRole, getByText } = await render(<CrearBanda />);

    await fireEvent.changeText(getByLabelText("Nombre de la banda"), "Cathaline");
    await fireEvent.press(getByText("Crear banda"));

    expect(getByRole("button", { name: "Crear banda", disabled: true })).toBeTruthy();
    expect(getByLabelText("Nombre de la banda").props.editable).toBe(false);

    await fireEvent.press(getByText("Crear banda"));
    expect(crearBanda).toHaveBeenCalledTimes(1);

    await act(async () => {
      terminarCreacion(true);
    });

    expect(getByRole("button", { name: "Crear banda", disabled: false })).toBeTruthy();
  });
});
