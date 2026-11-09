import type {
  CategoriaMovimiento,
  DatosMovimiento,
  MovimientoFinanciero,
  TipoMovimiento,
} from "../types/finanzas";
import { categoriasDeTipo } from "./categoriasMovimiento";
import { importeParaFormulario, parsearImporte } from "./dinero";

// Mismos límites que la base
export const LONGITUD_MAXIMA_CONCEPTO = 120;
export const LONGITUD_MAXIMA_NOTAS = 500;

// Lo que hay escrito en el formulario, todavía sin validar. Sin tipo ni
// categoría por defecto: un movimiento nunca se guarda con un tipo supuesto
export interface BorradorMovimiento {
  tipo: TipoMovimiento | null;
  importe: string;
  concepto: string;
  categoria: CategoriaMovimiento | null;
  fecha: string;
  eventoId: string | null;
  notas: string;
}

export function borradorNuevo(hoy: string): BorradorMovimiento {
  return {
    tipo: null,
    importe: "",
    concepto: "",
    categoria: null,
    fecha: hoy,
    eventoId: null,
    notas: "",
  };
}

// Al editar se conserva la fecha del movimiento: nunca vuelve a ser hoy
export function borradorDeMovimiento(movimiento: MovimientoFinanciero): BorradorMovimiento {
  return {
    tipo: movimiento.tipo,
    importe: importeParaFormulario(movimiento.importeCentimos),
    concepto: movimiento.concepto,
    categoria: movimiento.categoria,
    fecha: movimiento.fecha,
    eventoId: movimiento.eventoId,
    notas: movimiento.notas ?? "",
  };
}

// Cada tipo tiene sus categorías: la elegida solo sobrevive si vale para el nuevo
export function cambiarTipoBorrador(
  borrador: BorradorMovimiento,
  tipo: TipoMovimiento
): BorradorMovimiento {
  const { categoria } = borrador;

  return {
    ...borrador,
    tipo,
    categoria: categoria !== null && categoriasDeTipo(tipo).includes(categoria) ? categoria : null,
  };
}

export type ResultadoBorrador =
  | { valido: true; datos: DatosMovimiento }
  | { valido: false; error: string };

export function validarBorrador(borrador: BorradorMovimiento): ResultadoBorrador {
  const { tipo, categoria } = borrador;

  if (tipo === null) {
    return { valido: false, error: "Elige si es un ingreso o un gasto" };
  }

  const importe = parsearImporte(borrador.importe);

  if (!importe.valido) {
    return importe;
  }

  const concepto = borrador.concepto.trim();

  if (concepto === "") {
    return { valido: false, error: "El concepto es obligatorio" };
  }

  if (concepto.length > LONGITUD_MAXIMA_CONCEPTO) {
    return {
      valido: false,
      error: `El concepto admite como máximo ${LONGITUD_MAXIMA_CONCEPTO} caracteres`,
    };
  }

  if (categoria === null || !categoriasDeTipo(tipo).includes(categoria)) {
    return { valido: false, error: "Elige una categoría" };
  }

  const notas = borrador.notas.trim();

  if (notas.length > LONGITUD_MAXIMA_NOTAS) {
    return {
      valido: false,
      error: `Las notas admiten como máximo ${LONGITUD_MAXIMA_NOTAS} caracteres`,
    };
  }

  return {
    valido: true,
    datos: {
      tipo,
      importeCentimos: importe.centimos,
      concepto,
      categoria,
      fecha: borrador.fecha,
      eventoId: borrador.eventoId,
      notas: notas === "" ? null : notas,
    },
  };
}
