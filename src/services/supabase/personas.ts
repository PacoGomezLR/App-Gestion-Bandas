import { supabase } from "../../lib/supabase";
import type { Tecnico } from "../../types/tecnico";
import { convertirErrorSupabase, ErrorRepositorio } from "./errores";

// Registros de banda con la forma (id, nombre); hoy solo los usan los técnicos
interface ConNombre {
  readonly id: string;
  nombre: string;
}

export interface RepositorioConNombre<T extends ConNombre> {
  listar: () => Promise<T[]>;
  crear: (nombre: string) => Promise<T>;
  actualizar: (registro: T) => Promise<T>;
  eliminar: (id: string) => Promise<void>;
}

type TablaConNombre = "tecnicos";

function convertirFila(fila: unknown): ConNombre {
  if (typeof fila !== "object" || fila === null) {
    throw new Error("Registro no válido");
  }

  const { id, nombre } = fila as Record<string, unknown>;

  if (typeof id !== "string" || typeof nombre !== "string") {
    throw new Error("Registro no válido");
  }

  return { id, nombre };
}

// Una escritura que la RLS descarta no da error: simplemente no devuelve filas
function convertirFilaEscrita(data: unknown): ConNombre {
  if (!Array.isArray(data) || data.length === 0) {
    throw new ErrorRepositorio("sin_permiso");
  }

  return convertirFila(data[0]);
}

// La banda queda fijada al crear el repositorio. Toda consulta lleva
// banda_id además de la RLS del servidor.
function crearRepositorioConNombre(
  tabla: TablaConNombre,
  bandaId: string
): RepositorioConNombre<ConNombre> {
  return {
    async listar() {
      const { data, error } = await supabase
        .from(tabla)
        .select("id, nombre")
        .eq("banda_id", bandaId)
        .order("nombre");

      if (error) {
        throw convertirErrorSupabase(error);
      }

      if (!Array.isArray(data)) {
        throw new Error("Respuesta no válida");
      }

      return data.map(convertirFila);
    },

    async crear(nombre) {
      const { data, error } = await supabase
        .from(tabla)
        .insert({ banda_id: bandaId, nombre })
        .select("id, nombre");

      if (error) {
        throw convertirErrorSupabase(error);
      }

      return convertirFilaEscrita(data);
    },

    // Solo cambia el nombre: banda_id no se envía nunca en una actualización
    async actualizar(registro) {
      const { data, error } = await supabase
        .from(tabla)
        .update({ nombre: registro.nombre })
        .eq("id", registro.id)
        .eq("banda_id", bandaId)
        .select("id, nombre");

      if (error) {
        throw convertirErrorSupabase(error);
      }

      return convertirFilaEscrita(data);
    },

    // Si está asignado a algún evento, la clave foránea rechaza el borrado (23503)
    async eliminar(id) {
      const { data, error } = await supabase
        .from(tabla)
        .delete()
        .eq("id", id)
        .eq("banda_id", bandaId)
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

export function crearRepositorioTecnicosSupabase(
  bandaId: string
): RepositorioConNombre<Tecnico> {
  return crearRepositorioConNombre("tecnicos", bandaId);
}
