import { act, fireEvent, render } from "@testing-library/react-native";
import { type ResultadoCrearCuenta, type ResultadoReenvio, useAuthContext } from "../../context/AuthContext";
import { PantallaAcceso } from "../PantallaAcceso";

// constants/theme importa global.css, que Jest no puede interpretar
jest.mock("../../global.css", () => ({}));

// Solo se simula el hook: el AuthContext real cargaría el cliente Supabase
jest.mock("../../context/AuthContext", () => ({
  useAuthContext: jest.fn(),
}));

// Invitación pendiente controlada por cada test (por defecto, ninguna)
let mockTokenPendiente: string | null = null;
jest.mock("../../context/InvitacionPendienteContext", () => ({
  useInvitacionPendiente: () => ({
    tokenPendiente: mockTokenPendiente,
    descartarInvitacion: jest.fn(),
  }),
}));

const useAuthContextMock = jest.mocked(useAuthContext);

const AVISO_CONFIRMACION = "Cuenta creada. Revisa tu correo y confirma tu cuenta antes de iniciar sesión.";

function simularAuth({
  iniciarSesion = jest.fn(async () => true),
  crearCuenta = jest.fn(async (): Promise<ResultadoCrearCuenta> => "sesion_iniciada"),
  error = "",
  correoSinVerificar = null,
  reenviarVerificacion = jest.fn(async (): Promise<ResultadoReenvio> => "enviado"),
  solicitarRecuperacion = jest.fn(async (_email: string): Promise<ResultadoReenvio> => "enviado"),
}: {
  iniciarSesion?: (email: string, password: string) => Promise<boolean>;
  crearCuenta?: (nombre: string, email: string, password: string) => Promise<ResultadoCrearCuenta>;
  error?: string;
  correoSinVerificar?: string | null;
  reenviarVerificacion?: () => Promise<ResultadoReenvio>;
  solicitarRecuperacion?: (email: string) => Promise<ResultadoReenvio>;
} = {}) {
  useAuthContextMock.mockReturnValue({
    session: null,
    usuario: null,
    perfil: null,
    cargando: false,
    error,
    correoSinVerificar,
    iniciarSesion,
    reenviarVerificacion,
    recuperandoContrasena: false,
    solicitarRecuperacion,
    actualizarContrasena: jest.fn(),
    finalizarRecuperacion: jest.fn(),
    crearCuenta,
    completarNombreVisible: jest.fn(),
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
  repetir: string,
  nombre = "Paco Gómez"
) {
  await fireEvent.changeText(pantalla.getByLabelText("Nombre"), nombre);
  await fireEvent.changeText(pantalla.getByLabelText("Correo electrónico"), email);
  await fireEvent.changeText(pantalla.getByLabelText("Contraseña"), password);
  await fireEvent.changeText(pantalla.getByLabelText("Repetir contraseña"), repetir);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockTokenPendiente = null;
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
    expect(pantalla.getByLabelText("Nombre")).toBeTruthy();
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

  test("el registro pide el nombre, pero no rol, banda ni músico", async () => {
    simularAuth();

    const pantalla = await render(<PantallaAcceso />);
    await abrirRegistro(pantalla);

    // Solo dos acciones: crear la cuenta o volver a entrar
    expect(pantalla.getAllByRole("button")).toHaveLength(2);
    // Ningún campo de rol, banda o músico (el único texto con "Banda" es la marca)
    expect(pantalla.queryByLabelText(/rol|banda|músico/i)).toBeNull();
    // El único nombre es el propio, el que verá la banda
    expect(pantalla.getAllByLabelText(/nombre/i)).toHaveLength(1);
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
    expect(crearCuenta).toHaveBeenCalledWith("Paco Gómez", "paco@email.com", "secreta");
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
    for (const campo of ["Nombre", "Correo electrónico", "Contraseña", "Repetir contraseña"]) {
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

  test("Entrar no pide nombre", async () => {
    simularAuth();

    const pantalla = await render(<PantallaAcceso />);

    expect(pantalla.queryByLabelText("Nombre")).toBeNull();
  });

  test.each([
    ["vacío", ""],
    ["solo espacios", "   "],
    ["de 1 carácter", "P"],
    ["de más de 80 caracteres", "P".repeat(81)],
  ])("con un nombre %s avisa y no crea la cuenta", async (_, nombre) => {
    const crearCuenta = jest.fn(async (): Promise<ResultadoCrearCuenta> => "sesion_iniciada");
    simularAuth({ crearCuenta });

    const pantalla = await render(<PantallaAcceso />);
    await abrirRegistro(pantalla);
    await rellenarRegistro(pantalla, "paco@email.com", "secreta", "secreta", nombre);
    await fireEvent.press(pantalla.getByRole("button", { name: "Crear cuenta" }));

    expect(pantalla.getByText("Escribe tu nombre (entre 2 y 80 caracteres)")).toBeTruthy();
    expect(crearCuenta).not.toHaveBeenCalled();
  });

  test("acepta un nombre de 2 y de 80 caracteres", async () => {
    const crearCuenta = jest.fn(async (): Promise<ResultadoCrearCuenta> => "sesion_iniciada");
    simularAuth({ crearCuenta });

    const pantalla = await render(<PantallaAcceso />);
    await abrirRegistro(pantalla);
    await rellenarRegistro(pantalla, "paco@email.com", "secreta", "secreta", "Jo");
    await fireEvent.press(pantalla.getByRole("button", { name: "Crear cuenta" }));
    await rellenarRegistro(pantalla, "paco@email.com", "secreta", "secreta", "P".repeat(80));
    await fireEvent.press(pantalla.getByRole("button", { name: "Crear cuenta" }));

    expect(crearCuenta).toHaveBeenCalledTimes(2);
  });

});

describe("PantallaAcceso: invitación pendiente", () => {
  const AVISO = "Tienes una invitación a una banda. Entra o crea tu cuenta para continuar.";

  test("sin invitación no hay aviso", async () => {
    simularAuth();

    const pantalla = await render(<PantallaAcceso />);

    expect(pantalla.queryByText(AVISO)).toBeNull();
  });

  test("con una invitación pendiente avisa al entrar y al crear cuenta, sin mostrar el token", async () => {
    mockTokenPendiente = "a".repeat(64);
    simularAuth();

    const pantalla = await render(<PantallaAcceso />);
    expect(pantalla.getByText(AVISO)).toBeTruthy();

    await abrirRegistro(pantalla);
    expect(pantalla.getByText(AVISO)).toBeTruthy();
    expect(pantalla.queryByText(/a{64}/)).toBeNull();
  });
});

describe("correo sin verificar", () => {
  const SIN_VERIFICAR =
    "Tu correo todavía no está verificado. Revisa tu bandeja de entrada y pulsa el enlace de confirmación.";
  const REENVIADO = "Correo de verificación reenviado. Revisa tu bandeja de entrada y la carpeta de spam.";
  const LIMITE = "Has solicitado demasiados correos. Espera unos minutos antes de intentarlo de nuevo.";
  const REENVIAR = { name: "Reenviar correo de verificación" };

  async function pantallaEntrar(email: string) {
    const pantalla = await render(<PantallaAcceso />);
    await fireEvent.changeText(pantalla.getByLabelText("Correo electrónico"), email);
    return pantalla;
  }

  test("al entrar sin verificar muestra su aviso (no «Correo o contraseña incorrectos») y ofrece reenviar", async () => {
    simularAuth({ error: SIN_VERIFICAR, correoSinVerificar: "paco@email.com" });

    const pantalla = await pantallaEntrar("Paco@Email.com ");

    expect(pantalla.getByText(SIN_VERIFICAR)).toBeTruthy();
    expect(pantalla.queryByText("Correo o contraseña incorrectos")).toBeNull();
    expect(pantalla.getByRole("button", REENVIAR)).toBeTruthy();
  });

  test("con credenciales incorrectas no se ofrece reenviar", async () => {
    simularAuth({ error: "Correo o contraseña incorrectos", correoSinVerificar: null });

    const pantalla = await pantallaEntrar("paco@email.com");

    expect(pantalla.getByText("Correo o contraseña incorrectos")).toBeTruthy();
    expect(pantalla.queryByRole("button", REENVIAR)).toBeNull();
  });

  test("si se escribe otro correo, la acción desaparece", async () => {
    simularAuth({ error: SIN_VERIFICAR, correoSinVerificar: "paco@email.com" });

    const pantalla = await pantallaEntrar("otra@email.com");

    expect(pantalla.queryByRole("button", REENVIAR)).toBeNull();
  });

  test("en el registro no se ofrece reenviar", async () => {
    simularAuth({ correoSinVerificar: "paco@email.com" });

    const pantalla = await pantallaEntrar("paco@email.com");
    await abrirRegistro(pantalla);

    expect(pantalla.queryByRole("button", REENVIAR)).toBeNull();
  });

  test("tras crear la cuenta sin sesión: aviso de verificación y opción de reenviar", async () => {
    simularAuth({
      crearCuenta: jest.fn(async (): Promise<ResultadoCrearCuenta> => "confirmacion_requerida"),
      correoSinVerificar: "paco@email.com",
    });

    const pantalla = await render(<PantallaAcceso />);
    await abrirRegistro(pantalla);
    await rellenarRegistro(pantalla, "paco@email.com", "secreta", "secreta");
    await fireEvent.press(pantalla.getByRole("button", { name: "Crear cuenta" }));

    expect(pantalla.getByText(AVISO_CONFIRMACION)).toBeTruthy();
    // Ya en Entrar, con el correo escrito y sin contraseñas
    expect(pantalla.getByRole("button", { name: "Entrar" })).toBeTruthy();
    expect(pantalla.getByRole("button", REENVIAR)).toBeTruthy();
  });

  test("reenviar con éxito muestra el aviso de reenviado", async () => {
    const reenviarVerificacion = jest.fn(async (): Promise<ResultadoReenvio> => "enviado");
    simularAuth({ error: SIN_VERIFICAR, correoSinVerificar: "paco@email.com", reenviarVerificacion });

    const pantalla = await pantallaEntrar("paco@email.com");
    await fireEvent.press(pantalla.getByRole("button", REENVIAR));

    expect(reenviarVerificacion).toHaveBeenCalledTimes(1);
    expect(pantalla.getByText(REENVIADO)).toBeTruthy();
  });

  test("si falla (límite de correos) no inventa éxito: el motivo llega por el error del contexto", async () => {
    const reenviarVerificacion = jest.fn(async (): Promise<ResultadoReenvio> => "error");
    simularAuth({ error: LIMITE, correoSinVerificar: "paco@email.com", reenviarVerificacion });

    const pantalla = await pantallaEntrar("paco@email.com");
    await fireEvent.press(pantalla.getByRole("button", REENVIAR));

    expect(reenviarVerificacion).toHaveBeenCalledTimes(1);
    expect(pantalla.queryByText(REENVIADO)).toBeNull();
    expect(pantalla.getByText(LIMITE)).toBeTruthy();
  });

  test("mientras reenvía queda deshabilitado y un doble toque no envía dos veces", async () => {
    let terminar: (resultado: ResultadoReenvio) => void = () => {};
    const reenviarVerificacion = jest.fn(
      () => new Promise<ResultadoReenvio>((resolver) => (terminar = resolver))
    );
    simularAuth({ error: SIN_VERIFICAR, correoSinVerificar: "paco@email.com", reenviarVerificacion });

    const pantalla = await pantallaEntrar("paco@email.com");
    const boton = pantalla.getByRole("button", REENVIAR);

    await act(async () => {
      fireEvent.press(boton);
      fireEvent.press(boton);
    });

    expect(reenviarVerificacion).toHaveBeenCalledTimes(1);
    expect(pantalla.getByRole("button", REENVIAR).props.accessibilityState).toMatchObject({ disabled: true });

    await act(async () => {
      terminar("enviado");
    });

    expect(pantalla.getByRole("button", REENVIAR).props.accessibilityState).toMatchObject({ disabled: false });
  });

  test("con una invitación pendiente, el aviso de verificación no la descarta", async () => {
    mockTokenPendiente = "a".repeat(64);
    simularAuth({
      crearCuenta: jest.fn(async (): Promise<ResultadoCrearCuenta> => "confirmacion_requerida"),
      correoSinVerificar: "paco@email.com",
    });

    const pantalla = await render(<PantallaAcceso />);
    await abrirRegistro(pantalla);
    await rellenarRegistro(pantalla, "paco@email.com", "secreta", "secreta");
    await fireEvent.press(pantalla.getByRole("button", { name: "Crear cuenta" }));

    const INVITACION = "Tienes una invitación a una banda. Entra o crea tu cuenta para continuar.";

    expect(pantalla.getByText(AVISO_CONFIRMACION)).toBeTruthy();
    expect(pantalla.getByText(INVITACION)).toBeTruthy();

    await fireEvent.press(pantalla.getByRole("button", REENVIAR));

    // Reenviar tampoco la toca: sigue pendiente hasta que haya sesión
    expect(pantalla.getByText(REENVIADO)).toBeTruthy();
    expect(pantalla.getByText(INVITACION)).toBeTruthy();
  });
});

describe("restablecer contraseña", () => {
  const ENVIADO = "Te hemos enviado un correo para restablecer tu contraseña.";
  const RESTABLECER = { name: "Restablecer contraseña" };

  test("en Entrar se ofrece «¿Has olvidado tu contraseña?»; en el registro, no", async () => {
    simularAuth();
    const pantalla = await render(<PantallaAcceso />);

    expect(pantalla.getByText("¿Has olvidado tu contraseña?")).toBeTruthy();
    expect(pantalla.getByRole("button", RESTABLECER)).toBeTruthy();

    await abrirRegistro(pantalla);

    expect(pantalla.queryByRole("button", RESTABLECER)).toBeNull();
  });

  test("solo pide el correo", async () => {
    simularAuth();
    const pantalla = await render(<PantallaAcceso />);

    await fireEvent.press(pantalla.getByRole("button", RESTABLECER));

    expect(pantalla.getByText("Restablecer contraseña")).toBeTruthy();
    expect(pantalla.getByLabelText("Correo electrónico")).toBeTruthy();
    expect(pantalla.queryByLabelText("Contraseña")).toBeNull();
    expect(pantalla.getByRole("button", { name: "Enviar enlace" })).toBeTruthy();
  });

  test("sin correo avisa y no llama a Supabase", async () => {
    const solicitarRecuperacion = jest.fn(async (_email: string): Promise<ResultadoReenvio> => "enviado");
    simularAuth({ solicitarRecuperacion });
    const pantalla = await render(<PantallaAcceso />);

    await fireEvent.press(pantalla.getByRole("button", RESTABLECER));
    await fireEvent.press(pantalla.getByRole("button", { name: "Enviar enlace" }));

    expect(pantalla.getByText("Introduce el correo electrónico")).toBeTruthy();
    expect(solicitarRecuperacion).not.toHaveBeenCalled();
  });

  test("con éxito avisa (sin decir si la cuenta existe) y vuelve a Entrar con el correo escrito", async () => {
    const solicitarRecuperacion = jest.fn(async (_email: string): Promise<ResultadoReenvio> => "enviado");
    simularAuth({ solicitarRecuperacion });
    const pantalla = await render(<PantallaAcceso />);

    await fireEvent.press(pantalla.getByRole("button", RESTABLECER));
    await fireEvent.changeText(pantalla.getByLabelText("Correo electrónico"), "paco@email.com");
    await fireEvent.press(pantalla.getByRole("button", { name: "Enviar enlace" }));

    expect(solicitarRecuperacion).toHaveBeenCalledWith("paco@email.com");
    expect(pantalla.getByText(ENVIADO)).toBeTruthy();
    expect(pantalla.getByRole("button", { name: "Entrar" })).toBeTruthy();
    expect(pantalla.getByLabelText("Correo electrónico").props.value).toBe("paco@email.com");
  });

  test("si falla no inventa éxito: el motivo llega por el error del contexto", async () => {
    const LIMITE = "Has solicitado demasiados correos. Espera unos minutos antes de intentarlo de nuevo.";
    simularAuth({
      solicitarRecuperacion: jest.fn(async (): Promise<ResultadoReenvio> => "error"),
      error: LIMITE,
    });
    const pantalla = await render(<PantallaAcceso />);

    await fireEvent.press(pantalla.getByRole("button", RESTABLECER));
    await fireEvent.changeText(pantalla.getByLabelText("Correo electrónico"), "paco@email.com");
    await fireEvent.press(pantalla.getByRole("button", { name: "Enviar enlace" }));

    expect(pantalla.queryByText(ENVIADO)).toBeNull();
    expect(pantalla.getByText(LIMITE)).toBeTruthy();
    expect(pantalla.getByRole("button", { name: "Enviar enlace" })).toBeTruthy();
  });

  test("«¿La recuerdas? Entrar» vuelve a Entrar", async () => {
    simularAuth();
    const pantalla = await render(<PantallaAcceso />);

    await fireEvent.press(pantalla.getByRole("button", RESTABLECER));
    await fireEvent.press(pantalla.getByRole("button", { name: "Entrar" }));

    expect(pantalla.getByLabelText("Contraseña")).toBeTruthy();
    expect(pantalla.getByRole("button", RESTABLECER)).toBeTruthy();
  });

  test("con una invitación pendiente el aviso sigue a la vista", async () => {
    mockTokenPendiente = "a".repeat(64);
    simularAuth();
    const pantalla = await render(<PantallaAcceso />);

    await fireEvent.press(pantalla.getByRole("button", RESTABLECER));

    expect(
      pantalla.getByText("Tienes una invitación a una banda. Entra o crea tu cuenta para continuar.")
    ).toBeTruthy();
  });
});
