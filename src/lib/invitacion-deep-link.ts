import * as Linking from "expo-linking";
import { URL } from "react-native-url-polyfill";

import { obtenerOrigenInvitaciones, type OrigenInvitaciones } from "../config/invitaciones";

// Ruta propia de las invitaciones. Distinta de auth/callback: los dos flujos
// no se mezclan (el token de invitación nunca va en un enlace de Supabase Auth).
export const RUTA_INVITACION = "invitacion";

// Scheme de la app (expo.scheme en app.json). Solo para el botón «Abrir MI
// Banda» de la página web: lo que se comparte es el enlace https.
export const ESQUEMA_APP = "mibanda";

// El token lo genera la base: 32 bytes en hexadecimal
const FORMATO_TOKEN = /^[0-9a-f]{64}$/;

// EXPO_PUBLIC_INVITE_BASE_URL definida pero no válida. El mensaje es para
// personas; el detalle (qué valor falla) no se muestra.
export class ErrorConfiguracionInvitacion extends Error {
  constructor() {
    super("No se ha podido preparar el enlace de invitación.");
    this.name = "ErrorConfiguracionInvitacion";
  }
}

export function esTokenInvitacion(valor: unknown): valor is string {
  return typeof valor === "string" && FORMATO_TOKEN.test(valor);
}

// Acceso directo a process.env.EXPO_PUBLIC_*: Expo solo sustituye este patrón al compilar
function origenConfigurado(): OrigenInvitaciones {
  return obtenerOrigenInvitaciones(process.env.EXPO_PUBLIC_INVITE_BASE_URL);
}

// Para avisar antes de crear una invitación que no se podría compartir
export function comprobarConfiguracionInvitaciones(): void {
  if (origenConfigurado().tipo === "invalido") {
    throw new ErrorConfiguracionInvitacion();
  }
}

// El enlace que se comparte:
// - con origen válido: https://dominio/invitacion?token=... (pulsable en
//   WhatsApp, correo, SMS...)
// - sin configurar (desarrollo): mibanda://invitacion?token=... en una build y
//   exp://.../--/invitacion?token=... en Expo Go
// - configuración no válida: ErrorConfiguracionInvitacion
export function crearEnlaceInvitacion(token: string): string {
  const configuracion = origenConfigurado();

  if (configuracion.tipo === "invalido") {
    throw new ErrorConfiguracionInvitacion();
  }

  if (configuracion.tipo === "valido") {
    return `${configuracion.origen}/${RUTA_INVITACION}?token=${encodeURIComponent(token)}`;
  }

  return Linking.createURL(RUTA_INVITACION, { queryParams: { token } });
}

// mibanda://invitacion?token=... para abrir la app desde la página web, o null
// si el token no tiene el formato esperado
export function crearEnlaceAppInvitacion(token: unknown): string | null {
  return esTokenInvitacion(token) ? `${ESQUEMA_APP}://${RUTA_INVITACION}?token=${token}` : null;
}

function leerUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function sinBarras(ruta: string): string {
  return ruta.replace(/^\/+|\/+$/g, "");
}

// https solo del origen configurado y con la ruta exacta; el scheme de la app
// (mibanda://invitacion) y Expo Go (exp://.../--/invitacion) como hasta ahora
function esRutaInvitacion(destino: URL): boolean {
  if (destino.protocol === "https:" || destino.protocol === "http:") {
    const configuracion = origenConfigurado();

    return (
      configuracion.tipo === "valido" &&
      `${destino.protocol}//${destino.host}` === configuracion.origen &&
      sinBarras(destino.pathname) === RUTA_INVITACION
    );
  }

  const ruta = sinBarras(`${destino.host}${destino.pathname}`);

  return ruta === RUTA_INVITACION || ruta.endsWith(`/--/${RUTA_INVITACION}`);
}

export function esEnlaceInvitacion(url: string): boolean {
  const destino = leerUrl(url);

  return destino !== null && esRutaInvitacion(destino);
}

// Para +native-intent: el sistema puede pasar la URL completa o solo la ruta
// (/invitacion?token=...). El token lo lee siempre InvitacionPendienteContext
// de la URL completa con extraerTokenInvitacion.
export function esRutaSistemaInvitacion(ruta: string): boolean {
  if (esEnlaceInvitacion(ruta)) {
    return true;
  }

  return !ruta.includes("://") && sinBarras(ruta.split(/[?#]/)[0]) === RUTA_INVITACION;
}

// El token del enlace, o null si no es un enlace de invitación con un token con
// el formato esperado. Nunca registra la URL: el token da acceso a una banda.
export function extraerTokenInvitacion(url: string): string | null {
  const destino = leerUrl(url);

  if (destino === null || !esRutaInvitacion(destino)) {
    return null;
  }

  const token = destino.searchParams.get("token");

  return esTokenInvitacion(token) ? token : null;
}
