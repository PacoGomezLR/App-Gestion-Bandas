import type { Evento } from "../types/evento";
import type { MovimientoFinanciero, PeriodoInforme, TipoMovimiento } from "../types/finanzas";
import { formatearFechaConBarras } from "./fechas";
import { etiquetaTipoEvento } from "./tiposEvento";

// Cálculos sobre movimientos: funciones puras con importes en céntimos enteros

function sumarDeTipo(movimientos: MovimientoFinanciero[], tipo: TipoMovimiento): number {
  return movimientos.reduce(
    (total, movimiento) => (movimiento.tipo === tipo ? total + movimiento.importeCentimos : total),
    0
  );
}

export function calcularIngresos(movimientos: MovimientoFinanciero[]): number {
  return sumarDeTipo(movimientos, "ingreso");
}

export function calcularGastos(movimientos: MovimientoFinanciero[]): number {
  return sumarDeTipo(movimientos, "gasto");
}

// El bote nunca se guarda: siempre sale de los movimientos, y puede ser negativo
export function calcularBote(movimientos: MovimientoFinanciero[]): number {
  return calcularIngresos(movimientos) - calcularGastos(movimientos);
}

// Fecha económica descendente; entre los del mismo día, el último creado primero
export function ordenarMovimientos(movimientos: MovimientoFinanciero[]): MovimientoFinanciero[] {
  return [...movimientos].sort((a, b) => {
    if (a.fecha !== b.fecha) {
      return a.fecha < b.fecha ? 1 : -1;
    }

    if (a.creadoEn === b.creadoEn) {
      return 0;
    }

    return a.creadoEn < b.creadoEn ? 1 : -1;
  });
}

// YYYY-MM-DD se ordena igual como texto que como fecha
export function filtrarPorPeriodo(
  movimientos: MovimientoFinanciero[],
  { desde, hasta }: Pick<PeriodoInforme, "desde" | "hasta">
): MovimientoFinanciero[] {
  return movimientos.filter(
    ({ fecha }) => (desde === null || fecha >= desde) && (hasta === null || fecha <= hasta)
  );
}

export interface GrupoMes {
  // YYYY-MM
  mes: string;
  movimientos: MovimientoFinanciero[];
}

// Conserva el orden recibido: un mes aparece cuando aparece su primer movimiento
export function agruparPorMes(movimientos: MovimientoFinanciero[]): GrupoMes[] {
  const grupos: GrupoMes[] = [];

  for (const movimiento of movimientos) {
    const mes = movimiento.fecha.slice(0, 7);
    const ultimo = grupos[grupos.length - 1];

    if (ultimo?.mes === mes) {
      ultimo.movimientos.push(movimiento);
    } else {
      grupos.push({ mes, movimientos: [movimiento] });
    }
  }

  return grupos;
}

// El título de un evento ya lleva la fecha: aquí se compone sin repetirla
export function etiquetaEvento({ fecha, tipo, lugar }: Pick<Evento, "fecha" | "tipo" | "lugar">): string {
  const nombre = [etiquetaTipoEvento(tipo), lugar.trim()].filter((parte) => parte !== "").join(" ");

  return `${formatearFechaConBarras(fecha)} · ${nombre}`;
}
