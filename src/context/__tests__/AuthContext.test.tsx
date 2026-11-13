import {
  type AuthChangeEvent,
  AuthError,
  type Session,
  type User,
} from "@supabase/supabase-js";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import {
  AuthProvider,
  ERROR_CORREO_SIN_VERIFICAR,
  ERROR_ENLACE_CADUCADO,
  ERROR_ENLACE_RECUPERACION,
  ERROR_LIMITE_CORREOS,
  useAuthContext,
} from "../AuthContext";

type CallbackAuth = (evento: AuthChangeEvent, sesion: Session | null) => void;

interface Credenciales {
  email: string;
  password: string;
  options?: { emailRedirectTo?: string; data?: Record<string, unknown> };
}

interface ParametrosReenvio {
  type: "signup";
  email: string;
  options?: { emailRedirectTo?: string };
}

interface TokensSesion {
  access_token: string;
  refresh_token: string;
}

interface OpcionesSalida {
  scope?: "global" | "local" | "others";
}

type ListenerUrl = (evento: { url: string }) => void;

interface RespuestaPerfil {
  data: unknown;
  error: { message: string } | null;
}

// Guardar el nombre propio (cuentas antiguas) tiene sus propios tests de repositorio
const mockGuardarNombre = jest.fn(async (_usuarioId: string, _nombre: string) => {});

jest.mock("../../services/supabase/perfiles", () => ({
  guardarNombreVisiblePropio: (usuarioId: string, nombre: string) => mockGuardarNombre(usuarioId, nombre),
}));

// Cliente Supabase simulado: no se conecta a Internet ni necesita .env
let mockCallbackAuth: CallbackAuth | null = null;
const mockUnsubscribe = jest.fn();
const mockGetSession = jest.fn(
  async (): Promise<{ data: { session: Session | null }; error: null }> => ({
    data: { session: null },
    error: null,
  })
);
const mockOnAuthStateChange = jest.fn((callback: CallbackAuth) => {
  mockCallbackAuth = callback;
  return { data: { subscription: { id: "1", callback, unsubscribe: mockUnsubscribe } } };
});
const mockSignIn = jest.fn(
  async (
    _credenciales: Credenciales
  ): Promise<{ data: { session: Session | null }; error: AuthError | null }> => ({
    data: { session: null },
    error: null,
  })
);
const mockSignUp = jest.fn(
  async (
    _credenciales: Credenciales
  ): Promise<{
    data: { user: User | null; session: Session | null };
    error: AuthError | null;
  }> => ({
    data: { user: null, session: null },
    error: null,
  })
);
const mockResend = jest.fn(
  async (_parametros: ParametrosReenvio): Promise<{ data: unknown; error: AuthError | null }> => ({
    data: {},
    error: null,
  })
);
const mockResetPassword = jest.fn(
  async (_email: string, _opciones?: { redirectTo?: string }): Promise<{ data: unknown; error: AuthError | null }> => ({
    data: {},
    error: null,
  })
);
const mockUpdateUser = jest.fn(
  async (_cambios: { password?: string }): Promise<{ data: unknown; error: AuthError | null }> => ({
    data: {},
    error: null,
  })
);
// Limpieza de la URL en web: aquí solo se comprueba cuándo se pide
const mockLimpiarUrl = jest.fn();
jest.mock("../../lib/limpiarUrlAuth", () => ({ limpiarUrlAuth: () => mockLimpiarUrl() }));

const mockSignOut = jest.fn(
  async (_opciones?: OpcionesSalida): Promise<{ error: AuthError | null }> => ({
    error: null,
  })
);
const mockSingle = jest.fn(
  async (): Promise<RespuestaPerfil> => ({ data: null, error: { message: "Sin perfil" } })
);
const mockEq = jest.fn((_columna: string, _valor: string) => ({ single: mockSingle }));
const mockSelect = jest.fn((_columnas: string) => ({ eq: mockEq }));
const mockFrom = jest.fn((_tabla: string) => ({ select: mockSelect }));

const mockSetSession = jest.fn(async (_tokens: TokensSesion) => ({
  error: null as AuthError | null,
}));
const mockExchange = jest.fn(async (_code: string) => ({ error: null as AuthError | null }));

// Linking simulado: URL de callback determinista, sin IP ni puerto
const URL_CALLBACK = "mibanda://auth/callback";
let mockListenerUrl: ListenerUrl | null = null;
const mockRemoveListener = jest.fn();
const mockCreateURL = jest.fn((_ruta: string) => URL_CALLBACK);
const mockGetInitialURL = jest.fn(async (): Promise<string | null> => null);
const mockAddEventListener = jest.fn((_tipo: "url", listener: ListenerUrl) => {
  mockListenerUrl = listener;
  return { remove: mockRemoveListener };
});

