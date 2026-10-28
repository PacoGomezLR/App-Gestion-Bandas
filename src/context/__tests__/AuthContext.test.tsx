import {
  type AuthChangeEvent,
  AuthError,
  type Session,
  type User,
} from "@supabase/supabase-js";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AuthProvider, useAuthContext } from "../AuthContext";

type CallbackAuth = (evento: AuthChangeEvent, sesion: Session | null) => void;

interface Credenciales {
  email: string;
  password: string;
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

function devolverPerfil(id: string, email: string) {
  mockSingle.mockResolvedValue({ data: { id, email }, error: null });
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

  test("restaura la sesión y carga solo id y email del propio perfil", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: crearSesion("u1", "usuario@email.com") },
      error: null,
    });
    devolverPerfil("u1", "usuario@email.com");

    const { result } = await renderizarAuth();

    expect(result.current.session?.user.id).toBe("u1");
    expect(result.current.usuario?.email).toBe("usuario@email.com");
    expect(result.current.perfil).toEqual({ id: "u1", email: "usuario@email.com" });
    expect(mockFrom).toHaveBeenCalledWith("perfiles");
    // El perfil no tiene rol: no se pide
    expect(mockSelect).toHaveBeenCalledWith("id, email");
    expect(mockEq).toHaveBeenCalledWith("id", "u1");
    expect(mockSingle).toHaveBeenCalledTimes(1);
  });

  test("no expone ningún rol ni esAdmin global", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: crearSesion("u1", "usuario@email.com") },
      error: null,
    });
    // Aunque llegara un campo rol, el perfil solo conserva id y email
    mockSingle.mockResolvedValue({
      data: { id: "u1", email: "usuario@email.com", rol: "admin" },
      error: null,
    });

    const { result } = await renderizarAuth();

    expect(result.current.perfil).toEqual({ id: "u1", email: "usuario@email.com" });
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
      await result.current.crearCuenta("  PACO@EMAIL.COM  ", "password");
    });

    expect(mockSignUp).toHaveBeenCalledTimes(1);
    expect(mockSignUp).toHaveBeenCalledWith({
      email: "paco@email.com",
      password: "password",
      options: { emailRedirectTo: URL_CALLBACK },
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
      resultado = await result.current.crearCuenta("paco@email.com", "password");
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
      resultado = await result.current.crearCuenta("paco@email.com", "password");
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
      resultado = await result.current.crearCuenta("paco@email.com", "123");
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

    await waitFor(() =>
      expect(result.current.error).toBe("No se ha podido confirmar la cuenta")
    );
    expect(mockSetSession).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
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
});
