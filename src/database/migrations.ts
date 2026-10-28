import { getDatabase } from "./database";

const VERSION_ESQUEMA = 1;

export async function migrarBaseDeDatos(): Promise<void> {
  const db = await getDatabase();

  // Ajustes de la conexión: deben ejecutarse fuera de la transacción de migración
  await db.execAsync("PRAGMA journal_mode = WAL;");
  await db.execAsync("PRAGMA foreign_keys = ON;");

  const resultado = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version;"
  );

  if (resultado === null) {
    throw new Error("No se pudo leer la versión del esquema de la base de datos");
  }

  if (resultado.user_version >= VERSION_ESQUEMA) {
    return;
  }

  // El esquema y su versión se guardan juntos: si algo falla, se revierte todo
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS tecnicos (
        id TEXT PRIMARY KEY NOT NULL,
        nombre TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS eventos (
        id TEXT PRIMARY KEY NOT NULL,
        titulo TEXT NOT NULL,
        tipo TEXT NOT NULL,
        fecha TEXT NOT NULL,
        estado TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS evento_tecnicos (
        evento_id TEXT NOT NULL,
        tecnico_id TEXT NOT NULL,
        PRIMARY KEY (evento_id, tecnico_id),
        FOREIGN KEY (evento_id)
          REFERENCES eventos(id)
          ON DELETE CASCADE,
        FOREIGN KEY (tecnico_id)
          REFERENCES tecnicos(id)
          ON DELETE RESTRICT
      );

      PRAGMA user_version = ${VERSION_ESQUEMA};
    `);
  });
}
