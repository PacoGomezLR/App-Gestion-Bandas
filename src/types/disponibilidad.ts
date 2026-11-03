// Día en que un integrante de la banda NO puede tocar.
// Sin registro para un día = disponible: nunca se guardan días disponibles.
export interface IndisponibilidadUsuario {
  readonly id: string;
  bandaId: string;
  usuarioId: string;
  // Formato interno YYYY-MM-DD, como en Evento
  fecha: string;
}

// Quién no está disponible un día, listo para mostrarse.
// nombres: los nombres visibles (o "Tú" si el usuario actual aún no tiene).
// sinNombre: otros integrantes que todavía no han puesto su nombre.
export interface ResumenNoDisponibles {
  total: number;
  nombres: string[];
  sinNombre: number;
}
