import type { RolUsuario } from "./usuario";

export interface Banda {
  id: string;
  nombre: string;
  creadaPor: string;
  creadaEn: string;
}

// Lo único que se puede saber de otro integrante: su id y su nombre visible
// (nunca el email ni el rol). null = todavía no ha puesto nombre.
export interface IntegranteBanda {
  usuarioId: string;
  nombreVisible: string | null;
}

// Fila de banda_usuarios: los integrantes de una banda son sus usuarios.
// El rol solo decide permisos y no se muestra en la interfaz.
export interface PertenenciaBanda {
  bandaId: string;
  usuarioId: string;
  rol: RolUsuario;
  creadaEn: string;
}
