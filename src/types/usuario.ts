// Rol de una cuenta DENTRO de una banda (ver PertenenciaBanda); no es global
export type RolUsuario =
  | "admin"
  | "usuario";

// Cuenta que puede entrar en la aplicación; no es lo mismo que un Miembro de la banda
export interface PerfilUsuario {
  id: string;
  email: string;
}
