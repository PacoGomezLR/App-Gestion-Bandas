import { act, fireEvent, render } from "@testing-library/react-native";
import { useAuthContext } from "../../context/AuthContext";
import { BotonCerrarSesion } from "../BotonCerrarSesion";

// constants/theme importa global.css, que Jest no puede interpretar
jest.mock("../../global.css", () => ({}));

// Solo se simula el hook: el AuthContext real cargaría el cliente Supabase
jest.mock("../../context/AuthContext", () => ({
  useAuthContext: jest.fn(),
}));

// Si el botón navegara, estas funciones registrarían la llamada
const mockRouter = { push: jest.fn(), replace: jest.fn(), navigate: jest.fn(), back: jest.fn() };
jest.mock("expo-router", () => ({
  router: mockRouter,
  useRouter: () => mockRouter,
}));

const useAuthContextMock = jest.mocked(useAuthContext);

function simularAuth(cerrarSesion: () => Promise<void>, error = "") {
  useAuthContextMock.mockReturnValue({
    session: null,
    usuario: null,
    perfil: { id: "paco", email: "paco@email.com" },
    cargando: false,
    error,
    iniciarSesion: jest.fn(),
    crearCuenta: jest.fn(),
    cerrarSesion,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("BotonCerrarSesion", () => {
  test("A: muestra Cerrar sesión como botón", async () => {
    simularAuth(jest.fn());

    const { getByRole } = await render(<BotonCerrarSesion />);

    expect(getByRole("button", { name: "Cerrar sesión" })).toBeTruthy();
  });

  test("B: al pulsar llama una vez a cerrarSesion", async () => {
    const cerrarSesion = jest.fn(async () => undefined);
    simularAuth(cerrarSesion);

    const { getByRole } = await render(<BotonCerrarSesion />);

    await fireEvent.press(getByRole("button", { name: "Cerrar sesión" }));

    expect(cerrarSesion).toHaveBeenCalledTimes(1);
  });

  test("C: mientras cierra queda deshabilitado y un segundo toque no repite", async () => {
    let terminar: () => void = () => undefined;
    const cerrarSesion = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          terminar = resolve;
        })
    );
    simularAuth(cerrarSesion);

    const { getByRole } = await render(<BotonCerrarSesion />);

    await fireEvent.press(getByRole("button", { name: "Cerrar sesión" }));

    const boton = getByRole("button", { name: "Cerrando sesión..." });
    expect(boton).toBeDisabled();

    await fireEvent.press(boton);
    expect(cerrarSesion).toHaveBeenCalledTimes(1);

    await act(async () => {
      terminar();
    });

    expect(getByRole("button", { name: "Cerrar sesión" })).toBeEnabled();
  });

  test("D: no navega manualmente; AppAuthGate decide al desaparecer la sesión", async () => {
    simularAuth(jest.fn(async () => undefined));

    const { getByRole } = await render(<BotonCerrarSesion />);

    await fireEvent.press(getByRole("button", { name: "Cerrar sesión" }));

    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  test("si falla muestra el mensaje genérico del contexto tras pulsar", async () => {
    simularAuth(jest.fn(async () => undefined), "No se ha podido cerrar sesión");

    const { getByRole, getByText, queryByText } = await render(<BotonCerrarSesion />);

    // Un error previo del contexto (de otra acción) no se muestra aquí
    expect(queryByText("No se ha podido cerrar sesión")).toBeNull();

    await fireEvent.press(getByRole("button", { name: "Cerrar sesión" }));

    expect(getByText("No se ha podido cerrar sesión")).toBeTruthy();
  });
});
