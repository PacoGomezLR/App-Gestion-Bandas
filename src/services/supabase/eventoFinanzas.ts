import { supabase } from "../../lib/supabase";
import type { CachesPorEvento } from "../../types/evento";
import { convertirErrorSupabase } from "./errores";

export interface RepositorioEventoFinanzas {
  listar: () => Promise<CachesPorEvento>;
}

// La respuesta de Supabase no está tipada. Una fila rara invalida la carga: se
// avisa en lugar de enseñar un importe dudoso.
function convertirFilas(filas: unknown): CachesPorEvento {
  if (!Array.isArray(filas)) {
    throw new Error("Respuesta de cachés no válida");
  }

  return filas.reduce<CachesPorEvento>((caches, fila: unknown) => {
    if (typeof fila !== "object" || fila === null) {
      throw new Error("Caché no válido");
    }

    const { evento_id, cache_centimos } = fila as Record<string, unknown>;

    if (
      typeof evento_id !== "string" ||
      typeof cache_centimos !== "number" ||
      !Number.isSafeInteger(cache_centimos) ||
      cache_centimos < 0
    ) {
      throw new Error("Caché no válido");
    }

    caches[evento_id] = cache_centimos;

    return caches;
  }, {});
}

// Datos privados de los eventos: solo se crea para un admin, y la RLS del
// servidor vuelve a comprobarlo. Una consulta trae los cachés de toda la banda.
// Las escrituras van con el evento, en sus RPC transaccionales (eventos.ts).
export function crearRepositorioEventoFinanzasSupabase(bandaId: string): RepositorioEventoFinanzas {
  return {
    async listar() {
      const { data, error } = await supabase
        .from("evento_finanzas")
        .select("evento_id, cache_centimos")
        .eq("banda_id", bandaId);

      if (error) {
        throw convertirErrorSupabase(error);
      }

      return convertirFilas(data);
    },
  };
}
