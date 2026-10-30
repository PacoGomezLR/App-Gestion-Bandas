// Rol de una cuenta DENTRO de una banda (ver PertenenciaBanda); no es global
export type RolUsuario =
  | "admin"
  | "usuario";

// Cuenta que puede entrar en la aplicación; con una PertenenciaBanda es integrante de esa banda
export interface PerfilUsuario {
  id: string;
  email: string;
}