jest.mock("expo-linking", () => ({
  createURL: (ruta: string) => mockCreateURL(ruta),
  getInitialURL: () => mockGetInitialURL(),
  addEventListener: (tipo: "url", listener: ListenerUrl) => mockAddEventListener(tipo, listener),
}));

jest.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (callback: CallbackAuth) => mockOnAuthStateChange(callback),
      signInWithPassword: (credenciales: Credenciales) => mockSignIn(credenciales),
      signUp: (credenciales: Credenciales) => mockSignUp(credenciales),
      resend: (parametros: ParametrosReenvio) => mockResend(parametros),
      resetPasswordForEmail: (email: string, opciones?: { redirectTo?: string }) =>
        mockResetPassword(email, opciones),
      updateUser: (cambios: { password?: string }) => mockUpdateUser(cambios),
      signOut: (opciones?: OpcionesSalida) => mockSignOut(opciones),
      setSession: (tokens: TokensSesion) => mockSetSession(tokens),
      exchangeCodeForSession: (code: string) => mockExchange(code),
    },
    from: (tabla: string) => mockFrom(tabla),
  },
}));

function crearSesion(id: string, email: string): Session {
  return {
    access_token: `token-${id}`,
    refresh_token: `refresco-${id}`,
    expires_in: 3600,
    token_type: "bearer",
    user: {
      id,
      email,
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: "2026-01-01T00:00:00Z",
    },
  };
}

function devolverPerfil(id: string, email: string, nombreVisible: string | null = "Paco Gómez") {
  mockSingle.mockResolvedValue({ data: { id, email, nombre_visible: nombreVisible }, error: null });
}

async function renderizarAuth() {
  const resultado = await renderHook(() => useAuthContext(), {
    wrapper: AuthProvider,
  });

  await waitFor(() => expect(resultado.result.current.cargando).toBe(false));

  return resultado;
}

