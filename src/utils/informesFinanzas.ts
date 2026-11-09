import type {
  CategoriaMovimiento,
  ClavePeriodo,
  EvolucionMensual,
  InformeFinanciero,
  InformePorCategoria,
  InformePorEvento,
  InformeResumenFinanciero,
  LineaCategoria,
  MovimientoFinanciero,
  PeriodoInforme,
  ResultadoCentimos,
  TipoInforme,
  TipoMovimiento,
} from "../types/finanzas";
import { etiquetaCategoria } from "./categoriasMovimiento";
import { etiquetaMes } from "./fechas";
import { calcularBote, calcularGastos, calcularIngresos, filtrarPorPeriodo } from "./finanzas";

// Informes: movimientos reales → funciones deterministas → céntimos exactos.
// Reciben siempre hoy como dato, nunca lo leen del reloj.

function dosCifras(valor: number): string {
  return String(valor).padStart(2, "0");
}

function periodoDeMes(anio: number, mes: number): PeriodoInforme {
  const prefijo = `${anio}-${dosCifras(mes)}`;
  // El día 0 del mes siguiente es el último de este
  const ultimoDia = new Date(anio, mes, 0).getDate();

  return {
    desde: `${prefijo}-01`,
    hasta: `${prefijo}-${dosCifras(ultimoDia)}`,
    etiqueta: etiquetaMes(prefijo),
  };
}

export function crearPeriodo(clave: ClavePeriodo, hoy: string): PeriodoInforme {
  const anio = Number(hoy.slice(0, 4));
  const mes = Number(hoy.slice(5, 7));

  switch (clave) {
    case "este_mes":
      return periodoDeMes(anio, mes);
    case "mes_anterior":
      return mes === 1 ? periodoDeMes(anio - 1, 12) : periodoDeMes(anio, mes - 1);
    case "este_anio":
      return { desde: `${anio}-01-01`, hasta: `${anio}-12-31`, etiqueta: String(anio) };
    case "todo":
      return { desde: null, hasta: null, etiqueta: "Todo el historial" };
  }
}

export function generarResumenPeriodo(
  movimientos: MovimientoFinanciero[],
  periodo: PeriodoInforme
): InformeResumenFinanciero {
  const { desde } = periodo;
  const enPeriodo = filtrarPorPeriodo(movimientos, periodo);
  const anteriores =
    desde === null ? [] : movimientos.filter(({ fecha }) => fecha < desde);

  const saldoInicialCentimos = calcularBote(anteriores);
  const ingresosCentimos = calcularIngresos(enPeriodo);
  const gastosCentimos = calcularGastos(enPeriodo);
  const resultadoCentimos = ingresosCentimos - gastosCentimos;

  return {
    tipo: "resumen",
    periodo,
    movimientosEnPeriodo: enPeriodo.length,
    movimientosEnHistorial: movimientos.length,
    saldoInicialCentimos,
    ingresosCentimos,
    gastosCentimos,
    resultadoCentimos,
    saldoCierreCentimos: saldoInicialCentimos + resultadoCentimos,
  };
}

function lineasDeCategoria(
  movimientos: MovimientoFinanciero[],
  tipo: TipoMovimiento
): LineaCategoria[] {
  const totales = new Map<CategoriaMovimiento, number>();

  for (const { tipo: tipoMovimiento, categoria, importeCentimos } of movimientos) {
    if (tipoMovimiento === tipo) {
      totales.set(categoria, (totales.get(categoria) ?? 0) + importeCentimos);
    }
  }

  return [...totales]
    .map(([categoria, totalCentimos]) => ({ categoria, totalCentimos }))
    .sort(
      (a, b) =>
        b.totalCentimos - a.totalCentimos ||
        etiquetaCategoria(a.categoria).localeCompare(etiquetaCategoria(b.categoria), "es")
    );
}

// Ingresos y gastos van separados: 'otro' existe en los dos y no se mezclan
export function agruparPorCategoria(
  movimientos: MovimientoFinanciero[],
  periodo: PeriodoInforme
): InformePorCategoria {
  const enPeriodo = filtrarPorPeriodo(movimientos, periodo);

  return {
    tipo: "categorias",
    periodo,
    movimientosEnPeriodo: enPeriodo.length,
    ingresos: lineasDeCategoria(enPeriodo, "ingreso"),
    gastos: lineasDeCategoria(enPeriodo, "gasto"),
    totalIngresosCentimos: calcularIngresos(enPeriodo),
    totalGastosCentimos: calcularGastos(enPeriodo),
  };
}

