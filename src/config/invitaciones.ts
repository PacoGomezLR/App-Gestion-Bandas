import { URL } from "react-native-url-polyfill";

// Origen HTTPS de los enlaces de invitación. El valor viene de
// EXPO_PUBLIC_INVITE_BASE_URL (ver lib/invitacion-deep-link):
// - ausente o vacío: desarrollo, se comparte el enlace mibanda:// de siempre
// - válido: https://dominio
// - definido pero no válido: error de configuración; no se comparte ningún
//   enlace (nunca un mibanda:// silencioso en su lugar)
export type OrigenInvitaciones =
  | { tipo: "ausente" }
  | { tipo: "valido"; origen: string }
  | { tipo: "invalido" };

// Solo se acepta un origen: https, un host con dominio, sin puerto, usuario,
// ruta, query ni fragmento. Así nunca va un token ni una ruta incrustada y el
// enlace final es siempre <origen>/invitacion?token=...
export function obtenerOrigenInvitaciones(valor: string | undefined): OrigenInvitaciones {
  const limpio = valor?.trim() ?? "";

  if (limpio === "") {
    return { tipo: "ausente" };
  }

  let base: URL;
  try {
    base = new URL(limpio);
  } catch {
    return { tipo: "invalido" };
  }

  const host = base.hostname.toLowerCase();
  const esOrigen =
    base.protocol === "https:" &&
    host.includes(".") &&
    !host.startsWith(".") &&
    !host.endsWith(".") &&
    // Un dominio, no una IP (App Links verifica el dominio con assetlinks.json)
    !/^[\d.]+$/.test(host) &&
    base.port === "" &&
    base.username === "" &&
    base.password === "" &&
    (base.pathname === "" || base.pathname === "/") &&
    base.search === "" &&
    base.hash === "" &&
    // new URL acepta "https:dominio" o "https:/dominio": se exige la forma completa
    limpio.toLowerCase().startsWith("https://");

  return esOrigen ? { tipo: "valido", origen: `https://${host}` } : { tipo: "invalido" };
}