// Simula un evento de Supabase Auth (SIGNED_IN, SIGNED_OUT, ...)
async function emitirCambioAuth(evento: AuthChangeEvent, sesion: Session | null) {
  await act(() => {
    mockCallbackAuth?.(evento, sesion);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCallbackAuth = null;
  mockListenerUrl = null;
  mockGetInitialURL.mockResolvedValue(null);
  mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
  mockSingle.mockResolvedValue({ data: null, error: { message: "Sin perfil" } });
});

describe("AuthContext", () => {
  test("sin sesión termina de cargar sin usuario ni perfil", async () => {
    const { result } = await renderizarAuth();

    expect(result.current.session).toBeNull();
    expect(result.current.usuario).toBeNull();
    expect(result.current.perfil).toBeNull();
    expect(result.current.cargando).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test("restaura la sesión y carga solo id, email y nombre visible del propio perfil", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: crearSesion("u1", "usuario@email.com") },
      error: null,
    });
    devolverPerfil("u1", "usuario@email.com");

    const { result } = await renderizarAuth();

    expect(result.current.session?.user.id).toBe("u1");
    expect(result.current.usuario?.email).toBe("usuario@email.com");
    expect(result.current.perfil).toEqual({
      id: "u1",
      email: "usuario@email.com",
      nombreVisible: "Paco Gómez",
    });
    expect(mockFrom).toHaveBeenCalledWith("perfiles");
    // El perfil no tiene rol: no se pide
    expect(mockSelect).toHaveBeenCalledWith("id, email, nombre_visible");
    expect(mockEq).toHaveBeenCalledWith("id", "u1");
    expect(mockSingle).toHaveBeenCalledTimes(1);
  });

  test("no expone ningún rol ni esAdmin global", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: crearSesion("u1", "usuario@email.com") },
      error: null,
    });
    // Aunque llegara un campo rol, el perfil solo conserva id, email y nombre
    mockSingle.mockResolvedValue({
      data: { id: "u1", email: "usuario@email.com", nombre_visible: null, rol: "admin" },
      error: null,
    });

    const { result } = await renderizarAuth();

    expect(result.current.perfil).toEqual({ id: "u1", email: "usuario@email.com", nombreVisible: null });
    expect(Object.keys(result.current)).not.toContain("esAdmin");
  });

  test("si no se puede cargar el perfil mantiene la sesión y avisa", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: crearSesion("u1", "usuario@email.com") },
      error: null,
    });

    const { result } = await renderizarAuth();

    expect(result.current.session).not.toBeNull();
    expect(result.current.perfil).toBeNull();
    expect(result.current.error).toBe("No se ha podido cargar el perfil");
  });

  test("rechaza un perfil con forma incorrecta", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: crearSesion("u1", "usuario@email.com") },
      error: null,
    });
    mockSingle.mockResolvedValue({ data: { id: "u1" }, error: null });

    const { result } = await renderizarAuth();

    expect(result.current.perfil).toBeNull();
    expect(result.current.error).toBe("No se ha podido cargar el perfil");
  });

  test("inicia sesión con el correo normalizado y recibe la sesión por el listener", async () => {
    const sesion = crearSesion("u1", "usuario@email.com");
    mockSignIn.mockResolvedValue({ data: { session: sesion }, error: null });
    devolverPerfil("u1", "usuario@email.com");

    const { result } = await renderizarAuth();

    let correcto = false;
    await act(async () => {
      correcto = await result.current.iniciarSesion("  Usuario@Email.com ", "secreta");
    });

    expect(correcto).toBe(true);
    expect(mockSignIn).toHaveBeenCalledWith({
      email: "usuario@email.com",
      password: "secreta",
    });

    await emitirCambioAuth("SIGNED_IN", sesion);
    await waitFor(() => expect(result.current.perfil?.id).toBe("u1"));

    expect(result.current.session?.user.id).toBe("u1");
    expect(result.current.error).toBe("");
  });

  test("un acceso incorrecto devuelve false, avisa y no inventa sesión", async () => {
    mockSignIn.mockResolvedValue({
      data: { session: null },
      error: new AuthError("Invalid login credentials", 400, "invalid_credentials"),
    });

    const { result } = await renderizarAuth();

    let correcto = true;
    await act(async () => {
      correcto = await result.current.iniciarSesion("usuario@email.com", "mala");
    });

    expect(correcto).toBe(false);
    expect(result.current.error).toBe("Correo o contraseña incorrectos");
    expect(result.current.session).toBeNull();
    expect(result.current.perfil).toBeNull();
  });

  test("cerrar sesión llama a signOut solo en este dispositivo y limpia sesión, usuario y perfil", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: crearSesion("u1", "usuario@email.com") },
      error: null,
    });
    devolverPerfil("u1", "usuario@email.com");

    const { result } = await renderizarAuth();
    expect(result.current.perfil).not.toBeNull();

    await act(async () => {
      await result.current.cerrarSesion();
    });
    await emitirCambioAuth("SIGNED_OUT", null);

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    // Solo la sesión de este dispositivo: las de otros dispositivos siguen activas
    expect(mockSignOut).toHaveBeenCalledWith({ scope: "local" });
    expect(result.current.session).toBeNull();
    expect(result.current.usuario).toBeNull();
    expect(result.current.perfil).toBeNull();
  });

  test("refrescar el token del mismo usuario no vuelve a pedir el perfil", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: crearSesion("u1", "usuario@email.com") },
      error: null,
    });
    devolverPerfil("u1", "usuario@email.com");

    const { result } = await renderizarAuth();
    await emitirCambioAuth("TOKEN_REFRESHED", crearSesion("u1", "usuario@email.com"));

    expect(result.current.perfil?.id).toBe("u1");
    expect(mockSingle).toHaveBeenCalledTimes(1);
  });

  test("crear cuenta llama a signUp con el correo normalizado", async () => {
    const { result } = await renderizarAuth();

    await act(async () => {
      await result.current.crearCuenta("  Paco Gómez  ", "  PACO@EMAIL.COM  ", "password");
    });

    expect(mockSignUp).toHaveBeenCalledTimes(1);
    // El nombre viaja recortado en los metadatos; el trigger 005 lo copia al perfil
    expect(mockSignUp).toHaveBeenCalledWith({
      email: "paco@email.com",
      password: "password",
      options: { emailRedirectTo: URL_CALLBACK, data: { nombre_visible: "Paco Gómez" } },
    });
    expect(mockCreateURL).toHaveBeenCalledWith("auth/callback");
  });

  test("crear cuenta con sesión devuelve sesion_iniciada y no toca bandas", async () => {
    const sesion = crearSesion("paco", "paco@email.com");
    mockSignUp.mockResolvedValue({ data: { user: sesion.user, session: sesion }, error: null });
    devolverPerfil("paco", "paco@email.com");

    const { result } = await renderizarAuth();

    let resultado = "";
    await act(async () => {
      resultado = await result.current.crearCuenta("Paco Gómez", "paco@email.com", "password");
    });

    expect(resultado).toBe("sesion_iniciada");
    expect(result.current.error).toBe("");
    // Solo crea la cuenta: ni bandas ni banda_usuarios
    expect(mockFrom).not.toHaveBeenCalled();

    // La sesión global llega, como siempre, por el listener
    await emitirCambioAuth("SIGNED_IN", sesion);
    await waitFor(() => expect(result.current.perfil?.id).toBe("paco"));

    expect(mockFrom.mock.calls.map(([tabla]) => tabla)).toEqual(["perfiles"]);
  });

  test("crear cuenta sin sesión devuelve confirmacion_requerida y no inventa sesión", async () => {
    const usuario = crearSesion("paco", "paco@email.com").user;
    mockSignUp.mockResolvedValue({ data: { user: usuario, session: null }, error: null });

    const { result } = await renderizarAuth();

    let resultado = "";
    await act(async () => {
      resultado = await result.current.crearCuenta("Paco Gómez", "paco@email.com", "password");
    });

    expect(resultado).toBe("confirmacion_requerida");
    expect(result.current.error).toBe("");
    expect(result.current.session).toBeNull();
    expect(result.current.usuario).toBeNull();
  });

  test("si falla el registro devuelve error con un mensaje genérico", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null, session: null },
      error: new AuthError("Password should be at least 6 characters", 422, "weak_password"),
    });

    const { result } = await renderizarAuth();

    let resultado = "";
    await act(async () => {
      resultado = await result.current.crearCuenta("Paco Gómez", "paco@email.com", "123");
    });

    expect(resultado).toBe("error");
    expect(result.current.error).toBe("No se ha podido crear la cuenta");
    expect(result.current.session).toBeNull();
    expect(result.current.usuario).toBeNull();
  });

  test("registra un único listener y lo limpia al desmontar", async () => {
    const { rerender, unmount } = await renderizarAuth();

    await rerender({});

    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
    expect(mockUnsubscribe).not.toHaveBeenCalled();

    await unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  test("con la app cerrada procesa la URL inicial y la sesión entra por el listener", async () => {
    const sesion = crearSesion("paco", "paco@email.com");
    devolverPerfil("paco", "paco@email.com");
    mockGetInitialURL.mockResolvedValue(
      `${URL_CALLBACK}#access_token=access-falso&refresh_token=refresh-falso`
    );

    const { result } = await renderizarAuth();

    await waitFor(() => expect(mockSetSession).toHaveBeenCalledTimes(1));
    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: "access-falso",
      refresh_token: "refresh-falso",
    });
    // setSession no fija la sesión directamente: llega por onAuthStateChange
    expect(result.current.session).toBeNull();

    await emitirCambioAuth("SIGNED_IN", sesion);
    await waitFor(() => expect(result.current.perfil?.id).toBe("paco"));
    expect(result.current.error).toBe("");
  });

  test("con la app abierta procesa la URL recibida", async () => {
    await renderizarAuth();

    await act(() => {
      mockListenerUrl?.({ url: `${URL_CALLBACK}?code=code-falso` });
    });

    await waitFor(() => expect(mockExchange).toHaveBeenCalledTimes(1));
    expect(mockExchange).toHaveBeenCalledWith("code-falso");
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  test("no procesa dos veces la misma URL", async () => {
    const url = `${URL_CALLBACK}#access_token=access-falso&refresh_token=refresh-falso`;
    mockGetInitialURL.mockResolvedValue(url);

    await renderizarAuth();
    await waitFor(() => expect(mockSetSession).toHaveBeenCalledTimes(1));

    await act(() => {
      mockListenerUrl?.({ url });
    });

    expect(mockSetSession).toHaveBeenCalledTimes(1);
  });

  test("un enlace fallido muestra un error genérico sin cerrar sesión", async () => {
    mockGetInitialURL.mockResolvedValue(
      `${URL_CALLBACK}#error=access_denied&error_code=otp_expired&error_description=Detalle+interno`
    );

    const { result } = await renderizarAuth();

    // otp_expired: enlace caducado o ya usado, con un mensaje claro y sin el detalle interno
    await waitFor(() =>
      expect(result.current.error).toBe("El enlace ha caducado o ya se ha usado. Solicita uno nuevo.")
    );
    expect(result.current.error).not.toMatch(/Detalle interno/);
    expect(mockSetSession).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  test("otro fallo del enlace de confirmación mantiene el mensaje genérico", async () => {
    mockGetInitialURL.mockResolvedValue(`${URL_CALLBACK}#error=server_error&error_code=unexpected_failure`);

    const { result } = await renderizarAuth();

    await waitFor(() => expect(result.current.error).toBe("No se ha podido confirmar la cuenta"));
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  test("una URL irrelevante no altera el estado", async () => {
    mockGetInitialURL.mockResolvedValue("mibanda://tecnicos");

    const { result } = await renderizarAuth();

    await act(() => {
      mockListenerUrl?.({ url: "mibanda://eventos?id=1" });
    });

    expect(result.current.error).toBe("");
    expect(result.current.session).toBeNull();
    expect(mockSetSession).not.toHaveBeenCalled();
    expect(mockExchange).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  test("registra un único listener de enlaces y lo limpia al desmontar", async () => {
    const { rerender, unmount } = await renderizarAuth();

    await rerender({});

    expect(mockAddEventListener).toHaveBeenCalledTimes(1);
    expect(mockGetInitialURL).toHaveBeenCalledTimes(1);
    expect(mockRemoveListener).not.toHaveBeenCalled();

    await unmount();

    expect(mockRemoveListener).toHaveBeenCalledTimes(1);
  });

  test("crear cuenta con un nombre no válido no llama a signUp", async () => {
    const { result } = await renderizarAuth();
    let resultado = "";

    await act(async () => {
      resultado = await result.current.crearCuenta(" P ", "paco@email.com", "password");
    });

    expect(resultado).toBe("error");
    expect(mockSignUp).not.toHaveBeenCalled();
    expect(result.current.error).toBe("Escribe tu nombre (entre 2 y 80 caracteres)");
  });

  test("solo envía nombre_visible en los metadatos: nada de rol ni banda", async () => {
    const { result } = await renderizarAuth();

    await act(async () => {
      await result.current.crearCuenta("Paco Gómez", "paco@email.com", "password");
    });

    expect(mockSignUp.mock.calls[0][0].options?.data).toEqual({ nombre_visible: "Paco Gómez" });
  });

  test("una cuenta antigua sin nombre lo completa una vez, solo en su propio perfil", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: crearSesion("u1", "usuario@email.com") },
      error: null,
    });
    devolverPerfil("u1", "usuario@email.com", null);

    const { result } = await renderizarAuth();
    expect(result.current.perfil?.nombreVisible).toBeNull();

    let guardado: boolean | undefined;
    await act(async () => {
      guardado = await result.current.completarNombreVisible("  Paco Gómez ");
    });

    expect(guardado).toBe(true);
    // Siempre el id de la sesión: no hay forma de pasar el de otra persona
    expect(mockGuardarNombre).toHaveBeenCalledWith("u1", "Paco Gómez");
    expect(result.current.perfil?.nombreVisible).toBe("Paco Gómez");
  });

  test("completar el nombre valida la longitud y avisa si falla Supabase", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: crearSesion("u1", "usuario@email.com") },
      error: null,
    });
    devolverPerfil("u1", "usuario@email.com", null);
    mockGuardarNombre.mockRejectedValueOnce(new Error("sin red"));

    const { result } = await renderizarAuth();

    await act(async () => {
      await result.current.completarNombreVisible("P");
    });
    expect(mockGuardarNombre).not.toHaveBeenCalled();
    expect(result.current.error).toBe("Escribe tu nombre (entre 2 y 80 caracteres)");

    await act(async () => {
      await result.current.completarNombreVisible("Paco Gómez");
    });
    expect(result.current.error).toBe("No se ha podido guardar tu nombre");
    expect(result.current.perfil?.nombreVisible).toBeNull();
  });
});

