import { supabase } from "../../lib/supabase";
import type {
  CategoriaMovimiento,
  DatosMovimiento,
  MovimientoFinanciero,
  TipoMovimiento,
} from "../../types/finanzas";
import { categoriasDeTipo, TIPOS_MOVIMIENTO } from "../../utils/categoriasMovimiento";
import { convertirErrorSupabase, ErrorRepositorio } from "./errores";

export interface RepositorioFinanzas {
  listar: () => Promise<MovimientoFinanciero[]>;
  crear: (datos: DatosMovimiento) => Promise<MovimientoFinanciero>;
  actualizar: (id: string, datos: DatosMovimiento) => Promise<MovimientoFinanciero>;
  eliminar: (id: string) => Promise<void>;
}

// creado_por no se pide: la app no lo muestra
export const COLUMNAS_MOVIMIENTO =
  "id, tipo, importe_centimos, concepto, categoria, fecha, evento_id, notas, created_at";

function esTipoMovimiento(valor: unknown): valor is TipoMovimiento {
  return TIPOS_MOVIMIENTO.some((tipo) => tipo === valor);
}

function esCategoriaDe(tipo: TipoMovimiento, valor: unknown): valor is CategoriaMovimiento {
  return categoriasDeTipo(tipo).some((categoria) => categoria === valor);
}

// La respuesta de Supabase no está tipada. Un registro raro invalida la carga
// entera: mejor un error visible que un bote calculado con datos incompletos.
function convertirFila(fila: unknown): MovimientoFinanciero {
  if (typeof fila !== "object" || fila === null) {
    throw new Error("Movimiento no válido");
  }

  const { id, tipo, importe_centimos, concepto, categoria, fecha, evento_id, notas, created_at } =
    fila as Record<string, unknown>;

  if (
    typeof id !== "string" ||
    !esTipoMovimiento(tipo) ||
    !esCategoriaDe(tipo, categoria) ||
    typeof importe_centimos !== "number" ||
    !Number.isSafeInteger(importe_centimos) ||
    importe_centimos <= 0 ||
    typeof concepto !== "string" ||
    typeof fecha !== "string" ||
    (typeof evento_id !== "string" && evento_id !== null) ||
    (typeof notas !== "string" && notas !== null) ||
    typeof created_at !== "string"
  ) {
    throw new Error("Movimiento no válido");
  }

  return {
    id,
    tipo,
    importeCentimos: importe_centimos,
    concepto,
    categoria,
    fecha,
    eventoId: evento_id,
    notas,
    creadoEn: created_at,
  };
}

// Una escritura que la RLS descarta no da error: simplemente no devuelve filas
function convertirFilaEscrita(data: unknown): MovimientoFinanciero {
  if (!Array.isArray(data) || data.length === 0) {
    throw new ErrorRepositorio("sin_permiso");
  }

  return convertirFila(data[0]);
}

function columnasEditables(datos: DatosMovimiento) {
  return {
    tipo: datos.tipo,
    importe_centimos: datos.importeCentimos,
    concepto: datos.concepto,
    categoria: datos.categoria,
    fecha: datos.fecha,
    evento_id: datos.eventoId,
    notas: datos.notas,
  };
}

// La banda queda fijada al crear el repositorio. Toda consulta lleva banda_id
// además de la RLS del servidor, que solo deja pasar a su admin.
export function crearRepositorioFinanzasSupabase(bandaId: string): RepositorioFinanzas {
  return {
    async listar() {
      const { data, error } = await supabase
        .from("movimientos_financieros")
        .select(COLUMNAS_MOVIMIENTO)
        .eq("banda_id", bandaId)
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        throw convertirErrorSupabase(error);
      }

      if (!Array.isArray(data)) {
        throw new Error("Respuesta no válida");
      }

      return data.map(convertirFila);
    },

    // creado_por lo pone la base con el usuario de la sesión
    async crear(datos) {
      const { data, error } = await supabase
        .from("movimientos_financieros")
        .insert({ banda_id: bandaId, ...columnasEditables(datos) })
        .select(COLUMNAS_MOVIMIENTO);

      if (error) {
        throw convertirErrorSupabase(error);
      }

      return convertirFilaEscrita(data);
    },

    // banda_id, creado_por y created_at no se envían nunca en una actualización
    async actualizar(id, datos) {
      const { data, error } = await supabase
        .from("movimientos_financieros")
        .update(columnasEditables(datos))
        .eq("id", id)
        .eq("banda_id", bandaId)
        .select(COLUMNAS_MOVIMIENTO);

      if (error) {
        throw convertirErrorSupabase(error);
      }

      return convertirFilaEscrita(data);
    },

    async eliminar(id) {
      const { data, error } = await supabase
        .from("movimientos_financieros")
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
