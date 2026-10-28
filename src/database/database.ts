import * as SQLite from "expo-sqlite";

const NOMBRE_BASE_DE_DATOS = "maestro.db";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (databasePromise === null) {
    databasePromise = SQLite.openDatabaseAsync(NOMBRE_BASE_DE_DATOS).catch(
      (error: unknown) => {
        // Si la apertura falla, se permite reintentar en la siguiente llamada
        databasePromise = null;
        throw error;
      }
    );
  }

  return databasePromise;
}
