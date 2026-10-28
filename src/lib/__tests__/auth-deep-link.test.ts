import { AuthError } from "@supabase/supabase-js";

import {
  type ClienteAuthEnlace,
  esEnlaceCallbackAuth,
  procesarEnlaceAuth,
} from "../auth-deep-link";

// Valores falsos de test: nunca tokens reales
const ACCESS = "access-falso";
const REFRESH = "refresh-falso";
const CODE = "code-falso";

const mockSetSession = jest.fn(
  async (_tokens: { access_token: string; refresh_token: string }) => ({
    error: null as AuthError | null,
  })
);
const mockExchange = jest.fn(async (_code: string) => ({ error: null as AuthError | null }));

const auth: ClienteAuthEnlace = {
  setSession: (tokens) => mockSetSession(tokens),
  exchangeCodeForSession: (code) => mockExchange(code),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("procesarEnlaceAuth", () => {
  test("A: con access_token y refresh_token llama una vez a setSession", async () => {
    const resultado = await procesarEnlaceAuth(
      `mibanda://auth/callback#access_token=${ACCESS}&refresh_token=${REFRESH}&type=signup`,
      auth
    );

    expect(resultado).toBe("sesion_establecida");
    expect(mockSetSession).toHaveBeenCalledTimes(1);
    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: ACCESS,
      refresh_token: REFRESH,
    });
    expect(mockExchange).not.toHaveBeenCalled();
  });

  test("lee también los tokens en la query y en la URL de Expo Go", async () => {
    const resultado = await procesarEnlaceAuth(
      `exp://192.0.2.1:8081/--/auth/callback?access_token=${ACCESS}&refresh_token=${REFRESH}`,
      auth
    );

    expect(resultado).toBe("sesion_establecida");
    expect(mockSetSession).toHaveBeenCalledTimes(1);
  });

  test("B: con code llama a exchangeCodeForSession y no a setSession", async () => {
    const resultado = await procesarEnlaceAuth(`mibanda://auth/callback?code=${CODE}`, auth);

    expect(resultado).toBe("sesion_establecida");
    expect(mockExchange).toHaveBeenCalledTimes(1);
    expect(mockExchange).toHaveBeenCalledWith(CODE);
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  test("C: una URL irrelevante se ignora sin llamar a Supabase", async () => {
    for (const url of [
      "mibanda://auth/callback",
      "mibanda://eventos?id=1",
      `mibanda://otra/ruta#access_token=${ACCESS}&refresh_token=${REFRESH}`,
      "no es una url",
    ]) {
      expect(await procesarEnlaceAuth(url, auth)).toBe("ignorado");
    }

    expect(mockSetSession).not.toHaveBeenCalled();
    expect(mockExchange).not.toHaveBeenCalled();
  });

  test("D: solo access_token es un error controlado sin setSession", async () => {
    const resultado = await procesarEnlaceAuth(
      `mibanda://auth/callback#access_token=${ACCESS}`,
      auth
    );

    expect(resultado).toBe("error");
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  test("E: solo refresh_token es un error controlado sin setSession", async () => {
    const resultado = await procesarEnlaceAuth(
      `mibanda://auth/callback#refresh_token=${REFRESH}`,
      auth
    );

    expect(resultado).toBe("error");
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  test("F: error_code y error_description son un error controlado", async () => {
    const resultado = await procesarEnlaceAuth(
      "mibanda://auth/callback#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid",
      auth
    );

    expect(resultado).toBe("error");
    expect(mockSetSession).not.toHaveBeenCalled();
    expect(mockExchange).not.toHaveBeenCalled();
  });

  test("si Supabase rechaza la sesión devuelve error", async () => {
    mockSetSession.mockResolvedValueOnce({ error: new AuthError("Invalid token", 401) });
    mockExchange.mockRejectedValueOnce(new Error("Sin red"));

    expect(
      await procesarEnlaceAuth(
        `mibanda://auth/callback#access_token=${ACCESS}&refresh_token=${REFRESH}`,
        auth
      )
    ).toBe("error");
    expect(await procesarEnlaceAuth(`mibanda://auth/callback?code=${CODE}`, auth)).toBe("error");
  });

  test("G: nunca escribe en consola", async () => {
    const espias = (["log", "info", "warn", "error", "debug"] as const).map((metodo) =>
      jest.spyOn(console, metodo).mockImplementation(() => undefined)
    );

    mockSetSession.mockResolvedValueOnce({ error: new AuthError("Invalid token", 401) });

    await procesarEnlaceAuth(
      `mibanda://auth/callback#access_token=${ACCESS}&refresh_token=${REFRESH}`,
      auth
    );
    await procesarEnlaceAuth(`mibanda://auth/callback#access_token=${ACCESS}`, auth);
    await procesarEnlaceAuth(`mibanda://auth/callback?code=${CODE}`, auth);

    for (const espia of espias) {
      expect(espia).not.toHaveBeenCalled();
      espia.mockRestore();
    }
  });
});

describe("esEnlaceCallbackAuth", () => {
  test("reconoce el callback de una build y de Expo Go", () => {
    expect(esEnlaceCallbackAuth("mibanda://auth/callback")).toBe(true);
    expect(esEnlaceCallbackAuth("mibanda:///auth/callback?code=x")).toBe(true);
    expect(esEnlaceCallbackAuth("exp://192.0.2.1:8081/--/auth/callback#a=b")).toBe(true);
  });

  test("no reconoce otras rutas", () => {
    expect(esEnlaceCallbackAuth("mibanda://")).toBe(false);
    expect(esEnlaceCallbackAuth("mibanda://tecnicos")).toBe(false);
    expect(esEnlaceCallbackAuth("/")).toBe(false);
  });
});
