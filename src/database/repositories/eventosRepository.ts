import type { EstadoEvento, Evento, TipoEvento } from "../../types/evento";
import { getDatabase } from "../database";

export interface FilaEvento {
  id: string;
  titulo: string;
  tipo: string;
  fecha: string;
  estado: string;
}

export interface FilaEventoTecnico {
  evento_id: string;
  tecnico_id: string;
}

// Record obliga a listar todos los valores de cada unión: si se añade uno al tipo, TypeScript avisa aquí
const TIPOS_EVENTO: Record<TipoEvento, true> = {
  concierto: true,
  ensayo: true,
  reunion: true,
  otro: true,
};

const ESTADOS_EVENTO: Record<EstadoEvento, true> = {
  pendiente: true,
  confirmado: true,
  cancelado: true,
};

export function esTipoEvento(valor: string): valor is TipoEvento {
  return Object.prototype.hasOwnProperty.call(TIPOS_EVENTO, valor);
}

export function esEstadoEvento(valor: string): valor is EstadoEvento {
  return Object.prototype.hasOwnProperty.call(ESTADOS_EVENTO, valor);
}

export function agruparTecnicoIdsPorEvento(
  relaciones: FilaEventoTecnico[]
): Map<string, string[]> {
  const tecnicoIdsPorEvento = new Map<string, string[]>();

  for (const relacion of relaciones) {
    const tecnicoIds = tecnicoIdsPorEvento.get(relacion.evento_id) ?? [];
    tecnicoIds.push(relacion.tecnico_id);
    tecnicoIdsPorEvento.set(relacion.evento_id, tecnicoIds);
  }

  return tecnicoIdsPorEvento;
}

export function convertirFilaAEvento(
  fila: FilaEvento,
  tecnicoIds: string[]
): Evento {
  if (!esTipoEvento(fila.tipo)) {
    throw new Error(`Tipo de evento no válido en la base de datos: ${fila.tipo}`);
  }

  if (!esEstadoEvento(fila.estado)) {
    throw new Error(`Estado de evento no válido en la base de datos: ${fila.estado}`);
  }

  return {
    id: fila.id,
    titulo: fila.titulo,
    tipo: fila.tipo,
    fecha: fila.fecha,
    estado: fila.estado,
    tecnicoIds,
  };
}

export function construirEventos(
  filas: FilaEvento[],
  relaciones: FilaEventoTecnico[]
): Evento[] {
  const tecnicoIdsPorEvento = agruparTecnicoIdsPorEvento(relaciones);

  return filas.map((fila) =>
    convertirFilaAEvento(fila, tecnicoIdsPorEvento.get(fila.id) ?? [])
  );
}

export async function listarEventos(): Promise<Evento[]> {
  const db = await getDatabase();

  const filas = await db.getAllAsync<FilaEvento>(
    "SELECT id, titulo, tipo, fecha, estado FROM eventos ORDER BY fecha, titulo;"
  );

  // rowid conserva el orden en que se guardaron las asignaciones
  const relaciones = await db.getAllAsync<FilaEventoTecnico>(
    "SELECT evento_id, tecnico_id FROM evento_tecnicos ORDER BY rowid;"
  );

  return construirEventos(filas, relaciones);
}

export async function guardarEvento(evento: Evento): Promise<void> {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    // ON CONFLICT ... DO UPDATE en lugar de INSERT OR REPLACE: REPLACE borraría la fila y dispararía el CASCADE
    await db.runAsync(
      `INSERT INTO eventos (id, titulo, tipo, fecha, estado)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id)
       DO UPDATE SET
         titulo = excluded.titulo,
         tipo = excluded.tipo,
         fecha = excluded.fecha,
         estado = excluded.estado;`,
      evento.id,
      evento.titulo,
      evento.tipo,
      evento.fecha,
      evento.estado
    );

    await db.runAsync(
      "DELETE FROM evento_tecnicos WHERE evento_id = ?;",
      evento.id
    );

    for (const tecnicoId of evento.tecnicoIds) {
      await db.runAsync(
        "INSERT INTO evento_tecnicos (evento_id, tecnico_id) VALUES (?, ?);",
        evento.id,
        tecnicoId
      );
    }
  });
}

export async function eliminarEvento(id: string): Promise<void> {
  const db = await getDatabase();

  // Las filas de evento_tecnicos de este evento se borran solas por ON DELETE CASCADE
  await db.runAsync("DELETE FROM eventos WHERE id = ?;", id);
}