describe("correo sin verificar", () => {
  const NO_CONFIRMADO = new AuthError("Email not confirmed", 400, "email_not_confirmed");

  async function entrarSinVerificar() {
    mockSignIn.mockResolvedValue({ data: { session: null }, error: NO_CONFIRMADO });
    const montado = await renderizarAuth();

    let correcto = true;
    await act(async () => {
      correcto = await montado.result.current.iniciarSesion("  Paco@Email.com ", "secreta");
    });

    return { ...montado, correcto };
  }

  test("email_not_confirmed: su propio aviso, nunca «Correo o contraseña incorrectos»", async () => {
    const { result, correcto } = await entrarSinVerificar();

    expect(correcto).toBe(false);
    expect(result.current.error).toBe(ERROR_CORREO_SIN_VERIFICAR);
    expect(result.current.error).not.toBe("Correo o contraseña incorrectos");
    expect(result.current.correoSinVerificar).toBe("paco@email.com");
    expect(result.current.session).toBeNull();
  });

  test("se distingue por el código, no por el texto en inglés", async () => {
    mockSignIn.mockResolvedValue({
      data: { session: null },
      error: new AuthError("Mensaje cualquiera", 400, "email_not_confirmed"),
    });
    const { result } = await renderizarAuth();

    await act(async () => {
      await result.current.iniciarSesion("paco@email.com", "secreta");
    });

    expect(result.current.error).toBe(ERROR_CORREO_SIN_VERIFICAR);
  });

  test("credenciales incorrectas: el mensaje de siempre y nada que reenviar", async () => {
    mockSignIn.mockResolvedValue({
      data: { session: null },
      error: new AuthError("Invalid login credentials", 400, "invalid_credentials"),
    });
    const { result } = await renderizarAuth();

    await act(async () => {
      await result.current.iniciarSesion("paco@email.com", "mala");
    });

    expect(result.current.error).toBe("Correo o contraseña incorrectos");
    expect(result.current.correoSinVerificar).toBeNull();
  });

  test("un nuevo intento limpia el estado anterior", async () => {
    const { result } = await entrarSinVerificar();
    mockSignIn.mockResolvedValue({
      data: { session: null },
      error: new AuthError("Invalid login credentials", 400, "invalid_credentials"),
    });

    await act(async () => {
      await result.current.iniciarSesion("otra@email.com", "mala");
    });

    expect(result.current.correoSinVerificar).toBeNull();
  });

  test("crear cuenta sin sesión deja el correo pendiente de verificar; con sesión, no", async () => {
    const usuario = crearSesion("paco", "paco@email.com").user;
    mockSignUp.mockResolvedValue({ data: { user: usuario, session: null }, error: null });
    const { result } = await renderizarAuth();

    await act(async () => {
      await result.current.crearCuenta("Paco Gómez", " Paco@Email.com", "secreta");
    });
    expect(result.current.correoSinVerificar).toBe("paco@email.com");

    const sesion = crearSesion("paco", "paco@email.com");
    mockSignUp.mockResolvedValue({ data: { user: sesion.user, session: sesion }, error: null });

    await act(async () => {
      await result.current.crearCuenta("Paco Gómez", "paco@email.com", "secreta");
    });
    expect(result.current.correoSinVerificar).toBeNull();
  });

  test("reenviar usa resend de tipo signup con el mismo callback que el registro", async () => {
    const { result } = await entrarSinVerificar();

    let resultado = "";
    await act(async () => {
      resultado = await result.current.reenviarVerificacion();
    });

    expect(resultado).toBe("enviado");
    expect(mockResend).toHaveBeenCalledTimes(1);
    expect(mockResend).toHaveBeenCalledWith({
      type: "signup",
      email: "paco@email.com",
      options: { emailRedirectTo: URL_CALLBACK },
    });
    expect(mockCreateURL).toHaveBeenLastCalledWith("auth/callback");
    expect(result.current.error).toBe("");
  });

  test("web: el callback es https://dominio/auth/callback (createURL de la web), igual en registro y reenvío", async () => {
    const WEB = "https://mibanda.expo.app/auth/callback";
    mockCreateURL.mockReturnValue(WEB);
    const usuario = crearSesion("paco", "paco@email.com").user;
    mockSignUp.mockResolvedValue({ data: { user: usuario, session: null }, error: null });
    const { result } = await renderizarAuth();

    await act(async () => {
      await result.current.crearCuenta("Paco Gómez", "paco@email.com", "secreta");
    });
    await act(async () => {
      await result.current.reenviarVerificacion();
    });

    expect(mockSignUp.mock.calls[0][0].options?.emailRedirectTo).toBe(WEB);
    expect(mockResend.mock.calls[0][0].options?.emailRedirectTo).toBe(WEB);
    mockCreateURL.mockReturnValue(URL_CALLBACK);
  });

  test.each([
    ["over_email_send_rate_limit", 429],
    ["over_request_rate_limit", 429],
    [undefined, 429],
  ])("límite (%s, %i): mensaje claro y sin éxito inventado", async (codigo, estado) => {
    const { result } = await entrarSinVerificar();
    mockResend.mockResolvedValueOnce({
      data: {},
      error: new AuthError("For security purposes, you can only request this after 60 seconds", estado, codigo),
    });

    let resultado = "";
    await act(async () => {
      resultado = await result.current.reenviarVerificacion();
    });

    expect(resultado).toBe("error");
    expect(result.current.error).toBe(ERROR_LIMITE_CORREOS);
    expect(result.current.error).not.toMatch(/security|seconds/);
  });

  test("otro fallo del reenvío: mensaje genérico, sin texto técnico", async () => {
    const { result } = await entrarSinVerificar();
    mockResend.mockRejectedValueOnce(new Error("Network request failed"));

    let resultado = "";
    await act(async () => {
      resultado = await result.current.reenviarVerificacion();
    });

    expect(resultado).toBe("error");
    expect(result.current.error).toBe("No se ha podido reenviar el correo de verificación");
  });

  test("dos reenvíos a la vez solo envían uno", async () => {
    const { result } = await entrarSinVerificar();
    let terminar: () => void = () => {};
    mockResend.mockImplementationOnce(
      () =>
        new Promise((resolver) => {
          terminar = () => resolver({ data: {}, error: null });
        })
    );

    let segundo = "";
    await act(async () => {
      const primero = result.current.reenviarVerificacion();
      segundo = await result.current.reenviarVerificacion();
      terminar();
      await primero;
    });

    expect(mockResend).toHaveBeenCalledTimes(1);
    expect(segundo).toBe("error");
  });

  test("sin un correo pendiente de verificar no se reenvía nada", async () => {
    const { result } = await renderizarAuth();

    await act(async () => {
      await result.current.reenviarVerificacion();
    });

    expect(mockResend).not.toHaveBeenCalled();
  });
});

