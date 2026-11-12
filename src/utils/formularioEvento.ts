import type { EstadoEvento, Evento, TipoEvento } from "../types/evento";
import { importeParaFormulario } from "./dinero";
import { normalizarEnlaceGoogleMaps } from "./googleMaps";

// Lo que hay escrito en el formulario de evento
export interface ValoresFormularioEvento {
  tipo: TipoEvento | null;
  estado: EstadoEvento;
  fecha: string;
  hora: string;
  lugar: string;
  notas: string;
  googleMapsUrl: string;
  tecnicoIds: string[];
  // null = el caché no se ha tocado
  cacheEscrito: string | null;
}

function mismosTecnicos(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}

// ¿Se perdería algo al salir sin guardar? Se compara con lo que se guardaría,
// no con las pulsaciones: un espacio al final o marcar y desmarcar un técnico
// no cuentan como cambio.
// - Nuevo (original null): cualquier dato escrito o elegido. La fecha no cuenta:
//   es el día del calendario desde el que se abrió.
// - Edición: cualquier diferencia con el evento guardado, incluido el caché
//   (cacheOriginal es el guardado; undefined = sin caché).
export function hayCambiosEvento(
  valores: ValoresFormularioEvento,
  original: Evento | null,
  cacheOriginal?: number
): boolean {
  const cacheEscrito = valores.cacheEscrito?.trim() ?? null;

  if (original === null) {
    return (
      valores.tipo !== null ||
      valores.estado !== "pendiente" ||
      valores.hora.trim() !== "" ||
      valores.lugar.trim() !== "" ||
      valores.notas.trim() !== "" ||
      valores.googleMapsUrl.trim() !== "" ||
      valores.tecnicoIds.length > 0 ||
      (cacheEscrito !== null && cacheEscrito !== "")
    );
  }

  const cacheGuardado = cacheOriginal === undefined ? "" : importeParaFormulario(cacheOriginal);

  return (
    valores.tipo !== original.tipo ||
    valores.estado !== original.estado ||
    valores.fecha !== original.fecha ||
    valores.hora.trim() !== original.hora ||
    valores.lugar.trim() !== original.lugar ||
    valores.notas.trim() !== original.notas ||
    normalizarEnlaceGoogleMaps(valores.googleMapsUrl) !== original.googleMapsUrl ||
    !mismosTecnicos(valores.tecnicoIds, original.tecnicoIds) ||
    (cacheEscrito !== null && cacheEscrito !== cacheGuardado)
  );
}
