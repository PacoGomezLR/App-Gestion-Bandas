import type { Miembro } from "../../types/miembro";
import { getDatabase } from "../database";

interface FilaMiembro {
  id: string;
  nombre: string;
}

export async function listarMiembros(): Promise<Miembro[]> {
  const db = await getDatabase();

  const filas = await db.getAllAsync<FilaMiembro>(
    "SELECT id, nombre FROM miembros ORDER BY nombre COLLATE NOCASE;"
  );

  return filas.map((fila) => ({
    id: fila.id,
    nombre: fila.nombre,
  }));
}

export async function guardarMiembro(miembro: Miembro): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `INSERT INTO miembros (id, nombre)
     VALUES (?, ?)
     ON CONFLICT(id)
     DO UPDATE SET nombre = excluded.nombre;`,
    miembro.id,
    miembro.nombre
  );
}

export async function eliminarMiembro(id: string): Promise<void> {
  const db = await getDatabase();

  await db.runAsync("DELETE FROM miembros WHERE id = ?;", id);
}
