import { supabase } from "../../lib/supabase";
import type {
  AceptacionInvitacion,
  ConsultaInvitacion,
  EstadoInvitacion,
  InvitacionCreada,
  ResultadoAceptacion,
} from "../../types/invitacion";
import type { RolUsuario } from "../../types/usuario";
import { convertirErrorSupabase } from "./errores";

// Record obliga a listar todos los valores: si la base añade uno, TypeScript avisa aquí
const ESTADOS: Record<EstadoInvitacion, true> = {
  valida: true,
  ya_miembro: true,
  caducada: true,
  usada: true,
  no_valida: true,
};

const RESULTADOS: Record<ResultadoAceptacion, true> = {
  aceptada: true,
  ya_miembro: true,
  caducada: true,
  usada: true,
  no_valida: true,
};

function primeraFila(data: unknown): Record<string, unknown> {
  const fila: unknown = Array.isArray(data) ? data[0] : data;

  if (typeof fila !== "object" || fila === null) {
    throw new Error("Respuesta de invitación no válida");
  }

  return fila as Record<string, unknown>;
}

function textoOpcional(valor: unknown): string | null {
  if (valor === null || valor === undefined) {
    return null;
  }

  if (typeof valor !== "string") {
    throw new Error("Respuesta de invitación no válida");
  }

  return valor;
}

// Solo un admin de esa banda puede (lo comprueba la función en la base).
// creada_por, el token y la caducidad los decide la base, no la app.
export async function crearInvitacionBanda(
  bandaId: string,
  rol: RolUsuario
): Promise<InvitacionCreada> {
  const { data, error } = await supabase.rpc("crear_invitacion_banda", {
    p_banda_id: bandaId,
    p_rol: rol,
  });

  if (error) {
    throw convertirErrorSupabase(error);
  }

  const { token, expires_at } = primeraFila(data);

  if (typeof token !== "string" || typeof expires_at !== "string") {
    throw new Error("Respuesta de invitación no válida");
  }

  return { token, expiraEn: expires_at, rol };
}

export async function consultarInvitacionBanda(token: string): Promise<ConsultaInvitacion> {
  const { data, error } = await supabase.rpc("consultar_invitacion_banda", { p_token: token });

  if (error) {
    throw convertirErrorSupabase(error);
  }

  const { estado, banda_nombre } = primeraFila(data);

  if (typeof estado !== "string" || !Object.prototype.hasOwnProperty.call(ESTADOS, estado)) {
    throw new Error("Respuesta de invitación no válida");
  }

  return { estado: estado as EstadoInvitacion, bandaNombre: textoOpcional(banda_nombre) };
}

// Sin parámetro de rol: la base usa el rol guardado en la invitación
export async function aceptarInvitacionBanda(token: string): Promise<AceptacionInvitacion> {
  const { data, error } = await supabase.rpc("aceptar_invitacion_banda", { p_token: token });

  if (error) {
    throw convertirErrorSupabase(error);
  }

  const { resultado, banda_id, banda_nombre } = primeraFila(data);

  if (
    typeof resultado !== "string" ||
    !Object.prototype.hasOwnProperty.call(RESULTADOS, resultado)
  ) {
    throw new Error("Respuesta de invitación no válida");
  }

  return {
    resultado: resultado as ResultadoAceptacion,
    bandaId: textoOpcional(banda_id),
    bandaNombre: textoOpcional(banda_nombre),
  };
}
