import type { RolUsuario } from "./usuario";

export interface Banda {
  id: string;
  nombre: string;
  creadaPor: string;
  creadaEn: string;
}

// Fila de banda_usuarios: los integrantes de una banda son sus usuarios.
// El rol solo decide permisos y no se muestra en la interfaz.
export interface PertenenciaBanda {
  bandaId: string;
  usuarioId: string;
  rol: RolUsuario;
  creadaEn: string;
}