describe("mismo flujo en Android y web", () => {
  const fs = jest.requireActual<{
    existsSync: (ruta: string) => boolean;
    readFileSync: (ruta: string, codificacion: "utf8") => string;
  }>("fs");

  test("sin variantes .web ni ramas de plataforma en el acceso", () => {
    expect(fs.existsSync("src/context/AuthContext.web.tsx")).toBe(false);
    expect(fs.existsSync("src/components/PantallaAcceso.web.tsx")).toBe(false);

    for (const ruta of ["src/context/AuthContext.tsx", "src/components/PantallaAcceso.tsx"]) {
      expect(fs.readFileSync(ruta, "utf8")).not.toMatch(/Platform\.OS|Platform\.select/);
    }
  });

  test("una sola URL de callback para registro y reenvío (sin URLs escritas a mano)", () => {
    // Sin comentarios: documentan las URLs de cada plataforma
    const codigo = fs.readFileSync("src/context/AuthContext.tsx", "utf8").replace(/\/\/.*$/gm, "");

    expect(codigo.match(/Linking\.createURL\(RUTA_CALLBACK_AUTH\)/g)).toHaveLength(1);
    expect(codigo.match(/emailRedirectTo: urlCallbackAuth\(\)/g)).toHaveLength(2);
    expect(codigo).not.toMatch(/mibanda:\/\/auth|https:\/\/[a-z.]+\/auth\/callback/);
  });
});

