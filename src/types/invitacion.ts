import type { RolUsuario } from "./usuario";

// Lo que devuelve la base al consultar un enlace (consultar_invitacion_banda)
export type EstadoInvitacion = "valida" | "ya_miembro" | "caducada" | "usada" | "no_valida";

// Lo que devuelve la base al aceptar (aceptar_invitacion_banda)
export type ResultadoAceptacion = "aceptada" | "ya_miembro" | "caducada" | "usada" | "no_valida";

export interface ConsultaInvitacion {
  estado: EstadoInvitacion;
  // Solo si la invitación es válida o ya perteneces a esa banda
  bandaNombre: string | null;
}

export interface AceptacionInvitacion {
  resultado: ResultadoAceptacion;
  bandaId: string | null;
  bandaNombre: string | null;
}

// El token solo viaja en el enlace: nunca se guarda en disco ni se muestra
export interface InvitacionCreada {
  token: string;
  // ISO 8601, como lo devuelve la base
  expiraEn: string;
  rol: RolUsuario;
}
