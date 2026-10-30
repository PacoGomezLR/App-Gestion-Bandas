import { supabase } from "../../lib/supabase";
import type { Evento } from "../../types/evento";
import { convertirErrorSupabase, ErrorRepositorio } from "./errores";
import {
  COLUMNAS_EVENTO,
  convertirDatosEventoAParametros,
  convertirFilasEventos,
  type DatosEvento,
} from "./mapeoEventos";

export interface RepositorioEventos {
  listar: () => Promise<Evento[]>;
  crear: (datos: DatosEvento) => Promise<Evento>;
  actualizar: (evento: Evento) => Promise<Evento>;
  eliminar: (id: string) => Promise<void>;
}

// La banda queda fijada al crear el repositorio: ninguna operación puede omitirla.
// Las lecturas filtran por banda_id además de la RLS del servidor.
export function crearRepositorioEventosSupabase(bandaId: string): RepositorioEventos {
  return {
    async listar() {
      const { data, error } = await supabase
        .from("eventos")
        .select(COLUMNAS_EVENTO)
        .eq("banda_id", bandaId)
        .order("fecha")
        .order("titulo");

      if (error) {
        throw convertirErrorSupabase(error);
      }

      return convertirFilasEventos(data);
    },

    // Evento y técnicos en una sola transacción (función crear_evento)
    async crear(datos) {
      const { data, error } = await supabase.rpc(
        "crear_evento",
        convertirDatosEventoAParametros(bandaId, datos)
      );

      if (error) {
        throw convertirErrorSupabase(error);
      }

      if (typeof data !== "string") {
        throw new ErrorRepositorio("desconocido");
      }

      return { ...datos, id: data };
    },

    async actualizar(evento) {
      const { id, ...datos } = evento;

      const { error } = await supabase.rpc("actualizar_evento", {
        p_evento_id: id,
        ...convertirDatosEventoAParametros(bandaId, datos),
      });

      if (error) {
        throw convertirErrorSupabase(error);
      }

      return evento;
    },

    // Sus técnicos asignados se borran solos (cascade). Si la RLS no deja borrar,
    // Supabase no da error pero no devuelve filas.
    async eliminar(id) {
      const { data, error } = await supabase
        .from("eventos")
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
