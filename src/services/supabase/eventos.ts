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
  // LEGADO TEMPORAL (hasta la migración 003): músicos que ya tenía cada evento
  // en evento_miembros. actualizar_evento borra y reescribe esas filas, así que
  // se reenvían tal cual para no perderlas al editar. Nunca salen de aquí.
  const miembrosLegadoPorEvento = new Map<string, string[]>();

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

      const convertidas = convertirFilasEventos(data);

      miembrosLegadoPorEvento.clear();
      convertidas.miembrosLegadoPorEvento.forEach((ids, eventoId) =>
        miembrosLegadoPorEvento.set(eventoId, ids)
      );

      return convertidas.eventos;
    },

    // Evento y asignaciones en una sola transacción (función crear_evento).
    // Un evento nuevo no tiene músicos heredados: p_miembro_ids va vacío.
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
        ...convertirDatosEventoAParametros(
          bandaId,
          datos,
          miembrosLegadoPorEvento.get(id) ?? []
        ),
      });

      if (error) {
        throw convertirErrorSupabase(error);
      }

      return evento;
    },

    // Las asignaciones se borran solas (cascade). Si la RLS no deja borrar,
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

      miembrosLegadoPorEvento.delete(id);
    },
  };
}
