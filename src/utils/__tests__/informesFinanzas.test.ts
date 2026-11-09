import type {
  CategoriaMovimiento,
  MovimientoFinanciero,
  PeriodoInforme,
  TipoMovimiento,
} from "../../types/finanzas";
import {
  agruparPorCategoria,
  agruparPorEvento,
  calcularEvolucionMensual,
  crearPeriodo,
  generarInforme,
  generarResumenPeriodo,
} from "../informesFinanzas";

function movimiento(
  id: string,
  tipo: TipoMovimiento,
  importeCentimos: number,
  categoria: CategoriaMovimiento,
  fecha: string,
  eventoId: string | null = null
): MovimientoFinanciero {
  return {
    id,
    tipo,
    importeCentimos,
    concepto: `Concepto ${id}`,
    categoria,
    fecha,
    eventoId,
    notas: null,
    creadoEn: `${fecha}T10:00:00+00:00`,
  };
}

// Conjunto conocido. Bote por mes:
//   septiembre  800,00                       →   800,00
//   octubre     +500,00 -120,00 -70,50       → 1.109,50
//   noviembre   +900,00 -220,00 -35,50 +15,00 → 1.769,00
const MOVIMIENTOS = [
  movimiento("m1", "ingreso", 80000, "saldo_inicial", "2026-09-01"),
  movimiento("m2", "ingreso", 50000, "concierto", "2026-10-10", "e1"),
  movimiento("m3", "gasto", 12000, "tecnico", "2026-10-10", "e1"),
  movimiento("m4", "gasto", 7050, "transporte", "2026-10-20"),
  movimiento("m5", "ingreso", 90000, "concierto", "2026-11-14", "e2"),
  movimiento("m6", "gasto", 22000, "tecnico", "2026-11-14", "e2"),
  movimiento("m7", "gasto", 3550, "material", "2026-11-20"),
  movimiento("m8", "ingreso", 1500, "merchandising", "2026-11-21", "e1"),
];

const HOY = "2026-11-25";
const NOVIEMBRE = crearPeriodo("este_mes", HOY);
const OCTUBRE = crearPeriodo("mes_anterior", HOY);
const TODO = crearPeriodo("todo", HOY);
const ETIQUETAS = { e1: "10/10/2026 · Boda Córdoba", e2: "14/11/2026 · Fiesta privada Montilla" };

describe("crearPeriodo", () => {
  test("este mes va del día 1 al último", () => {
    expect(crearPeriodo("este_mes", "2026-11-05")).toEqual({
      desde: "2026-11-01",
      hasta: "2026-11-30",
      etiqueta: "Noviembre 2026",
    });
  });

  test("el último día respeta los años bisiestos", () => {
    expect(crearPeriodo("este_mes", "2028-02-10").hasta).toBe("2028-02-29");
    expect(crearPeriodo("este_mes", "2026-02-10").hasta).toBe("2026-02-28");
  });

  test("el mes anterior a enero es diciembre del año pasado", () => {
    expect(crearPeriodo("mes_anterior", "2026-01-15")).toEqual({
      desde: "2025-12-01",
      hasta: "2025-12-31",
      etiqueta: "Diciembre 2025",
    });
  });

  test("el mes anterior de un 31 no se salta febrero", () => {
    expect(crearPeriodo("mes_anterior", "2026-03-31")).toEqual({
      desde: "2026-02-01",
      hasta: "2026-02-28",
      etiqueta: "Febrero 2026",
    });
  });

  test("este año y todo", () => {
    expect(crearPeriodo("este_anio", "2026-11-05")).toEqual({
      desde: "2026-01-01",
      hasta: "2026-12-31",
      etiqueta: "2026",
    });
    expect(crearPeriodo("todo", "2026-11-05")).toEqual({
      desde: null,
      hasta: null,
      etiqueta: "Todo el historial",
    });
  });
});

