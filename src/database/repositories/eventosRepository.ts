import type { EstadoEvento, Evento, TipoEvento } from "../../types/evento";
import { getDatabase } from "../database";

export interface FilaEvento {
  id: string;
  titulo: string;
  tipo: string;
  fecha: string;
  hora: string;
  lugar: string;
  notas: string;
  estado: string;
}

export interface FilaEventoTecnico {
  evento_id: string;
  tecnico_id: string;
}

export interface FilaEventoMiembro {
  evento_id: string;
  miembro_id: string;
}

// Record obliga a listar todos los valores de cada unión: si se añade uno al tipo, TypeScript avisa aquí
const TIPOS_EVENTO: Record<TipoEvento, true> = {
  boda: true,
  fiesta_privada: true,
  concierto_abierto: true,
  ensayo: true,
  otro: true,
};

const ESTADOS_EVENTO: Record<EstadoEvento, true> = {
  pendiente: true,
  confirmado: true,
};

export function esTipoEvento(valor: string): valor is TipoEvento {
  return Object.prototype.hasOwnProperty.call(TIPOS_EVENTO, valor);
}

export function esEstadoEvento(valor: string): valor is EstadoEvento {
  return Object.prototype.hasOwnProperty.call(ESTADOS_EVENTO, valor);
}

function agruparIdsPorEvento<Relacion extends { evento_id: string }>(
  relaciones: Relacion[],
  obtenerId: (relacion: Relacion) => string
): Map<string, string[]> {
  const idsPorEvento = new Map<string, string[]>();

  for (const relacion of relaciones) {
    const ids = idsPorEvento.get(relacion.evento_id) ?? [];
    ids.push(obtenerId(relacion));
    idsPorEvento.set(relacion.evento_id, ids);
  }

  return idsPorEvento;
}

export function agruparTecnicoIdsPorEvento(
  relaciones: FilaEventoTecnico[]
): Map<string, string[]> {
  return agruparIdsPorEvento(relaciones, (relacion) => relacion.tecnico_id);
}

export function agruparMiembroIdsPorEvento(
  relaciones: FilaEventoMiembro[]
): Map<string, string[]> {
  return agruparIdsPorEvento(relaciones, (relacion) => relacion.miembro_id);
}

export function convertirFilaAEvento(
  fila: FilaEvento,
  tecnicoIds: string[],
  miembroIds: string[]
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
    hora: fila.hora,
    lugar: fila.lugar,
    notas: fila.notas,
    estado: fila.estado,
    tecnicoIds,
    miembroIds,
  };
}

export function construirEventos(
  filas: FilaEvento[],
  relacionesTecnicos: FilaEventoTecnico[],
  relacionesMiembros: FilaEventoMiembro[]
): Evento[] {
  const tecnicoIdsPorEvento = agruparTecnicoIdsPorEvento(relacionesTecnicos);
  const miembroIdsPorEvento = agruparMiembroIdsPorEvento(relacionesMiembros);

  return filas.map((fila) =>
    convertirFilaAEvento(
      fila,
      tecnicoIdsPorEvento.get(fila.id) ?? [],
      miembroIdsPorEvento.get(fila.id) ?? []
    )
  );
}

export async function listarEventos(): Promise<Evento[]> {
  const db = await getDatabase();

  const filas = await db.getAllAsync<FilaEvento>(
    "SELECT id, titulo, tipo, fecha, hora, lugar, notas, estado FROM eventos ORDER BY fecha, titulo;"
  );

  // rowid conserva el orden en que se guardaron las asignaciones
  const relacionesTecnicos = await db.getAllAsync<FilaEventoTecnico>(
    "SELECT evento_id, tecnico_id FROM evento_tecnicos ORDER BY rowid;"
  );

  const relacionesMiembros = await db.getAllAsync<FilaEventoMiembro>(
    "SELECT evento_id, miembro_id FROM evento_miembros ORDER BY rowid;"
  );

  return construirEventos(filas, relacionesTecnicos, relacionesMiembros);
}

export async function guardarEvento(evento: Evento): Promise<void> {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    // ON CONFLICT ... DO UPDATE en lugar de INSERT OR REPLACE: REPLACE borraría la fila y dispararía el CASCADE
    await db.runAsync(
      `INSERT INTO eventos (id, titulo, tipo, fecha, hora, lugar, notas, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id)
       DO UPDATE SET
         titulo = excluded.titulo,
         tipo = excluded.tipo,
         fecha = excluded.fecha,
         hora = excluded.hora,
         lugar = excluded.lugar,
         notas = excluded.notas,
         estado = excluded.estado;`,
      evento.id,
      evento.titulo,
      evento.tipo,
      evento.fecha,
      evento.hora,
      evento.lugar,
      evento.notas,
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

    await db.runAsync(
      "DELETE FROM evento_miembros WHERE evento_id = ?;",
      evento.id
    );

    for (const miembroId of evento.miembroIds) {
      await db.runAsync(
        "INSERT INTO evento_miembros (evento_id, miembro_id) VALUES (?, ?);",
        evento.id,
        miembroId
      );
    }
  });
}

export async function eliminarEvento(id: string): Promise<void> {
  const db = await getDatabase();

  // Las filas de evento_tecnicos y evento_miembros de este evento se borran solas por ON DELETE CASCADE
  await db.runAsync("DELETE FROM eventos WHERE id = ?;", id);
}
