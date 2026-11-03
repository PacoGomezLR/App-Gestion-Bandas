import { supabase } from "../../lib/supabase";
import type { IndisponibilidadUsuario } from "../../types/disponibilidad";
import { convertirErrorSupabase, ErrorRepositorio } from "./errores";

export const COLUMNAS_INDISPONIBILIDAD = "id, banda_id, usuario_id, fecha";

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export interface RepositorioDisponibilidad {
  // Indisponibilidades de TODOS los integrantes de la banda
  listar: () => Promise<IndisponibilidadUsuario[]>;
  // Siempre para el usuario actual: no se puede marcar el día de otra persona
  marcarNoDisponible: (fecha: string) => Promise<IndisponibilidadUsuario>;
  // Solo borra si la indisponibilidad es del usuario actual
  desmarcar: (id: string) => Promise<void>;
}

export function convertirFilaIndisponibilidad(fila: unknown): IndisponibilidadUsuario {
  if (typeof fila !== "object" || fila === null) {
    throw new Error("Indisponibilidad no válida");
  }

  const { id, banda_id, usuario_id, fecha } = fila as Record<string, unknown>;

  if (
    typeof id !== "string" ||
    typeof banda_id !== "string" ||
    typeof usuario_id !== "string" ||
    typeof fecha !== "string" ||
    !FORMATO_FECHA.test(fecha)
  ) {
    throw new Error("Indisponibilidad no válida");
  }

  return { id, bandaId: banda_id, usuarioId: usuario_id, fecha };
}

// La respuesta de Supabase no está tipada: cualquier fila incorrecta invalida la carga
export function convertirFilasIndisponibilidad(filas: unknown): IndisponibilidadUsuario[] {
  if (!Array.isArray(filas)) {
    throw new Error("Respuesta de disponibilidad no válida");
  }

  return filas.map(convertirFilaIndisponibilidad);
}

// Banda y usuario quedan fijados al crear el repositorio. La RLS del servidor
// exige además usuario_id = auth.uid() para escribir, también a un admin.
// Marcar = insertar, desmarcar = borrar: no hay nada que actualizar.
export function crearRepositorioDisponibilidadSupabase(
  bandaId: string,
  usuarioId: string
): RepositorioDisponibilidad {
  return {
    async listar() {
      const { data, error } = await supabase
        .from("indisponibilidades_usuario")
        .select(COLUMNAS_INDISPONIBILIDAD)
        .eq("banda_id", bandaId)
        .order("fecha");

      if (error) {
        throw convertirErrorSupabase(error);
      }

      return convertirFilasIndisponibilidad(data);
    },

    async marcarNoDisponible(fecha) {
      const { data, error } = await supabase
        .from("indisponibilidades_usuario")
        .insert({ banda_id: bandaId, usuario_id: usuarioId, fecha })
        .select(COLUMNAS_INDISPONIBILIDAD);

      if (error) {
        throw convertirErrorSupabase(error);
      }

      // Una escritura que la RLS descarta no da error: simplemente no devuelve filas
      if (!Array.isArray(data) || data.length === 0) {
        throw new ErrorRepositorio("sin_permiso");
      }

      return convertirFilaIndisponibilidad(data[0]);
    },

    async desmarcar(id) {
      const { data, error } = await supabase
        .from("indisponibilidades_usuario")
        .delete()
        .eq("id", id)
        .eq("banda_id", bandaId)
        .eq("usuario_id", usuarioId)
        .select("id");

      if (error) {
        throw convertirErrorSupabase(error);
      }

      if (!Array.isArray(data) || data.length === 0) {
        throw new ErrorRepositorio("sin_permiso");
      }
    },
  };
}