describe("generarResumenPeriodo", () => {
  test("noviembre, con importes exactos", () => {
    expect(generarResumenPeriodo(MOVIMIENTOS, NOVIEMBRE)).toEqual({
      tipo: "resumen",
      periodo: NOVIEMBRE,
      movimientosEnPeriodo: 4,
      movimientosEnHistorial: 8,
      saldoInicialCentimos: 110950,
      ingresosCentimos: 91500,
      gastosCentimos: 25550,
      resultadoCentimos: 65950,
      saldoCierreCentimos: 176900,
    });
  });

  test("el cierre de un mes es el saldo inicial del siguiente", () => {
    const octubre = generarResumenPeriodo(MOVIMIENTOS, OCTUBRE);

    expect(octubre.saldoInicialCentimos).toBe(80000);
    expect(octubre.ingresosCentimos).toBe(50000);
    expect(octubre.gastosCentimos).toBe(19050);
    expect(octubre.resultadoCentimos).toBe(30950);
    expect(octubre.saldoCierreCentimos).toBe(
      generarResumenPeriodo(MOVIMIENTOS, NOVIEMBRE).saldoInicialCentimos
    );
  });

  test("sin inicio de periodo el saldo inicial es cero", () => {
    const todo = generarResumenPeriodo(MOVIMIENTOS, TODO);

    expect(todo.saldoInicialCentimos).toBe(0);
    expect(todo.saldoCierreCentimos).toBe(176900);
  });

  test("lo posterior al periodo no cuenta para nada", () => {
    const septiembre: PeriodoInforme = {
      desde: "2026-09-01",
      hasta: "2026-09-30",
      etiqueta: "Septiembre 2026",
    };

    expect(generarResumenPeriodo(MOVIMIENTOS, septiembre).saldoCierreCentimos).toBe(80000);
  });

  test("un resultado negativo baja el saldo", () => {
    const resumen = generarResumenPeriodo(
      [
        movimiento("a", "ingreso", 1000, "otro", "2026-10-01"),
        movimiento("b", "gasto", 5000, "material", "2026-11-02"),
      ],
      NOVIEMBRE
    );

    expect(resumen.resultadoCentimos).toBe(-5000);
    expect(resumen.saldoCierreCentimos).toBe(-4000);
  });

  test("un periodo sin movimientos conserva el saldo que traía", () => {
    expect(generarResumenPeriodo(MOVIMIENTOS, crearPeriodo("este_mes", "2026-12-10"))).toMatchObject({
      movimientosEnPeriodo: 0,
      movimientosEnHistorial: 8,
      saldoInicialCentimos: 176900,
      ingresosCentimos: 0,
      gastosCentimos: 0,
      resultadoCentimos: 0,
      saldoCierreCentimos: 176900,
    });
  });

  test("el ejemplo: diciembre sin movimientos y 1.200 € de antes", () => {
    const diciembre = crearPeriodo("este_mes", "2026-12-10");

    expect(
      generarResumenPeriodo([movimiento("a", "ingreso", 120000, "saldo_inicial", "2026-11-30")], diciembre)
    ).toEqual({
      tipo: "resumen",
      periodo: diciembre,
      movimientosEnPeriodo: 0,
      movimientosEnHistorial: 1,
      saldoInicialCentimos: 120000,
      ingresosCentimos: 0,
      gastosCentimos: 0,
      resultadoCentimos: 0,
      saldoCierreCentimos: 120000,
    });
  });

  test("un saldo negativo también se arrastra", () => {
    expect(
      generarResumenPeriodo(
        [movimiento("a", "gasto", 5000, "material", "2026-11-30")],
        crearPeriodo("este_mes", "2026-12-10")
      )
    ).toMatchObject({ saldoInicialCentimos: -5000, saldoCierreCentimos: -5000 });
  });

  test("saldo inicial + resultado = saldo al cierre en cualquier periodo", () => {
    for (const hoy of ["2026-08-15", "2026-09-15", "2026-10-15", "2026-11-15", "2026-12-15"]) {
      const resumen = generarResumenPeriodo(MOVIMIENTOS, crearPeriodo("este_mes", hoy));

      expect(resumen.saldoInicialCentimos + resumen.resultadoCentimos).toBe(resumen.saldoCierreCentimos);
    }
  });

  test("una banda sin ningún movimiento tiene todo a cero", () => {
    expect(generarResumenPeriodo([], TODO)).toEqual({
      tipo: "resumen",
      periodo: TODO,
      movimientosEnPeriodo: 0,
      movimientosEnHistorial: 0,
      saldoInicialCentimos: 0,
      ingresosCentimos: 0,
      gastosCentimos: 0,
      resultadoCentimos: 0,
      saldoCierreCentimos: 0,
    });
  });
});

describe("agruparPorCategoria", () => {
  test("ingresos y gastos van separados y de mayor a menor", () => {
    expect(agruparPorCategoria(MOVIMIENTOS, TODO)).toMatchObject({
      ingresos: [
        { categoria: "concierto", totalCentimos: 140000 },
        { categoria: "saldo_inicial", totalCentimos: 80000 },
        { categoria: "merchandising", totalCentimos: 1500 },
      ],
      gastos: [
        { categoria: "tecnico", totalCentimos: 34000 },
        { categoria: "transporte", totalCentimos: 7050 },
        { categoria: "material", totalCentimos: 3550 },
      ],
      totalIngresosCentimos: 221500,
      totalGastosCentimos: 44600,
    });
  });

  test("respeta el periodo", () => {
    expect(agruparPorCategoria(MOVIMIENTOS, NOVIEMBRE)).toMatchObject({
      ingresos: [
        { categoria: "concierto", totalCentimos: 90000 },
        { categoria: "merchandising", totalCentimos: 1500 },
      ],
      gastos: [
        { categoria: "tecnico", totalCentimos: 22000 },
        { categoria: "material", totalCentimos: 3550 },
      ],
    });
  });

  test("'otro' de ingresos y 'otro' de gastos no se mezclan", () => {
    const informe = agruparPorCategoria(
      [
        movimiento("a", "ingreso", 1000, "otro", "2026-11-01"),
        movimiento("b", "gasto", 300, "otro", "2026-11-01"),
      ],
      NOVIEMBRE
    );

    expect(informe.ingresos).toEqual([{ categoria: "otro", totalCentimos: 1000 }]);
    expect(informe.gastos).toEqual([{ categoria: "otro", totalCentimos: 300 }]);
  });

  test("sin movimientos no hay líneas", () => {
    expect(agruparPorCategoria([], TODO)).toMatchObject({
      movimientosEnPeriodo: 0,
      ingresos: [],
      gastos: [],
      totalIngresosCentimos: 0,
      totalGastosCentimos: 0,
    });
  });
});