function resultadoDe(movimientos: MovimientoFinanciero[]): ResultadoCentimos {
  const ingresosCentimos = calcularIngresos(movimientos);
  const gastosCentimos = calcularGastos(movimientos);

  return {
    ingresosCentimos,
    gastosCentimos,
    resultadoCentimos: ingresosCentimos - gastosCentimos,
  };
}

// Del evento más rentable al menos. etiquetasEventos: id → texto, sin consultas
export function agruparPorEvento(
  movimientos: MovimientoFinanciero[],
  periodo: PeriodoInforme,
  etiquetasEventos: Record<string, string>
): InformePorEvento {
  const enPeriodo = filtrarPorPeriodo(movimientos, periodo);
  const porEvento = new Map<string, MovimientoFinanciero[]>();
  const sinEvento: MovimientoFinanciero[] = [];

  for (const movimiento of enPeriodo) {
    if (movimiento.eventoId === null) {
      sinEvento.push(movimiento);
    } else {
      porEvento.set(movimiento.eventoId, [
        ...(porEvento.get(movimiento.eventoId) ?? []),
        movimiento,
      ]);
    }
  }

  const eventos = [...porEvento]
    .map(([eventoId, delEvento]) => ({
      eventoId,
      etiqueta: etiquetasEventos[eventoId] ?? null,
      ...resultadoDe(delEvento),
    }))
    .sort(
      (a, b) =>
        b.resultadoCentimos - a.resultadoCentimos ||
        (a.etiqueta ?? "").localeCompare(b.etiqueta ?? "", "es")
    );

  return {
    tipo: "eventos",
    periodo,
    movimientosEnPeriodo: enPeriodo.length,
    eventos,
    sinEvento: sinEvento.length === 0 ? null : resultadoDe(sinEvento),
  };
}

function mesSiguiente(mes: string): string {
  const anio = Number(mes.slice(0, 4));
  const numero = Number(mes.slice(5, 7));

  return numero === 12 ? `${anio + 1}-01` : `${anio}-${dosCifras(numero + 1)}`;
}

// Saldo acumulado al cierre de cada mes, incluido lo anterior al periodo. Va del
// mes del primer movimiento del periodo hasta hoy (o hasta el último movimiento
// si es futuro), sin pasar del final del periodo. Un mes sin movimientos repite
// el saldo anterior: la serie no tiene huecos.
export function calcularEvolucionMensual(
  movimientos: MovimientoFinanciero[],
  periodo: PeriodoInforme,
  hoy: string
): EvolucionMensual {
  const enPeriodo = filtrarPorPeriodo(movimientos, periodo);
  const base = { tipo: "evolucion" as const, periodo, movimientosEnPeriodo: enPeriodo.length };

  if (enPeriodo.length === 0) {
    return { ...base, meses: [] };
  }

  const { hasta } = periodo;
  const mesesConDatos = enPeriodo.map(({ fecha }) => fecha.slice(0, 7)).sort();
  const primerMes = mesesConDatos[0];
  const ultimoMes = mesesConDatos[mesesConDatos.length - 1];
  const mesHoy = hoy.slice(0, 7);
  const finSinLimite = ultimoMes > mesHoy ? ultimoMes : mesHoy;
  const fin = hasta !== null && hasta.slice(0, 7) < finSinLimite ? hasta.slice(0, 7) : finSinLimite;

  const meses = [];

  for (let mes = primerMes; mes <= fin; mes = mesSiguiente(mes)) {
    const hastaCierre = movimientos.filter(
      ({ fecha }) => fecha.slice(0, 7) <= mes && (hasta === null || fecha <= hasta)
    );

    meses.push({ mes, saldoCierreCentimos: calcularBote(hastaCierre) });
  }

  return { ...base, meses };
}

interface DatosInforme {
  movimientos: MovimientoFinanciero[];
  periodo: PeriodoInforme;
  hoy: string;
  etiquetasEventos: Record<string, string>;
}

export function generarInforme(
  tipo: TipoInforme,
  { movimientos, periodo, hoy, etiquetasEventos }: DatosInforme
): InformeFinanciero {
  switch (tipo) {
    case "resumen":
      return generarResumenPeriodo(movimientos, periodo);
    case "eventos":
      return agruparPorEvento(movimientos, periodo, etiquetasEventos);
    case "categorias":
      return agruparPorCategoria(movimientos, periodo);
    case "evolucion":
      return calcularEvolucionMensual(movimientos, periodo, hoy);
  }
}
