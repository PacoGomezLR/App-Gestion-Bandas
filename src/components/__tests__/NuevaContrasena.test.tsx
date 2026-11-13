import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { type ResultadoNuevaContrasena, useAuthContext } from "../../context/AuthContext";
import { NuevaContrasena } from "../NuevaContrasena";

// constants/theme importa global.css, que Jest no puede interpretar
jest.mock("../../global.css", () => ({}));

// Solo se simula el hook: el AuthContext real cargaría el cliente Supabase
jest.mock("../../context/AuthContext", () => ({ useAuthContext: jest.fn() }));

function simularAuth({
  actualizarContrasena = jest.fn(async (_p: string): Promise<ResultadoNuevaContrasena> => "actualizada"),
  finalizarRecuperacion = jest.fn(),
  cerrarSesion = jest.fn(async () => undefined),
  error = "",
}: {
  actualizarContrasena?: (password: string) => Promise<ResultadoNuevaContrasena>;
  finalizarRecuperacion?: () => void;
  cerrarSesion?: () => Promise<void>;
  error?: string;
} = {}) {
  jest.mocked(useAuthContext).mockReturnValue({
    session: null,
    usuario: null,
    perfil: null,
    cargando: false,
    error,
    iniciarSesion: jest.fn(),
    correoSinVerificar: null,
    reenviarVerificacion: jest.fn(),
    recuperandoContrasena: true,
    solicitarRecuperacion: jest.fn(),
    actualizarContrasena,
    finalizarRecuperacion,
    crearCuenta: jest.fn(),
    completarNombreVisible: jest.fn(),
    cerrarSesion,
  });

  return { actualizarContrasena, finalizarRecuperacion, cerrarSesion };
}

async function escribir(nueva: string, repetida: string) {
  await fireEvent.changeText(screen.getByLabelText("Nueva contraseña"), nueva);
  await fireEvent.changeText(screen.getByLabelText("Repetir contraseña"), repetida);
}

async function guardar() {
  await act(async () => {
    fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("NuevaContrasena", () => {
  test("pide la nueva contraseña dos veces", async () => {
    simularAuth();

    await render(<NuevaContrasena />);

    // Subtítulo de la pantalla y etiqueta del primer campo
    expect(screen.getAllByText("Nueva contraseña").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByLabelText("Nueva contraseña")).toBeTruthy();
    expect(screen.getByLabelText("Repetir contraseña")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeTruthy();
  });

  test.each([
    ["", "", "Escribe la nueva contraseña dos veces"],
    ["12345", "12345", "La contraseña debe tener al menos 6 caracteres"],
    ["secreta1", "secreta2", "Las contraseñas no coinciden"],
  ])("«%s» / «%s»: %s, sin llamar a Supabase", async (nueva, repetida, mensaje) => {
    const { actualizarContrasena } = simularAuth();
    await render(<NuevaContrasena />);

    await escribir(nueva, repetida);
    await guardar();

    expect(screen.getByText(mensaje)).toBeTruthy();
    expect(actualizarContrasena).not.toHaveBeenCalled();
  });

  test("guardar envía la nueva contraseña; con éxito avisa y Continuar sale de la recuperación", async () => {
    const { actualizarContrasena, finalizarRecuperacion } = simularAuth();
    await render(<NuevaContrasena />);

    await escribir("nueva-secreta", "nueva-secreta");
    await guardar();

    expect(actualizarContrasena).toHaveBeenCalledWith("nueva-secreta");
    expect(screen.getByText("Contraseña actualizada correctamente.")).toBeTruthy();
    // La contraseña ya no está en ningún campo
    expect(screen.queryByLabelText("Nueva contraseña")).toBeNull();
    expect(finalizarRecuperacion).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Continuar" }));
    });

    expect(finalizarRecuperacion).toHaveBeenCalledTimes(1);
  });

  test("si Supabase la rechaza, muestra el motivo del contexto y no da por buena la contraseña", async () => {
    const actualizarContrasena = jest.fn(async (): Promise<ResultadoNuevaContrasena> => "error");
    simularAuth({
      actualizarContrasena,
      error: "La nueva contraseña debe ser distinta de la anterior",
    });
    await render(<NuevaContrasena />);

    await escribir("misma-de-antes", "misma-de-antes");
    await guardar();

    expect(screen.getByText("La nueva contraseña debe ser distinta de la anterior")).toBeTruthy();
    expect(screen.queryByText("Contraseña actualizada correctamente.")).toBeNull();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeTruthy();
  });

  test("un doble toque solo guarda una vez y el botón queda deshabilitado mientras", async () => {
    let terminar: (resultado: ResultadoNuevaContrasena) => void = () => {};
    const actualizarContrasena = jest.fn(
      () => new Promise<ResultadoNuevaContrasena>((resolver) => (terminar = resolver))
    );
    simularAuth({ actualizarContrasena });
    await render(<NuevaContrasena />);
    await escribir("nueva-secreta", "nueva-secreta");

    const boton = screen.getByRole("button", { name: "Guardar" });
    await act(async () => {
      fireEvent.press(boton);
      fireEvent.press(boton);
    });

    expect(actualizarContrasena).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Guardando..." }).props.accessibilityState).toMatchObject({
      disabled: true,
    });

    await act(async () => {
      terminar("actualizada");
    });
  });

  test("Cancelar cierra la sesión del enlace y sale de la recuperación", async () => {
    const { cerrarSesion, finalizarRecuperacion, actualizarContrasena } = simularAuth();
    await render(<NuevaContrasena />);

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Cancelar" }));
    });

    expect(cerrarSesion).toHaveBeenCalledTimes(1);
    expect(finalizarRecuperacion).toHaveBeenCalledTimes(1);
    expect(actualizarContrasena).not.toHaveBeenCalled();
  });
});