describe("agruparPorEvento", () => {
  test("el beneficio de cada evento, del mayor al menor", () => {
    const informe = agruparPorEvento(MOVIMIENTOS, TODO, ETIQUETAS);

    expect(informe.eventos).toEqual([
      {
        eventoId: "e2",
        etiqueta: ETIQUETAS.e2,
        ingresosCentimos: 90000,
        gastosCentimos: 22000,
        resultadoCentimos: 68000,
      },
      {
        eventoId: "e1",
        etiqueta: ETIQUETAS.e1,
        ingresosCentimos: 51500,
        gastosCentimos: 12000,
        resultadoCentimos: 39500,
      },
    ]);
  });

  test("el ejemplo: 800 de ingreso, 120 de técnico y 70 de transporte dejan 610", () => {
    const informe = agruparPorEvento(
      [
        movimiento("a", "ingreso", 80000, "concierto", "2026-11-14", "e1"),
        movimiento("b", "gasto", 12000, "tecnico", "2026-11-14", "e1"),
        movimiento("c", "gasto", 7000, "transporte", "2026-11-14", "e1"),
      ],
      NOVIEMBRE,
      ETIQUETAS
    );

    expect(informe.eventos[0].resultadoCentimos).toBe(61000);
  });

  test("lo que no tiene evento no desaparece: va aparte", () => {
    expect(agruparPorEvento(MOVIMIENTOS, TODO, ETIQUETAS).sinEvento).toEqual({
      ingresosCentimos: 80000,
      gastosCentimos: 10600,
      resultadoCentimos: 69400,
    });
  });

  test("eventos y sin evento cuadran con el total del periodo", () => {
    const { eventos, sinEvento } = agruparPorEvento(MOVIMIENTOS, TODO, ETIQUETAS);
    const total = eventos.reduce(
      (suma, { resultadoCentimos }) => suma + resultadoCentimos,
      sinEvento?.resultadoCentimos ?? 0
    );

    expect(total).toBe(176900);
  });

  test("solo cuenta lo que cae dentro del periodo", () => {
    const informe = agruparPorEvento(MOVIMIENTOS, NOVIEMBRE, ETIQUETAS);

    expect(informe.eventos.map(({ eventoId, resultadoCentimos }) => [eventoId, resultadoCentimos])).toEqual([
      ["e2", 68000],
      ["e1", 1500],
    ]);
    expect(informe.sinEvento).toEqual({
      ingresosCentimos: 0,
      gastosCentimos: 3550,
      resultadoCentimos: -3550,
    });
  });

  test("sin movimientos sueltos, sinEvento es null", () => {
    const soloConEvento = MOVIMIENTOS.filter(({ eventoId }) => eventoId !== null);

    expect(agruparPorEvento(soloConEvento, TODO, ETIQUETAS).sinEvento).toBeNull();
  });

  test("un evento que ya no está cargado se conserva sin etiqueta", () => {
    const [linea] = agruparPorEvento(
      [movimiento("a", "ingreso", 100, "otro", "2026-11-01", "desconocido")],
      TODO,
      ETIQUETAS
    ).eventos;

    expect(linea).toMatchObject({ eventoId: "desconocido", etiqueta: null, resultadoCentimos: 100 });
  });

  test("sin movimientos no hay líneas", () => {
    expect(agruparPorEvento([], TODO, ETIQUETAS)).toMatchObject({ eventos: [], sinEvento: null });
  });
});

