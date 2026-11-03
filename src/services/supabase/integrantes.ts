import { supabase } from "../../lib/supabase";
import type { IntegranteBanda } from "../../types/banda";
import { convertirErrorSupabase } from "./errores";

export interface RepositorioIntegrantes {
  // Una sola llamada por banda (RPC listar_integrantes_banda): sin N+1
  listar: () => Promise<IntegranteBanda[]>;
}

// Solo se leen usuario_id y nombre_visible: la RPC no devuelve nada más
export function convertirFilasIntegrantes(filas: unknown): IntegranteBanda[] {
  if (!Array.isArray(filas)) {
    throw new Error("Respuesta de integrantes no válida");
  }

  return filas.map((fila: unknown) => {
    if (typeof fila !== "object" || fila === null) {
      throw new Error("Integrante no válido");
    }

    const { usuario_id, nombre_visible } = fila as Record<string, unknown>;

    if (
      typeof usuario_id !== "string" ||
      (nombre_visible !== null && typeof nombre_visible !== "string")
    ) {
      throw new Error("Integrante no válido");
    }

    return { usuarioId: usuario_id, nombreVisible: nombre_visible };
  });
}

// La banda queda fijada al crear el repositorio. La RPC comprueba en el
// servidor que el usuario pertenece a esa banda antes de devolver nada.
export function crearRepositorioIntegrantesSupabase(bandaId: string): RepositorioIntegrantes {
  return {
    async listar() {
      const { data, error } = await supabase.rpc("listar_integrantes_banda", {
        p_banda_id: bandaId,
      });

      if (error) {
        throw convertirErrorSupabase(error);
      }

      return convertirFilasIntegrantes(data);
    },
  };
}
