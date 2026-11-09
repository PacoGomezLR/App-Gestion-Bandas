import { supabase } from "../../lib/supabase";
import type { Cancion, EstadoCancion } from "../../types/cancion";
import { APARTADOS } from "../../utils/canciones";
import { convertirErrorSupabase, ErrorRepositorio } from "./errores";

export interface RepositorioCanciones {
  listar: () => Promise<Cancion[]>;
  crear: (nombre: string, estado: EstadoCancion) => Promise<Cancion>;
  editarNombre: (id: string, nombre: string) => Promise<Cancion>;
  pasarARepertorio: (id: string) => Promise<Cancion>;
  eliminar: (id: string) => Promise<void>;
}

const COLUMNAS_CANCION = "id, nombre, estado";

function esEstadoCancion(valor: unknown): valor is EstadoCancion {
  return APARTADOS.some((estado) => estado === valor);
}

// La respuesta de Supabase no está tipada: una fila rara invalida la carga
function convertirFila(fila: unknown): Cancion {
  if (typeof fila !== "object" || fila === null) {
    throw new Error("Canción no válida");
  }

  const { id, nombre, estado } = fila as Record<string, unknown>;

  if (typeof id !== "string" || typeof nombre !== "string" || !esEstadoCancion(estado)) {
    throw new Error("Canción no válida");
  }

  return { id, nombre, estado };
}

// Una escritura que la RLS descarta no da error: simplemente no devuelve filas
function convertirFilaEscrita(data: unknown): Cancion {
  if (!Array.isArray(data) || data.length === 0) {
    throw new ErrorRepositorio("sin_permiso");
  }

  return convertirFila(data[0]);
}

// La banda queda fijada al crear el repositorio. Toda consulta lleva banda_id
// además de la RLS del servidor.
export function crearRepositorioCancionesSupabase(bandaId: string): RepositorioCanciones {
  return {
    // Una sola consulta trae los dos apartados: se separan en la app
    async listar() {
      const { data, error } = await supabase
        .from("canciones")
        .select(COLUMNAS_CANCION)
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

    async crear(nombre, estado) {
      const { data, error } = await supabase
        .from("canciones")
        .insert({ banda_id: bandaId, nombre, estado })
        .select(COLUMNAS_CANCION);

      if (error) {
        throw convertirErrorSupabase(error);
      }

      return convertirFilaEscrita(data);
    },

    // Solo el nombre: el estado cambia únicamente al pasar al repertorio
    async editarNombre(id, nombre) {
      const { data, error } = await supabase
        .from("canciones")
        .update({ nombre })
        .eq("id", id)
        .eq("banda_id", bandaId)
        .select(COLUMNAS_CANCION);

      if (error) {
        throw convertirErrorSupabase(error);
      }

      return convertirFilaEscrita(data);
    },

    // La misma fila cambia de apartado: nunca se duplica. Solo desde nueva
    async pasarARepertorio(id) {
      const { data, error } = await supabase
        .from("canciones")
        .update({ estado: "repertorio" })
        .eq("id", id)
        .eq("banda_id", bandaId)
        .eq("estado", "nueva")
        .select(COLUMNAS_CANCION);

      if (error) {
        throw convertirErrorSupabase(error);
      }

      return convertirFilaEscrita(data);
    },

    async eliminar(id) {
      const { data, error } = await supabase
        .from("canciones")
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
