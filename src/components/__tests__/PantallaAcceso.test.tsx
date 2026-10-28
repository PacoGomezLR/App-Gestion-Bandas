import { act, fireEvent, render } from "@testing-library/react-native";
import { type ResultadoCrearCuenta, useAuthContext } from "../../context/AuthContext";
import { PantallaAcceso } from "../PantallaAcceso";

// constants/theme importa global.css, que Jest no puede interpretar
jest.mock("../../global.css", () => ({}));

// Solo se simula el hook: el AuthContext real cargaría el cliente Supabase
jest.mock("../../context/AuthContext", () => ({
  useAuthContext: jest.fn(),
}));

const useAuthContextMock = jest.mocked(useAuthContext);

const AVISO_CONFIRMACION = "Cuenta creada. Revisa tu correo para confirmar tu cuenta.";

function simularAuth({
  iniciarSesion = jest.fn(async () => true),
  crearCuenta = jest.fn(async (): Promise<ResultadoCrearCuenta> => "sesion_iniciada"),
  error = "",
}: {
  iniciarSesion?: (email: string, password: string) => Promise<boolean>;
  crearCuenta?: (email: string, password: string) => Promise<ResultadoCrearCuenta>;
  error?: string;
} = {}) {
  useAuthContextMock.mockReturnValue({
    session: null,
    usuario: null,
    perfil: null,
    cargando: false,
    error,
    iniciarSesion,
    crearCuenta,
    cerrarSesion: jest.fn(),
  });
}

type Pantalla = Awaited<ReturnType<typeof render>>;

async function abrirRegistro(pantalla: Pantalla) {
  await fireEvent.press(pantalla.getByRole("button", { name: "Crear cuenta" }));
}

