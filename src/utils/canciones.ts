import type { Cancion, EstadoCancion } from "../types/cancion";

// Mismo límite que la base (011)
export const LONGITUD_MAXIMA_CANCION = 160;

// Orden en que se muestran los apartados
export const APARTADOS: readonly EstadoCancion[] = ["repertorio", "nueva"];

const ETIQUETAS_APARTADO: Record<EstadoCancion, string> = {
  repertorio: "Repertorio",
  nueva: "Canciones nuevas",
};

export function etiquetaApartado(estado: EstadoCancion): string {
  return ETIQUETAS_APARTADO[estado];
}

export type ResultadoNombreCancion =
  | { valido: true; nombre: string }
  | { valido: false; error: string };

// Solo se recorta: ni mayúsculas ni separar título y artista
export function validarNombreCancion(texto: string): ResultadoNombreCancion {
  const nombre = texto.trim();

  if (nombre === "") {
    return { valido: false, error: "Escribe el nombre de la canción" };
  }

  if (nombre.length > LONGITUD_MAXIMA_CANCION) {
    return {
      valido: false,
      error: `El nombre admite como máximo ${LONGITUD_MAXIMA_CANCION} caracteres`,
    };
  }

  return { valido: true, nombre };
}

// Alfabético en español, sin distinguir mayúsculas ni tildes y con los números en
// su orden (Años 9 antes que Años 80). El id desempata: el orden nunca baila
export function ordenarCanciones(canciones: readonly Cancion[]): Cancion[] {
  return [...canciones].sort(
    (a, b) =>
      a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base", numeric: true }) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
}

export function cancionesDe(canciones: readonly Cancion[], estado: EstadoCancion): Cancion[] {
  return ordenarCanciones(canciones.filter((cancion) => cancion.estado === estado));
}
