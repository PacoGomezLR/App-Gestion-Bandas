export type TipoMovimiento = "ingreso" | "gasto";

export type CategoriaIngreso =
  | "saldo_inicial"
  | "concierto"
  | "sobrante_concierto"
  | "aportacion"
  | "merchandising"
  | "otro";

export type CategoriaGasto =
  | "transporte"
  | "alquiler_furgoneta"
  | "tecnico"
  | "material"
  | "local_ensayo"
  | "comida"
  | "alojamiento"
  | "promocion"
  | "comision"
  | "otro";

export type CategoriaMovimiento = CategoriaIngreso | CategoriaGasto;

export interface MovimientoFinanciero {
  readonly id: string;
  tipo: TipoMovimiento;
  // Entero y siempre positivo: el signo lo decide el tipo
  importeCentimos: number;
  concepto: string;
  categoria: CategoriaMovimiento;
  // Día económico del movimiento, en YYYY-MM-DD. Es el que usan los informes
  fecha: string;
  eventoId: string | null;
  notas: string | null;
  // Cuándo se creó el registro: solo desempata el orden, nunca es una fecha económica
  readonly creadoEn: string;
}

// Lo que se puede escribir: id y creadoEn los pone la base
export type DatosMovimiento = Omit<MovimientoFinanciero, "id" | "creadoEn">;

export type ClavePeriodo = "este_mes" | "mes_anterior" | "este_anio" | "todo";

// Límites incluidos, en YYYY-MM-DD; null = sin límite. Los informes solo dependen
// de desde y hasta, así que aceptan cualquier rango además de los predefinidos
export interface PeriodoInforme {
  desde: string | null;
  hasta: string | null;
  etiqueta: string;
}

export type TipoInforme = "resumen" | "eventos" | "categorias" | "evolucion";

// Los informes son datos sin formato ni interfaz: importes en céntimos y sin
// textos de pantalla, para poder pintarlos o exportarlos sin rehacer los cálculos

export interface InformeResumenFinanciero {
  tipo: "resumen";
  periodo: PeriodoInforme;
  movimientosEnPeriodo: number;
  // Todos los de la banda: un periodo vacío no significa que no haya cuentas
  movimientosEnHistorial: number;
  saldoInicialCentimos: number;
  ingresosCentimos: number;
  gastosCentimos: number;
  resultadoCentimos: number;
  saldoCierreCentimos: number;
}

export interface ResultadoCentimos {
  ingresosCentimos: number;
  gastosCentimos: number;
  resultadoCentimos: number;
}

export interface LineaEvento extends ResultadoCentimos {
  eventoId: string;
  // null si el evento ya no está entre los cargados
  etiqueta: string | null;
}

export interface InformePorEvento {
  tipo: "eventos";
  periodo: PeriodoInforme;
  movimientosEnPeriodo: number;
  eventos: LineaEvento[];
  // Los movimientos sin evento se cuentan aparte; null si no hay ninguno
  sinEvento: ResultadoCentimos | null;
}

export interface LineaCategoria {
  categoria: CategoriaMovimiento;
  totalCentimos: number;
}

export interface InformePorCategoria {
  tipo: "categorias";
  periodo: PeriodoInforme;
  movimientosEnPeriodo: number;
  ingresos: LineaCategoria[];
  gastos: LineaCategoria[];
  totalIngresosCentimos: number;
  totalGastosCentimos: number;
}

export interface SaldoMensual {
  // YYYY-MM
  mes: string;
  saldoCierreCentimos: number;
}

export interface EvolucionMensual {
  tipo: "evolucion";
  periodo: PeriodoInforme;
  movimientosEnPeriodo: number;
  meses: SaldoMensual[];
}

export type InformeFinanciero =
  | InformeResumenFinanciero
  | InformePorEvento
  | InformePorCategoria
  | EvolucionMensual;
