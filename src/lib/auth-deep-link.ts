import type { AuthError } from "@supabase/supabase-js";
import { URL, URLSearchParams } from "react-native-url-polyfill";

// Ruta a la que Supabase devuelve al usuario tras confirmar el correo
export const RUTA_CALLBACK_AUTH = "auth/callback";

// recuperacion: sesión establecida desde un enlace de «restablecer contraseña»
// (type=recovery). Con flujo implícito y detectSessionInUrl desactivado,
// Supabase no emite PASSWORD_RECOVERY: hay que leerlo del enlace
export type ResultadoEnlaceAuth = "ignorado" | "sesion_establecida" | "recuperacion" | "error";

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

// mibanda://auth/callback (build), exp://IP:PUERTO/--/auth/callback (Expo Go) o
// https://dominio/auth/callback (web: la URL de la propia página, el host no es
// parte de la ruta)
function esRutaCallback(destino: URL): boolean {
  if (destino.protocol === "https:" || destino.protocol === "http:") {
    return destino.pathname.replace(/^\/+|\/+$/g, "") === RUTA_CALLBACK_AUTH;
  }

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

// Parámetros del enlace de callback, o null si no es un callback de auth
function parametrosCallback(url: string): URLSearchParams | null {
  const destino = leerUrl(url);

  return destino !== null && esRutaCallback(destino) ? leerParametros(destino) : null;
}

function tieneError(parametros: URLSearchParams): boolean {
  return (
    parametros.has("error") || parametros.has("error_code") || parametros.has("error_description")
  );
}

// Enlace de «restablecer contraseña» sin error: se sabe antes de establecer la
// sesión, así la app no llega a enseñar sus pantallas con esa sesión
export function esEnlaceRecuperacion(url: string): boolean {
  const parametros = parametrosCallback(url);

  return parametros !== null && !tieneError(parametros) && parametros.get("type") === "recovery";
}

// Enlace caducado o ya usado (confirmación o recuperación): Supabase devuelve
// error_code=otp_expired sin decir de qué tipo era
export function esEnlaceCaducado(url: string): boolean {
  return parametrosCallback(url)?.get("error_code") === "otp_expired";
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

  if (tieneError(parametros)) {
    return "error";
  }

  const exito: ResultadoEnlaceAuth =
    parametros.get("type") === "recovery" ? "recuperacion" : "sesion_establecida";

  const code = parametros.get("code");
  const accessToken = parametros.get("access_token");
  const refreshToken = parametros.get("refresh_token");

  try {
    if (code) {
      const { error } = await auth.exchangeCodeForSession(code);
      return error ? "error" : exito;
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
    return error ? "error" : exito;
  } catch {
    return "error";
  }
}
