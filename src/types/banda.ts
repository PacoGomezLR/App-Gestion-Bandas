import type { RolUsuario } from "./usuario";

export interface Banda {
  id: string;
  nombre: string;
  creadaPor: string;
  creadaEn: string;
}

// Acceso de una cuenta a una banda; no es un Miembro musical
export interface PertenenciaBanda {
  bandaId: string;
  usuarioId: string;
  rol: RolUsuario;
  creadaEn: string;
}
