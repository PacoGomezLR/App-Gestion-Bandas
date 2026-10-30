import type { EstadoEvento, Evento, TipoEvento } from "../../types/evento";
import { ESTADOS_EVENTO } from "../../utils/estadosEvento";
import { TIPOS_EVENTO } from "../../utils/tiposEvento";

// Lo que se envía al crear: el id lo genera la base de datos
export type DatosEvento = Omit<Evento, "id">;

// Evento con sus asignaciones embebidas (una sola consulta, sin N+1).
// LEGADO TEMPORAL: evento_miembros solo se lee para no perder esas filas al
// editar (ver eventos.ts). La app ya no usa músicos; desaparece con la migración 003.
export const COLUMNAS_EVENTO =
  "id, titulo, tipo, fecha, hora, lugar, notas, estado, evento_miembros (miembro_id, orden), evento_tecnicos (tecnico_id, orden)";

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
// time de PostgreSQL: HH:MM:SS (con fracción opcional)
const FORMATO_HORA_BASE = /^(\d{2}):(\d{2})(:\d{2}(\.\d+)?)?$/;

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null;
}

function esTipoEvento(valor: unknown): valor is TipoEvento {
  return typeof valor === "string" && (TIPOS_EVENTO as readonly string[]).includes(valor);
}

function esEstadoEvento(valor: unknown): valor is EstadoEvento {
  return typeof valor === "string" && (ESTADOS_EVENTO as readonly string[]).includes(valor);
}

// null → "" y "20:30:00" → "20:30": la interfaz solo conoce "" o HH:MM
export function convertirHoraDeBase(valor: unknown): string {
  if (valor === null || valor === undefined) {
    return "";
  }

  if (typeof valor !== "string") {
    throw new Error("Hora de evento no válida");
  }

  const coincidencia = FORMATO_HORA_BASE.exec(valor);

  if (coincidencia === null) {
    throw new Error("Hora de evento no válida");
  }

  return `${coincidencia[1]}:${coincidencia[2]}`;
}

// date de PostgreSQL ya llega como YYYY-MM-DD: se comprueba, no se transforma
export function convertirFechaDeBase(valor: unknown): string {
  if (typeof valor !== "string" || !FORMATO_FECHA.test(valor)) {
    throw new Error("Fecha de evento no válida");
  }

  return valor;
}

// Ids de una relación embebida, en el orden en que se asignaron
function convertirAsignaciones(valor: unknown, columnaId: string): string[] {
  if (!Array.isArray(valor)) {
    throw new Error("Asignaciones de evento no válidas");
  }

  return valor
    .map((asignacion: unknown) => {
      if (!esObjeto(asignacion)) {
        throw new Error("Asignación de evento no válida");
      }

      const id = asignacion[columnaId];
      const { orden } = asignacion;

      if (typeof id !== "string" || typeof orden !== "number") {
        throw new Error("Asignación de evento no válida");
      }

      return { id, orden };
    })
    .sort((a, b) => a.orden - b.orden)
    .map(({ id }) => id);
}

function textoOVacio(valor: unknown): string {
  if (valor === null || valor === undefined) {
    return "";
  }

  if (typeof valor !== "string") {
    throw new Error("Texto de evento no válido");
  }

  return valor;
}

export function convertirFilaEvento(fila: unknown): Evento {
  if (!esObjeto(fila)) {
    throw new Error("Evento no válido");
  }

  const { id, titulo, tipo, estado } = fila;

  if (typeof id !== "string" || typeof titulo !== "string") {
    throw new Error("Evento no válido");
  }

  if (!esTipoEvento(tipo)) {
    throw new Error("Tipo de evento no válido");
  }

  if (!esEstadoEvento(estado)) {
    throw new Error("Estado de evento no válido");
  }

  return {
    id,
    titulo,
    tipo,
    fecha: convertirFechaDeBase(fila.fecha),
    hora: convertirHoraDeBase(fila.hora),
    lugar: textoOVacio(fila.lugar),
    notas: textoOVacio(fila.notas),
    estado,
    tecnicoIds: convertirAsignaciones(fila.evento_tecnicos, "tecnico_id"),
  };
}

// Eventos de la app y, aparte, los ids de músicos heredados de cada evento.
// Los músicos heredados nunca entran en Evento: solo los usa el repositorio.
export interface FilasEventosConvertidas {
  eventos: Evento[];
  miembrosLegadoPorEvento: Map<string, string[]>;
}

// La respuesta de Supabase no está tipada: cualquier fila incorrecta invalida la carga
export function convertirFilasEventos(filas: unknown): FilasEventosConvertidas {
  if (!Array.isArray(filas)) {
    throw new Error("Respuesta de eventos no válida");
  }

  const eventos = filas.map(convertirFilaEvento);
  const miembrosLegadoPorEvento = new Map<string, string[]>();

  filas.forEach((fila: unknown, indice) => {
    const legado = esObjeto(fila)
      ? convertirAsignaciones(fila.evento_miembros ?? [], "miembro_id")
      : [];

    if (legado.length > 0) {
      miembrosLegadoPorEvento.set(eventos[indice].id, legado);
    }
  });

  return { eventos, miembrosLegadoPorEvento };
}

// Parámetros comunes de crear_evento y actualizar_evento. La hora viaja
// como texto ("" = sin hora) para no convertirla nunca con zona horaria.
// COMPATIBILIDAD TEMPORAL: las RPC de 002 aún exigen p_miembro_ids y
// actualizar_evento reescribe evento_miembros con él. Por eso se reenvían los
// ids heredados del evento (o [] al crear). No es una funcionalidad visible.
export function convertirDatosEventoAParametros(
  bandaId: string,
  datos: DatosEvento,
  miembroIdsLegado: readonly string[] = []
) {
  return {
    p_banda_id: bandaId,
    p_titulo: datos.titulo,
    p_tipo: datos.tipo,
    p_fecha: datos.fecha,
    p_hora: datos.hora,
    p_lugar: datos.lugar,
    p_notas: datos.notas,
    p_estado: datos.estado,
    p_miembro_ids: [...miembroIdsLegado],
    p_tecnico_ids: [...datos.tecnicoIds],
  };
}
