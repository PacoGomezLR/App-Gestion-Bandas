import type { Tecnico } from "../../types/tecnico";
import { getDatabase } from "../database";

interface FilaTecnico {
  id: string;
  nombre: string;
}

export async function listarTecnicos(): Promise<Tecnico[]> {
  const db = await getDatabase();

  const filas = await db.getAllAsync<FilaTecnico>(
    "SELECT id, nombre FROM tecnicos ORDER BY nombre COLLATE NOCASE;"
  );

  return filas.map((fila) => ({
    id: fila.id,
    nombre: fila.nombre,
  }));
}

export async function guardarTecnico(tecnico: Tecnico): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `INSERT INTO tecnicos (id, nombre)
     VALUES (?, ?)
     ON CONFLICT(id)
     DO UPDATE SET nombre = excluded.nombre;`,
    tecnico.id,
    tecnico.nombre
  );
}

export async function eliminarTecnico(id: string): Promise<void> {
  const db = await getDatabase();

  // Si el técnico está asignado a algún evento, la clave foránea (RESTRICT) rechaza el borrado
  await db.runAsync("DELETE FROM tecnicos WHERE id = ?;", id);
}