describe("recuperación de contraseña", () => {
  const ENLACE = `${URL_CALLBACK}#access_token=acceso-recuperacion&refresh_token=refresco-recuperacion&type=recovery`;

  test("pedirla llama a resetPasswordForEmail con el correo normalizado y el callback de la app", async () => {
    const { result } = await renderizarAuth();

    let resultado = "";
    await act(async () => {
      resultado = await result.current.solicitarRecuperacion("  Paco@Email.com ");
    });

    expect(resultado).toBe("enviado");
    expect(mockResetPassword).toHaveBeenCalledWith("paco@email.com", { redirectTo: URL_CALLBACK });
    expect(mockCreateURL).toHaveBeenLastCalledWith("auth/callback");
    expect(result.current.error).toBe("");
  });

  test("web: el enlace vuelve a https://dominio/auth/callback (la misma URL que registro y reenvío)", async () => {
    const WEB = "https://mibanda.expo.app/auth/callback";
    mockCreateURL.mockReturnValue(WEB);
    const { result } = await renderizarAuth();

    await act(async () => {
      await result.current.solicitarRecuperacion("paco@email.com");
    });

    expect(mockResetPassword.mock.calls[0][1]).toEqual({ redirectTo: WEB });
    mockCreateURL.mockReturnValue(URL_CALLBACK);
  });

  test("límite de correos: mensaje claro y sin éxito", async () => {
    mockResetPassword.mockResolvedValueOnce({
      data: {},
      error: new AuthError("email rate limit exceeded", 429, "over_email_send_rate_limit"),
    });
    const { result } = await renderizarAuth();

    let resultado = "";
    await act(async () => {
      resultado = await result.current.solicitarRecuperacion("paco@email.com");
    });

    expect(resultado).toBe("error");
    expect(result.current.error).toBe(ERROR_LIMITE_CORREOS);
  });

  test("error de red al pedirla: mensaje genérico", async () => {
    mockResetPassword.mockRejectedValueOnce(new Error("Network request failed"));
    const { result } = await renderizarAuth();

    await act(async () => {
      await result.current.solicitarRecuperacion("paco@email.com");
    });

    expect(result.current.error).toBe("No se ha podido enviar el correo de recuperación");
  });

  test("abrir el enlace activa la recuperación antes de tener sesión y la establece con sus tokens", async () => {
    let terminar: () => void = () => {};
    mockSetSession.mockImplementationOnce(
      () =>
        new Promise((resolver) => {
          terminar = () => resolver({ error: null });
        })
    );
    mockGetInitialURL.mockResolvedValue(ENLACE);

    const { result } = await renderizarAuth();

    // Aún sin sesión: la app no llega a mostrarse con ella
    await waitFor(() => expect(result.current.recuperandoContrasena).toBe(true));
    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: "acceso-recuperacion",
      refresh_token: "refresco-recuperacion",
    });

    await act(async () => {
      terminar();
    });

    expect(result.current.recuperandoContrasena).toBe(true);
    expect(result.current.error).toBe("");
    // Web: los tokens salen de la barra de direcciones
    expect(mockLimpiarUrl).toHaveBeenCalled();
  });

  test("con la app abierta (evento de URL) también", async () => {
    const { result } = await renderizarAuth();

    await act(async () => {
      mockListenerUrl?.({ url: ENLACE });
    });

    await waitFor(() => expect(result.current.recuperandoContrasena).toBe(true));
  });

  test("PASSWORD_RECOVERY de Supabase (flujo PKCE) también la activa", async () => {
    const { result } = await renderizarAuth();

    await emitirCambioAuth("PASSWORD_RECOVERY", crearSesion("paco", "paco@email.com"));

    expect(result.current.recuperandoContrasena).toBe(true);
  });

  test("enlace caducado: mensaje claro y sin recuperación ni sesión", async () => {
    mockGetInitialURL.mockResolvedValue(`${URL_CALLBACK}#error=access_denied&error_code=otp_expired`);

    const { result } = await renderizarAuth();

    await waitFor(() => expect(result.current.error).toBe(ERROR_ENLACE_CADUCADO));
    expect(result.current.recuperandoContrasena).toBe(false);
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  test("enlace de recuperación no válido: su propio mensaje y sale de la recuperación", async () => {
    mockSetSession.mockResolvedValueOnce({ error: new AuthError("Invalid Refresh Token", 400) });
    mockGetInitialURL.mockResolvedValue(ENLACE);

    const { result } = await renderizarAuth();

    await waitFor(() => expect(result.current.error).toBe(ERROR_ENLACE_RECUPERACION));
    expect(result.current.recuperandoContrasena).toBe(false);
  });

  test("un enlace de confirmación de correo no activa la recuperación", async () => {
    mockGetInitialURL.mockResolvedValue(`${URL_CALLBACK}#access_token=a&refresh_token=b&type=signup`);

    const { result } = await renderizarAuth();

    await waitFor(() => expect(mockSetSession).toHaveBeenCalled());
    expect(result.current.recuperandoContrasena).toBe(false);
    expect(result.current.error).toBe("");
  });

  test("un enlace de invitación no se procesa ni se limpia aquí", async () => {
    mockGetInitialURL.mockResolvedValue(`https://mibanda.expo.app/invitacion?token=${"a".repeat(64)}`);

    const { result } = await renderizarAuth();

    await act(async () => {});

    expect(result.current.recuperandoContrasena).toBe(false);
    expect(mockSetSession).not.toHaveBeenCalled();
    expect(mockLimpiarUrl).not.toHaveBeenCalled();
  });

  test("guardar llama a updateUser con la nueva contraseña", async () => {
    const { result } = await renderizarAuth();

    let resultado = "";
    await act(async () => {
      resultado = await result.current.actualizarContrasena("nueva-secreta");
    });

    expect(resultado).toBe("actualizada");
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: "nueva-secreta" });
    expect(result.current.error).toBe("");
  });

  test.each([
    ["same_password", 422, "La nueva contraseña debe ser distinta de la anterior"],
    ["weak_password", 422, "La contraseña no es lo bastante segura. Prueba con una más larga"],
    ["session_not_found", 403, ERROR_ENLACE_RECUPERACION],
    ["unexpected_failure", 500, "No se ha podido cambiar la contraseña"],
  ])("updateUser con %s: mensaje claro sin texto técnico", async (codigo, estado, mensaje) => {
    mockUpdateUser.mockResolvedValueOnce({ data: {}, error: new AuthError("Detalle técnico", estado, codigo) });
    const { result } = await renderizarAuth();

    let resultado = "";
    await act(async () => {
      resultado = await result.current.actualizarContrasena("nueva-secreta");
    });

    expect(resultado).toBe("error");
    expect(result.current.error).toBe(mensaje);
  });

  test("sin sesión de recuperación (AuthSessionMissingError): pide un enlace nuevo", async () => {
    const sinSesion = new AuthError("Auth session missing!", 400);
    sinSesion.name = "AuthSessionMissingError";
    mockUpdateUser.mockResolvedValueOnce({ data: {}, error: sinSesion });
    const { result } = await renderizarAuth();

    await act(async () => {
      await result.current.actualizarContrasena("nueva-secreta");
    });

    expect(result.current.error).toBe(ERROR_ENLACE_RECUPERACION);
  });

  test("error de red al guardar: mensaje genérico", async () => {
    mockUpdateUser.mockRejectedValueOnce(new Error("Network request failed"));
    const { result } = await renderizarAuth();

    await act(async () => {
      await result.current.actualizarContrasena("nueva-secreta");
    });

    expect(result.current.error).toBe("No se ha podido cambiar la contraseña");
  });

  test("finalizarRecuperacion y cerrar sesión salen del modo recuperación", async () => {
    const { result } = await renderizarAuth();

    await emitirCambioAuth("PASSWORD_RECOVERY", crearSesion("paco", "paco@email.com"));
    expect(result.current.recuperandoContrasena).toBe(true);

    await act(async () => {
      result.current.finalizarRecuperacion();
    });
    expect(result.current.recuperandoContrasena).toBe(false);

    await emitirCambioAuth("PASSWORD_RECOVERY", crearSesion("paco", "paco@email.com"));
    await emitirCambioAuth("SIGNED_OUT", null);
    expect(result.current.recuperandoContrasena).toBe(false);
  });
});
