import type { SQLiteDatabase } from "expo-sqlite";

import { eventosIniciales } from "../data/eventosIniciales";
import { tecnicosIniciales } from "../data/tecnicosIniciales";
import { getDatabase } from "./database";

const VERSION_ESQUEMA = 5;

let inicializacionPromise: Promise<void> | null = null;

// Migración 1: crea las tablas
async function crearEsquemaInicial(db: SQLiteDatabase): Promise<void> {
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
  `);
}

async function contarFilas(
  db: SQLiteDatabase,
  tabla: "eventos" | "tecnicos"
): Promise<number> {
  const resultado = await db.getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) AS total FROM ${tabla};`
  );

  return resultado?.total ?? 0;
}

// Migración 2: inserta los datos de demostración solo si la base está vacía
async function insertarDatosDemostracion(db: SQLiteDatabase): Promise<void> {
  const totalEventos = await contarFilas(db, "eventos");
  const totalTecnicos = await contarFilas(db, "tecnicos");

  if (totalEventos > 0 || totalTecnicos > 0) {
    return;
  }

  for (const tecnico of tecnicosIniciales) {
    await db.runAsync(
      "INSERT INTO tecnicos (id, nombre) VALUES (?, ?);",
      tecnico.id,
      tecnico.nombre
    );
  }

  for (const evento of eventosIniciales) {
    await db.runAsync(
      "INSERT INTO eventos (id, titulo, tipo, fecha, estado) VALUES (?, ?, ?, ?, ?);",
      evento.id,
      evento.titulo,
      evento.tipo,
      evento.fecha,
      evento.estado
    );

    for (const tecnicoId of evento.tecnicoIds) {
      await db.runAsync(
        "INSERT INTO evento_tecnicos (evento_id, tecnico_id) VALUES (?, ?);",
        evento.id,
        tecnicoId
      );
    }
  }
}

// Migración 3: crea la tabla de miembros, vacía
async function crearTablaMiembros(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS miembros (
      id TEXT PRIMARY KEY NOT NULL,
      nombre TEXT NOT NULL
    );
  `);
}

// Migración 4: crea la relación evento-miembros, vacía
async function crearTablaEventoMiembros(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS evento_miembros (
      evento_id TEXT NOT NULL,
      miembro_id TEXT NOT NULL,
      PRIMARY KEY (evento_id, miembro_id),
      FOREIGN KEY (evento_id)
        REFERENCES eventos(id)
        ON DELETE CASCADE,
      FOREIGN KEY (miembro_id)
        REFERENCES miembros(id)
        ON DELETE RESTRICT
    );
  `);
}

// Migración 5: añade hora, lugar y notas a eventos; los existentes reciben ""
async function anadirDetallesEventos(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    ALTER TABLE eventos ADD COLUMN hora TEXT NOT NULL DEFAULT '';
    ALTER TABLE eventos ADD COLUMN lugar TEXT NOT NULL DEFAULT '';
    ALTER TABLE eventos ADD COLUMN notas TEXT NOT NULL DEFAULT '';
  `);
}

export async function migrarBaseDeDatos(): Promise<void> {
  const db = await getDatabase();

  // Ajustes de la conexión: deben ejecutarse fuera de las transacciones de migración
  await db.execAsync("PRAGMA journal_mode = WAL;");
  await db.execAsync("PRAGMA foreign_keys = ON;");

  const resultado = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version;"
  );

  if (resultado === null) {
    throw new Error("No se pudo leer la versión del esquema de la base de datos");
  }

  const versionActual = resultado.user_version;

  if (versionActual >= VERSION_ESQUEMA) {
    return;
  }

  // Cada migración y su versión se guardan juntas: si algo falla, se revierte esa migración entera
  if (versionActual < 1) {
    await db.withTransactionAsync(async () => {
      await crearEsquemaInicial(db);
      await db.execAsync("PRAGMA user_version = 1;");
    });
  }

  if (versionActual < 2) {
    await db.withTransactionAsync(async () => {
      await insertarDatosDemostracion(db);
      await db.execAsync("PRAGMA user_version = 2;");
    });
  }

  if (versionActual < 3) {
    await db.withTransactionAsync(async () => {
      await crearTablaMiembros(db);
      await db.execAsync("PRAGMA user_version = 3;");
    });
  }

  if (versionActual < 4) {
    await db.withTransactionAsync(async () => {
      await crearTablaEventoMiembros(db);
      await db.execAsync("PRAGMA user_version = 4;");
    });
  }

  if (versionActual < 5) {
    await db.withTransactionAsync(async () => {
      await anadirDetallesEventos(db);
      await db.execAsync("PRAGMA user_version = 5;");
    });
  }
}

export function inicializarBaseDeDatos(): Promise<void> {
  if (inicializacionPromise === null) {
    inicializacionPromise = migrarBaseDeDatos().catch((error: unknown) => {
      // Si falla, se permite reintentar en la siguiente llamada
      inicializacionPromise = null;
      throw error;
    });
  }

  return inicializacionPromise;
}
