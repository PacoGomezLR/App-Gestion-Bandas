// Enlaces de Google Maps de los eventos: qué se acepta y cómo se guarda.
// Toda la validación vive aquí; los componentes solo la usan.

// Mismo límite que la base (010)
const LONGITUD_MAXIMA = 2048;

// https://host + lo demás. El host termina en el primer / ? #: así ni un usuario
// (https://google.com@otro.com), ni un puerto, ni una barra invertida pueden
// disfrazar el destino. En la ruta sí se admite @ (google.com/maps/@37.1,-4.2,15z)
const FORMATO = /^https:\/\/([a-z0-9.-]+)([/?#]\S*)?$/i;

// Cualquier ruta: dominios que solo sirven Google Maps
const HOSTS_DE_MAPAS = new Set(["maps.app.goo.gl", "maps.google.com", "maps.google.es"]);

// Solo con la ruta /maps: el mismo dominio sirve también el buscador y más cosas
const HOSTS_CON_RUTA_MAPS = new Set(["google.com", "www.google.com", "google.es", "www.google.es"]);

// Enlaces cortos antiguos de Google Maps (goo.gl/maps/...)
const RUTA_MAPS = /^\/maps(?:[/?#]|$)/;

export function esEnlaceGoogleMapsValido(texto: string): boolean {
  const enlace = texto.trim();

  if (enlace === "") {
    return true;
  }

  if (enlace.length > LONGITUD_MAXIMA) {
    return false;
  }

  const partes = FORMATO.exec(enlace);

  if (partes === null) {
    return false;
  }

  const host = partes[1].toLowerCase();
  const resto = partes[2] ?? "";

  if (HOSTS_DE_MAPAS.has(host)) {
    return true;
  }

  if (HOSTS_CON_RUTA_MAPS.has(host)) {
    return RUTA_MAPS.test(resto);
  }

  return host === "goo.gl" && resto.startsWith("/maps/");
}

// Lo que se guarda: el enlace tal cual se pegó, solo sin espacios alrededor.
// Nunca se reescribe ni se le añaden parámetros
export function normalizarEnlaceGoogleMaps(texto: string): string | null {
  const enlace = texto.trim();

  return enlace === "" ? null : enlace;
}
