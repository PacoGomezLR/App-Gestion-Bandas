import type { TipoMovimiento } from "../types/finanzas";

// Todo el dinero va en céntimos enteros: nada de decimales en coma flotante.

// Mismo límite que la base: 999.999.999,99 €
const MAX_EUROS = 999_999_999;

// Sin él, una línea estrecha podría dejar el € solo en el renglón siguiente
const ESPACIO_FIJO = " ";

const FORMATO_IMPORTE = /^(\d+)(?:[.,](\d{1,2}))?$/;

interface OpcionesImporte {
  // El caché de un evento puede ser 0; un movimiento financiero, no
  permitirCero?: boolean;
}

export type ResultadoImporte =
  | { valido: true; centimos: number }
  | { valido: false; error: string };

function rechazar(error: string): ResultadoImporte {
  return { valido: false, error };
}

// "12", "12,5", "12,50" o "12.50" → céntimos. Euros y decimales se leen por
// separado como enteros, nunca con parseFloat.
// "1.245" se rechaza por tener tres decimales: no se adivina si son miles.
export function parsearImporte(
  texto: string,
  { permitirCero = false }: OpcionesImporte = {}
): ResultadoImporte {
  const limpio = texto.trim();

  if (limpio === "") {
    return rechazar("El importe es obligatorio");
  }

  if (limpio.startsWith("-")) {
    return rechazar(
      permitirCero ? "El importe no puede ser negativo" : "El importe debe ser mayor que cero"
    );
  }

  if (/^\d+[.,]\d{3,}$/.test(limpio)) {
    return rechazar("El importe admite como máximo dos decimales");
  }

  const partes = FORMATO_IMPORTE.exec(limpio);

  if (partes === null) {
    return rechazar("Escribe el importe solo con números, por ejemplo 12,50");
  }

  const euros = Number(partes[1]);
  const decimales = Number((partes[2] ?? "").padEnd(2, "0"));

  if (euros > MAX_EUROS) {
    return rechazar("El importe es demasiado alto");
  }

  const centimos = euros * 100 + decimales;

  if (centimos === 0 && !permitirCero) {
    return rechazar("El importe debe ser mayor que cero");
  }

  return { valido: true, centimos };
}

function separarEuros(centimos: number): { euros: string; decimales: string } {
  const absoluto = Math.abs(centimos);
  const resto = absoluto % 100;

  return {
    euros: String((absoluto - resto) / 100),
    decimales: String(resto).padStart(2, "0"),
  };
}

// 124550 → 1.245,50 €. A mano: Intl no pone el punto en miles de cuatro cifras en español
export function formatearCentimos(centimos: number): string {
  const { euros, decimales } = separarEuros(centimos);
  const conMiles = euros.replace(/\B(?=(\d{3})+$)/g, ".");

  return `${centimos < 0 ? "-" : ""}${conMiles},${decimales}${ESPACIO_FIJO}€`;
}

// Importe de un movimiento: el signo lo da su tipo
export function formatearImporteMovimiento(tipo: TipoMovimiento, centimos: number): string {
  return `${tipo === "ingreso" ? "+" : "-"}${formatearCentimos(centimos)}`;
}

// 1250 → "12,50": el texto que se puede volver a editar en el formulario
export function importeParaFormulario(centimos: number): string {
  const { euros, decimales } = separarEuros(centimos);

  return `${euros},${decimales}`;
}