describe("calcularEvolucionMensual", () => {
  test("saldo acumulado al cierre de cada mes", () => {
    expect(calcularEvolucionMensual(MOVIMIENTOS, TODO, HOY).meses).toEqual([
      { mes: "2026-09", saldoCierreCentimos: 80000 },
      { mes: "2026-10", saldoCierreCentimos: 110950 },
      { mes: "2026-11", saldoCierreCentimos: 176900 },
    ]);
  });

  test("un periodo acotado arrastra el saldo anterior", () => {
    expect(calcularEvolucionMensual(MOVIMIENTOS, NOVIEMBRE, HOY).meses).toEqual([
      { mes: "2026-11", saldoCierreCentimos: 176900 },
    ]);
  });

  test("este año empieza en el primer mes con datos, no en enero", () => {
    const { meses } = calcularEvolucionMensual(MOVIMIENTOS, crearPeriodo("este_anio", HOY), HOY);

    expect(meses.map(({ mes }) => mes)).toEqual(["2026-09", "2026-10", "2026-11"]);
  });

  test("no llega a meses futuros sin datos", () => {
    const { meses } = calcularEvolucionMensual(MOVIMIENTOS, crearPeriodo("este_anio", HOY), HOY);

    expect(meses[meses.length - 1].mes).toBe("2026-11");
  });

  test("un mes sin movimientos repite el saldo y hasta hoy no hay huecos", () => {
    const { meses } = calcularEvolucionMensual(
      [
        movimiento("a", "ingreso", 1000, "otro", "2026-08-10"),
        movimiento("b", "gasto", 200, "material", "2026-10-10"),
      ],
      TODO,
      HOY
    );

    expect(meses).toEqual([
      { mes: "2026-08", saldoCierreCentimos: 1000 },
      { mes: "2026-09", saldoCierreCentimos: 1000 },
      { mes: "2026-10", saldoCierreCentimos: 800 },
      { mes: "2026-11", saldoCierreCentimos: 800 },
    ]);
  });

  test("cruza el cambio de año", () => {
    const { meses } = calcularEvolucionMensual(
      [
        movimiento("a", "ingreso", 1000, "otro", "2025-12-10"),
        movimiento("b", "ingreso", 500, "otro", "2026-01-10"),
      ],
      TODO,
      "2026-01-20"
    );

    expect(meses).toEqual([
      { mes: "2025-12", saldoCierreCentimos: 1000 },
      { mes: "2026-01", saldoCierreCentimos: 1500 },
    ]);
  });

  test("incluye un movimiento con fecha futura", () => {
    const { meses } = calcularEvolucionMensual(
      [movimiento("a", "ingreso", 1000, "otro", "2027-01-05")],
      TODO,
      HOY
    );

    expect(meses).toEqual([{ mes: "2027-01", saldoCierreCentimos: 1000 }]);
  });

  test("el saldo puede ser negativo", () => {
    const { meses } = calcularEvolucionMensual(
      [movimiento("a", "gasto", 1000, "material", "2026-11-05")],
      TODO,
      HOY
    );

    expect(meses).toEqual([{ mes: "2026-11", saldoCierreCentimos: -1000 }]);
  });

  test("un rango personalizado no cuenta lo posterior a su final", () => {
    const { meses } = calcularEvolucionMensual(
      MOVIMIENTOS,
      { desde: "2026-11-01", hasta: "2026-11-15", etiqueta: "Del 1 al 15" },
      HOY
    );

    // Sin los 35,50 del día 20 ni los 15,00 del día 21
    expect(meses).toEqual([{ mes: "2026-11", saldoCierreCentimos: 178950 }]);
  });

  test("un mes vacío al final de la serie repite el saldo de cierre", () => {
    const { meses } = calcularEvolucionMensual(MOVIMIENTOS, TODO, "2026-12-10");

    expect(meses[meses.length - 1]).toEqual({ mes: "2026-12", saldoCierreCentimos: 176900 });
  });

  test("periodo sin movimientos o sin ningún movimiento: sin meses", () => {
    expect(calcularEvolucionMensual(MOVIMIENTOS, crearPeriodo("este_mes", "2026-12-10"), "2026-12-10").meses).toEqual([]);
    expect(calcularEvolucionMensual([], TODO, HOY).meses).toEqual([]);
  });
});

describe("generarInforme", () => {
  test.each(["resumen", "eventos", "categorias", "evolucion"] as const)(
    "%s devuelve datos sin formato: solo enteros, ningún texto de importe",
    (tipo) => {
      const informe = generarInforme(tipo, {
        movimientos: MOVIMIENTOS,
        periodo: TODO,
        hoy: HOY,
        etiquetasEventos: ETIQUETAS,
      });

      expect(informe.tipo).toBe(tipo);
      expect(JSON.stringify(informe)).not.toContain("€");
    }
  );

  test("no modifica los movimientos recibidos", () => {
    const copia = JSON.stringify(MOVIMIENTOS);

    generarInforme("evolucion", {
      movimientos: MOVIMIENTOS,
      periodo: TODO,
      hoy: HOY,
      etiquetasEventos: ETIQUETAS,
    });

    expect(JSON.stringify(MOVIMIENTOS)).toBe(copia);
  });
});
