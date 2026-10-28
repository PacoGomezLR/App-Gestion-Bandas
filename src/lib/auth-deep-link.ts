import type { AuthError } from "@supabase/supabase-js";
import { URL, URLSearchParams } from "react-native-url-polyfill";

// Ruta a la que Supabase devuelve al usuario tras confirmar el correo
export const RUTA_CALLBACK_AUTH = "auth/callback";

export type ResultadoEnlaceAuth = "ignorado" | "sesion_establecida" | "error";

// Lo único que se necesita de supabase.auth: permite probar el helper sin cliente real
export interface ClienteAuthEnlace {
  setSession(tokens: {
    access_token: string;
    refresh_token: string;
  }): Promise<{ error: AuthError | null }>;
  exchangeCodeForSession(code: string): Promise<{ error: AuthError | null }>;
}

// Lee la URL una sola vez con un parser estándar; null si no es una URL válida
function leerUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

// mibanda://auth/callback (build) o exp://IP:PUERTO/--/auth/callback (Expo Go)
function esRutaCallback(destino: URL): boolean {
  const ruta = `${destino.host}${destino.pathname}`.replace(/^\/+|\/+$/g, "");

  return ruta === RUTA_CALLBACK_AUTH || ruta.endsWith(`/--/${RUTA_CALLBACK_AUTH}`);
}

export function esEnlaceCallbackAuth(url: string): boolean {
  const destino = leerUrl(url);

  return destino !== null && esRutaCallback(destino);
}

// Supabase envía los datos en la query (?code=) o en el fragmento (#access_token=)
function leerParametros(destino: URL): URLSearchParams {
  const parametros = new URLSearchParams(destino.search);
  const fragmento = new URLSearchParams(destino.hash.replace(/^#/, ""));

  fragmento.forEach((valor, clave) => {
    if (!parametros.has(clave)) {
      parametros.set(clave, valor);
    }
  });

  return parametros;
}

// Nunca registra la URL ni sus valores: contienen credenciales
export async function procesarEnlaceAuth(
  url: string,
  auth: ClienteAuthEnlace
): Promise<ResultadoEnlaceAuth> {
  const destino = leerUrl(url);

  if (destino === null || !esRutaCallback(destino)) {
    return "ignorado";
  }

  const parametros = leerParametros(destino);

  if (
    parametros.has("error") ||
    parametros.has("error_code") ||
    parametros.has("error_description")
  ) {
    return "error";
  }

  const code = parametros.get("code");
  const accessToken = parametros.get("access_token");
  const refreshToken = parametros.get("refresh_token");

  try {
    if (code) {
      const { error } = await auth.exchangeCodeForSession(code);
      return error ? "error" : "sesion_establecida";
    }

    if (accessToken === null && refreshToken === null) {
      return "ignorado";
    }

    // Un token sin el otro no permite una sesión válida
    if (!accessToken || !refreshToken) {
      return "error";
    }

    // La sesión llega a AuthContext por onAuthStateChange
    const { error } = await auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return error ? "error" : "sesion_establecida";
  } catch {
    return "error";
  }
}
