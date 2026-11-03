import { fireEvent, render } from "@testing-library/react-native";

import { useAuthContext } from "../../context/AuthContext";
import { CompletarPerfil } from "../CompletarPerfil";

// constants/theme importa global.css, que Jest no puede interpretar
jest.mock("../../global.css", () => ({}));

jest.mock("../../context/AuthContext", () => ({
  useAuthContext: jest.fn(),
}));

const useAuthContextMock = jest.mocked(useAuthContext);

function simularAuth(completarNombreVisible: (nombre: string) => Promise<boolean>, error = "") {
  useAuthContextMock.mockReturnValue({
    session: null,
    usuario: null,
    perfil: { id: "u1", email: "antiguo@email.com", nombreVisible: null },
    cargando: false,
    error,
    iniciarSesion: jest.fn(),
    crearCuenta: jest.fn(),
    completarNombreVisible,
    cerrarSesion: jest.fn(),
  });
}

describe("CompletarPerfil", () => {
  test("pide solo el nombre y lo guarda", async () => {
    const completarNombreVisible = jest.fn(async () => true);
    simularAuth(completarNombreVisible);

    const pantalla = await render(<CompletarPerfil />);

    expect(pantalla.getByText("Completa tu perfil")).toBeTruthy();
    // Un único campo: nada de email, rol ni banda
    expect(pantalla.getByLabelText("Nombre")).toBeTruthy();
    expect(pantalla.queryByLabelText(/correo|rol|banda/i)).toBeNull();

    await fireEvent.changeText(pantalla.getByLabelText("Nombre"), "  Paco Gómez ");
    await fireEvent.press(pantalla.getByRole("button", { name: "Guardar" }));

    expect(completarNombreVisible).toHaveBeenCalledWith("  Paco Gómez ");
  });

  test("un nombre demasiado corto no se envía", async () => {
    const completarNombreVisible = jest.fn(async () => true);
    simularAuth(completarNombreVisible);

    const pantalla = await render(<CompletarPerfil />);
    await fireEvent.changeText(pantalla.getByLabelText("Nombre"), "P");
    await fireEvent.press(pantalla.getByRole("button", { name: "Guardar" }));

    expect(pantalla.getByText("Escribe tu nombre (entre 2 y 80 caracteres)")).toBeTruthy();
    expect(completarNombreVisible).not.toHaveBeenCalled();
  });

  test("muestra el error del contexto si no se pudo guardar", async () => {
    simularAuth(jest.fn(async () => false), "No se ha podido guardar tu nombre");

    const pantalla = await render(<CompletarPerfil />);

    expect(pantalla.getByText("No se ha podido guardar tu nombre")).toBeTruthy();
  });
});
