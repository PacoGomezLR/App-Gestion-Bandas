// Motivo de un fallo de persistencia, sin detalles técnicos de PostgreSQL ni de RLS
export type MotivoErrorRepositorio = "en_uso" | "sin_permiso" | "desconocido";

export class ErrorRepositorio extends Error {
  readonly motivo: MotivoErrorRepositorio;

  constructor(motivo: MotivoErrorRepositorio) {
    super(`Operación de datos rechazada: ${motivo}`);
    this.name = "ErrorRepositorio";
    this.motivo = motivo;
  }
}

// Códigos de PostgreSQL / PostgREST que la app sabe interpretar
const MOTIVOS_POR_CODIGO: Record<string, MotivoErrorRepositorio> = {
  // foreign_key_violation: el registro sigue asignado a algún evento
  "23503": "en_uso",
  // insufficient_privilege: RLS o permisos de tabla
  "42501": "sin_permiso",
  // no_data_found: actualizar_evento no encontró el evento en esa banda
  P0002: "sin_permiso",
};

export function convertirErrorSupabase(error: { code?: string }): ErrorRepositorio {
  const motivo =
    error.code !== undefined ? MOTIVOS_POR_CODIGO[error.code] : undefined;

  return new ErrorRepositorio(motivo ?? "desconocido");
}

export function esErrorEnUso(error: unknown): boolean {
  return error instanceof ErrorRepositorio && error.motivo === "en_uso";
}