async function rellenarRegistro(
  pantalla: Pantalla,
  email: string,
  password: string,
  repetir: string
) {
  await fireEvent.changeText(pantalla.getByLabelText("Correo electrónico"), email);
  await fireEvent.changeText(pantalla.getByLabelText("Contraseña"), password);
  await fireEvent.changeText(pantalla.getByLabelText("Repetir contraseña"), repetir);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("PantallaAcceso: entrar", () => {
  test("empieza en modo Entrar con la acción Crear cuenta", async () => {
    simularAuth();

    const { getByLabelText, getByRole, getByText, queryByLabelText, queryByText } =
      await render(<PantallaAcceso />);

    expect(getByText("MI Banda")).toBeTruthy();
    expect(getByText("Organiza tu banda en un solo lugar")).toBeTruthy();
    expect(getByLabelText("Correo electrónico")).toBeTruthy();
    expect(getByLabelText("Contraseña").props.secureTextEntry).toBe(true);
    expect(getByRole("button", { name: "Entrar" })).toBeTruthy();
    expect(getByRole("button", { name: "Crear cuenta" })).toBeTruthy();
    expect(queryByLabelText("Repetir contraseña")).toBeNull();
    expect(getByText("¿Aún no tienes cuenta?")).toBeTruthy();
    expect(queryByText("¿Ya tienes cuenta?")).toBeNull();
  });

  test("con campos vacíos avisa y no intenta entrar", async () => {
    const iniciarSesion = jest.fn(async () => true);
    simularAuth({ iniciarSesion });

    const { getByLabelText, getByText } = await render(<PantallaAcceso />);

    await fireEvent.press(getByText("Entrar"));
    expect(getByText("Introduce el correo electrónico y la contraseña")).toBeTruthy();

    // Un correo de solo espacios tampoco basta
    await fireEvent.changeText(getByLabelText("Correo electrónico"), "   ");
    await fireEvent.changeText(getByLabelText("Contraseña"), "secreta");
    await fireEvent.press(getByText("Entrar"));

    expect(iniciarSesion).not.toHaveBeenCalled();
  });

  test("entra con el correo y la contraseña escritos", async () => {
    const iniciarSesion = jest.fn(async () => true);
    simularAuth({ iniciarSesion });

    const { getByLabelText, getByText } = await render(<PantallaAcceso />);

    await fireEvent.changeText(getByLabelText("Correo electrónico"), "usuario@email.com");
    await fireEvent.changeText(getByLabelText("Contraseña"), "secreta");
    await fireEvent.press(getByText("Entrar"));

    expect(iniciarSesion).toHaveBeenCalledTimes(1);
    expect(iniciarSesion).toHaveBeenCalledWith("usuario@email.com", "secreta");
  });

  test("muestra el error de acceso del contexto", async () => {
    simularAuth({ error: "Correo o contraseña incorrectos" });

    const { getByText } = await render(<PantallaAcceso />);

    expect(getByText("Correo o contraseña incorrectos")).toBeTruthy();
  });

  test("bloquea botones y campos mientras entra y no permite un segundo intento", async () => {
    let terminarAcceso: (correcto: boolean) => void = () => {};
    const iniciarSesion = jest.fn(
      () =>
        new Promise<boolean>((resolve) => {
          terminarAcceso = resolve;
        })
    );
    simularAuth({ iniciarSesion });

    const { getByLabelText, getByRole, getByText } = await render(<PantallaAcceso />);

    await fireEvent.changeText(getByLabelText("Correo electrónico"), "usuario@email.com");
    await fireEvent.changeText(getByLabelText("Contraseña"), "secreta");
    await fireEvent.press(getByText("Entrar"));

    expect(getByRole("button", { name: "Entrar", disabled: true })).toBeTruthy();
    expect(getByRole("button", { name: "Crear cuenta", disabled: true })).toBeTruthy();
    expect(getByLabelText("Correo electrónico").props.editable).toBe(false);
    expect(getByLabelText("Contraseña").props.editable).toBe(false);

    await fireEvent.press(getByText("Entrar"));
    expect(iniciarSesion).toHaveBeenCalledTimes(1);

    await act(async () => {
      terminarAcceso(false);
    });

    expect(getByRole("button", { name: "Entrar", disabled: false })).toBeTruthy();
    expect(getByLabelText("Correo electrónico").props.editable).toBe(true);
  });
});

describe("PantallaAcceso: crear cuenta", () => {
  test("Crear cuenta muestra el registro con repetir contraseña", async () => {
    simularAuth();

    const pantalla = await render(<PantallaAcceso />);
    await abrirRegistro(pantalla);

    expect(pantalla.getByText("MI Banda")).toBeTruthy();
    expect(pantalla.getByText("Crea tu cuenta")).toBeTruthy();
    expect(pantalla.getByLabelText("Correo electrónico")).toBeTruthy();
    expect(pantalla.getByLabelText("Contraseña")).toBeTruthy();
    expect(
      pantalla.getByLabelText("Repetir contraseña").props.secureTextEntry
    ).toBe(true);
    expect(pantalla.getByRole("button", { name: "Crear cuenta" })).toBeTruthy();
    // Entrar pasa a ser la acción secundaria
    expect(pantalla.getByText("¿Ya tienes cuenta?")).toBeTruthy();
    expect(pantalla.getByRole("button", { name: "Entrar" })).toBeTruthy();
    expect(pantalla.queryByText("¿Aún no tienes cuenta?")).toBeNull();
  });

  test("el registro no pide rol, banda ni nombre de músico", async () => {
    simularAuth();

    const pantalla = await render(<PantallaAcceso />);
    await abrirRegistro(pantalla);

    // Solo dos acciones: crear la cuenta o volver a entrar
    expect(pantalla.getAllByRole("button")).toHaveLength(2);
    // Ningún campo de rol, banda, músico o nombre (el único texto con "Banda" es la marca)
    expect(pantalla.queryByLabelText(/rol|banda|músico|nombre/i)).toBeNull();
    for (const texto of [/admin/i, /usuario/i, /\brol\b/i, /músico/i]) {
      expect(pantalla.queryByText(texto)).toBeNull();
    }
  });

  test("con contraseñas distintas avisa y no crea la cuenta", async () => {
    const crearCuenta = jest.fn(async (): Promise<ResultadoCrearCuenta> => "sesion_iniciada");
    simularAuth({ crearCuenta });

    const pantalla = await render(<PantallaAcceso />);
    await abrirRegistro(pantalla);
    await rellenarRegistro(pantalla, "paco@email.com", "abc", "xyz");
    await fireEvent.press(pantalla.getByRole("button", { name: "Crear cuenta" }));

    expect(pantalla.getByText("Las contraseñas no coinciden")).toBeTruthy();
    expect(crearCuenta).not.toHaveBeenCalled();
  });

  test("con campos vacíos avisa y no crea la cuenta", async () => {
    const crearCuenta = jest.fn(async (): Promise<ResultadoCrearCuenta> => "sesion_iniciada");
    simularAuth({ crearCuenta });

    const pantalla = await render(<PantallaAcceso />);
    await abrirRegistro(pantalla);
    await rellenarRegistro(pantalla, "paco@email.com", "secreta", "");
    await fireEvent.press(pantalla.getByRole("button", { name: "Crear cuenta" }));

    expect(
      pantalla.getByText("Introduce el correo electrónico y la contraseña")
    ).toBeTruthy();
    expect(crearCuenta).not.toHaveBeenCalled();
  });

  test("crea la cuenta una vez con el correo y la contraseña", async () => {
    const crearCuenta = jest.fn(async (): Promise<ResultadoCrearCuenta> => "sesion_iniciada");
    simularAuth({ crearCuenta });

    const pantalla = await render(<PantallaAcceso />);
    await abrirRegistro(pantalla);
    await rellenarRegistro(pantalla, "paco@email.com", "secreta", "secreta");
    await fireEvent.press(pantalla.getByRole("button", { name: "Crear cuenta" }));

    expect(crearCuenta).toHaveBeenCalledTimes(1);
    expect(crearCuenta).toHaveBeenCalledWith("paco@email.com", "secreta");
  });

  test("con sesión iniciada no muestra el aviso de confirmación", async () => {
    simularAuth({
      crearCuenta: jest.fn(async (): Promise<ResultadoCrearCuenta> => "sesion_iniciada"),
    });

    const pantalla = await render(<PantallaAcceso />);
    await abrirRegistro(pantalla);
    await rellenarRegistro(pantalla, "paco@email.com", "secreta", "secreta");
    await fireEvent.press(pantalla.getByRole("button", { name: "Crear cuenta" }));

    expect(pantalla.queryByText(AVISO_CONFIRMACION)).toBeNull();
  });

  test("si hay que confirmar el correo avisa y vuelve a Entrar sin contraseñas", async () => {
    simularAuth({
      crearCuenta: jest.fn(async (): Promise<ResultadoCrearCuenta> => "confirmacion_requerida"),
    });

    const pantalla = await render(<PantallaAcceso />);
    await abrirRegistro(pantalla);
    await rellenarRegistro(pantalla, "paco@email.com", "secreta", "secreta");
    await fireEvent.press(pantalla.getByRole("button", { name: "Crear cuenta" }));

    expect(pantalla.getByText(AVISO_CONFIRMACION)).toBeTruthy();
    expect(pantalla.getByRole("button", { name: "Entrar" })).toBeTruthy();
    expect(pantalla.queryByLabelText("Repetir contraseña")).toBeNull();
    // Se conserva el correo y se limpia la contraseña
    expect(pantalla.getByLabelText("Correo electrónico").props.value).toBe(
      "paco@email.com"
    );
    expect(pantalla.getByLabelText("Contraseña").props.value).toBe("");
  });

  test("si falla muestra el error del contexto", async () => {
    simularAuth({
      crearCuenta: jest.fn(async (): Promise<ResultadoCrearCuenta> => "error"),
      error: "No se ha podido crear la cuenta",
    });

    const pantalla = await render(<PantallaAcceso />);
    await abrirRegistro(pantalla);
    await rellenarRegistro(pantalla, "paco@email.com", "secreta", "secreta");
    await fireEvent.press(pantalla.getByRole("button", { name: "Crear cuenta" }));

    expect(pantalla.getByText("No se ha podido crear la cuenta")).toBeTruthy();
    expect(pantalla.queryByText(AVISO_CONFIRMACION)).toBeNull();
  });

  test("bloquea el registro mientras se crea y no permite crear dos veces", async () => {
    let terminarRegistro: (resultado: ResultadoCrearCuenta) => void = () => {};
    const crearCuenta = jest.fn(
      () =>
        new Promise<ResultadoCrearCuenta>((resolve) => {
          terminarRegistro = resolve;
        })
    );
    simularAuth({ crearCuenta });

    const pantalla = await render(<PantallaAcceso />);
    await abrirRegistro(pantalla);
    await rellenarRegistro(pantalla, "paco@email.com", "secreta", "secreta");
    await fireEvent.press(pantalla.getByRole("button", { name: "Crear cuenta" }));
    await fireEvent.press(pantalla.getByRole("button", { name: "Crear cuenta" }));

    expect(crearCuenta).toHaveBeenCalledTimes(1);
    expect(pantalla.getByRole("button", { name: "Crear cuenta", disabled: true })).toBeTruthy();
    expect(
      pantalla.getByRole("button", { name: "Entrar", disabled: true })
    ).toBeTruthy();
    for (const campo of ["Correo electrónico", "Contraseña", "Repetir contraseña"]) {
      expect(pantalla.getByLabelText(campo).props.editable).toBe(false);
    }

    await act(async () => {
      terminarRegistro("error");
    });

    expect(pantalla.getByRole("button", { name: "Crear cuenta", disabled: false })).toBeTruthy();
  });

  test("Entrar desde el registro vuelve al modo Entrar sin llamar a Supabase", async () => {
    const iniciarSesion = jest.fn(async () => true);
    const crearCuenta = jest.fn(async (): Promise<ResultadoCrearCuenta> => "sesion_iniciada");
    simularAuth({ iniciarSesion, crearCuenta });

    const pantalla = await render(<PantallaAcceso />);
    await abrirRegistro(pantalla);
    await rellenarRegistro(pantalla, "paco@email.com", "abc", "xyz");
    await fireEvent.press(pantalla.getByRole("button", { name: "Crear cuenta" }));
    expect(pantalla.getByText("Las contraseñas no coinciden")).toBeTruthy();

    await fireEvent.press(pantalla.getByRole("button", { name: "Entrar" }));

    expect(pantalla.getByText("Organiza tu banda en un solo lugar")).toBeTruthy();
    expect(pantalla.getByRole("button", { name: "Crear cuenta" })).toBeTruthy();
    expect(pantalla.queryByLabelText("Repetir contraseña")).toBeNull();
    expect(pantalla.queryByText("Las contraseñas no coinciden")).toBeNull();
    expect(iniciarSesion).not.toHaveBeenCalled();
    expect(crearCuenta).not.toHaveBeenCalled();
  });
});
