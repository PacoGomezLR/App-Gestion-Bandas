import type { MovimientoFinanciero } from "../../types/finanzas";
import {
  categoriasDeTipo,
  etiquetaCategoria,
  etiquetaTipoMovimiento,
  TIPOS_MOVIMIENTO,
} from "../categoriasMovimiento";
import { fechaDeHoy } from "../fechas";
import {
  agruparPorMes,
  calcularBote,
  calcularGastos,
  calcularIngresos,
  etiquetaEvento,
  filtrarPorPeriodo,
  ordenarMovimientos,
} from "../finanzas";

function movimiento(datos: Partial<MovimientoFinanciero> & { id: string }): MovimientoFinanciero {
  return {
    tipo: "ingreso",
    importeCentimos: 100,
    concepto: "Concepto",
    categoria: "otro",
    fecha: "2026-11-05",
    eventoId: null,
    notas: null,
    creadoEn: "2026-11-05T10:00:00+00:00",
    ...datos,
  };
}

describe("totales", () => {
  const movimientos = [
    movimiento({ id: "1", tipo: "ingreso", importeCentimos: 80000 }),
    movimiento({ id: "2", tipo: "ingreso", importeCentimos: 50000 }),
    movimiento({ id: "3", tipo: "gasto", importeCentimos: 12000 }),
    movimiento({ id: "4", tipo: "gasto", importeCentimos: 7000 }),
  ];

  test("suma los ingresos en céntimos", () => {
    expect(calcularIngresos(movimientos)).toBe(130000);
  });

  test("suma los gastos en céntimos", () => {
    expect(calcularGastos(movimientos)).toBe(19000);
  });

  test("el bote es ingresos menos gastos: 800 + 500 - 120 - 70 = 1.110 €", () => {
    expect(calcularBote(movimientos)).toBe(111000);
  });

  test("el saldo puede ser negativo", () => {
    expect(
      calcularBote([
        movimiento({ id: "1", tipo: "ingreso", importeCentimos: 1000 }),
        movimiento({ id: "2", tipo: "gasto", importeCentimos: 3550 }),
      ])
    ).toBe(-2550);
  });

  test("sin movimientos todo es cero", () => {
    expect(calcularIngresos([])).toBe(0);
    expect(calcularGastos([])).toBe(0);
    expect(calcularBote([])).toBe(0);
  });

  test("miles de céntimos sueltos no acumulan errores", () => {
    const muchos = Array.from({ length: 1000 }, (_, indice) =>
      movimiento({ id: String(indice), importeCentimos: 10 })
    );

    expect(calcularBote(muchos)).toBe(10000);
  });
});

describe("ordenarMovimientos", () => {
  test("fecha descendente y, en el mismo día, el último creado primero", () => {
    const ordenados = ordenarMovimientos([
      movimiento({ id: "viejo", fecha: "2026-10-01", creadoEn: "2026-11-30T09:00:00+00:00" }),
      movimiento({ id: "mismoDiaAntes", fecha: "2026-11-05", creadoEn: "2026-11-05T09:00:00+00:00" }),
      movimiento({ id: "mismoDiaDespues", fecha: "2026-11-05", creadoEn: "2026-11-05T12:00:00+00:00" }),
      movimiento({ id: "reciente", fecha: "2026-11-20", creadoEn: "2026-11-01T09:00:00+00:00" }),
    ]);

    expect(ordenados.map(({ id }) => id)).toEqual([
      "reciente",
      "mismoDiaDespues",
      "mismoDiaAntes",
      "viejo",
    ]);
  });

  test("manda la fecha económica, no cuándo se creó el registro", () => {
    const ordenados = ordenarMovimientos([
      movimiento({ id: "apuntadoHoy", fecha: "2026-10-31", creadoEn: "2026-11-30T09:00:00+00:00" }),
      movimiento({ id: "apuntadoAntes", fecha: "2026-11-02", creadoEn: "2026-11-02T09:00:00+00:00" }),
    ]);

    expect(ordenados.map(({ id }) => id)).toEqual(["apuntadoAntes", "apuntadoHoy"]);
  });

  test("no modifica la lista recibida", () => {
    const original = [
      movimiento({ id: "a", fecha: "2026-01-01" }),
      movimiento({ id: "b", fecha: "2026-02-01" }),
    ];

    ordenarMovimientos(original);

    expect(original.map(({ id }) => id)).toEqual(["a", "b"]);
  });
});

describe("filtrarPorPeriodo", () => {
  const movimientos = [
    movimiento({ id: "antes", fecha: "2026-10-31" }),
    movimiento({ id: "inicio", fecha: "2026-11-01" }),
    movimiento({ id: "fin", fecha: "2026-11-30" }),
    movimiento({ id: "despues", fecha: "2026-12-01" }),
  ];

  test("incluye los dos límites", () => {
    expect(
      filtrarPorPeriodo(movimientos, { desde: "2026-11-01", hasta: "2026-11-30" }).map(({ id }) => id)
    ).toEqual(["inicio", "fin"]);
  });

  test("usa la fecha económica aunque el registro se creara en otro mes", () => {
    const apuntadoTarde = movimiento({
      id: "tarde",
      fecha: "2026-10-31",
      creadoEn: "2026-11-15T10:00:00+00:00",
    });

    expect(filtrarPorPeriodo([apuntadoTarde], { desde: "2026-11-01", hasta: "2026-11-30" })).toEqual([]);
    expect(filtrarPorPeriodo([apuntadoTarde], { desde: "2026-10-01", hasta: "2026-10-31" })).toEqual([
      apuntadoTarde,
    ]);
  });

  test("sin límites devuelve todo; admite un rango con un solo extremo", () => {
    expect(filtrarPorPeriodo(movimientos, { desde: null, hasta: null })).toHaveLength(4);
    expect(filtrarPorPeriodo(movimientos, { desde: "2026-11-30", hasta: null })).toHaveLength(2);
    expect(filtrarPorPeriodo(movimientos, { desde: null, hasta: "2026-11-01" })).toHaveLength(2);
  });
});

describe("agruparPorMes", () => {
  test("un grupo por mes, en el orden recibido", () => {
    const grupos = agruparPorMes([
      movimiento({ id: "1", fecha: "2026-11-14" }),
      movimiento({ id: "2", fecha: "2026-11-02" }),
      movimiento({ id: "3", fecha: "2026-10-20" }),
    ]);

    expect(grupos.map(({ mes, movimientos }) => [mes, movimientos.map(({ id }) => id)])).toEqual([
      ["2026-11", ["1", "2"]],
      ["2026-10", ["3"]],
    ]);
  });

  test("sin movimientos no hay grupos", () => {
    expect(agruparPorMes([])).toEqual([]);
  });
});

describe("etiquetaEvento", () => {
  test("fecha, tipo y lugar, sin repetir la fecha del título", () => {
    expect(etiquetaEvento({ fecha: "2026-11-14", tipo: "boda", lugar: " Córdoba " })).toBe(
      "14/11/2026 · Boda Córdoba"
    );
  });

  test("sin lugar queda solo el tipo", () => {
    expect(etiquetaEvento({ fecha: "2026-11-21", tipo: "ensayo", lugar: "" })).toBe(
      "21/11/2026 · Ensayo"
    );
  });
});

describe("categorías", () => {
  test("cada tipo ofrece las suyas", () => {
    expect(categoriasDeTipo("ingreso")).toEqual([
      "saldo_inicial",
      "concierto",
      "sobrante_concierto",
      "aportacion",
      "merchandising",
      "otro",
    ]);
    expect(categoriasDeTipo("gasto")).toEqual([
      "transporte",
      "alquiler_furgoneta",
      "tecnico",
      "material",
      "local_ensayo",
      "comida",
      "alojamiento",
      "promocion",
      "comision",
      "otro",
    ]);
  });

  test("los identificadores no se muestran: la interfaz usa etiquetas en español", () => {
    expect(etiquetaCategoria("saldo_inicial")).toBe("Saldo inicial");
    expect(etiquetaCategoria("local_ensayo")).toBe("Local / ensayo");
    expect(etiquetaCategoria("comida")).toBe("Comida / dietas");
    expect(etiquetaCategoria("sobrante_concierto")).toBe("Sobrante concierto");
    expect(etiquetaCategoria("alquiler_furgoneta")).toBe("Alquiler furgoneta");
    expect(etiquetaTipoMovimiento("ingreso")).toBe("Ingreso");
    expect(etiquetaTipoMovimiento("gasto")).toBe("Gasto");
  });

  test("las dos categorías nuevas solo existen en su tipo", () => {
    expect(categoriasDeTipo("gasto")).not.toContain("sobrante_concierto");
    expect(categoriasDeTipo("ingreso")).not.toContain("alquiler_furgoneta");
  });

  test("toda categoría tiene etiqueta", () => {
    for (const tipo of TIPOS_MOVIMIENTO) {
      for (const categoria of categoriasDeTipo(tipo)) {
        expect(etiquetaCategoria(categoria)).toBeTruthy();
      }
    }
  });
});

describe("fecha local", () => {
  test("usa el día del dispositivo aunque en UTC ya sea otro", () => {
    const casiMedianoche = new Date(2026, 10, 5, 23, 59);
    jest.spyOn(casiMedianoche, "toISOString").mockReturnValue("2026-11-06T00:59:00.000Z");

    expect(fechaDeHoy(casiMedianoche)).toBe("2026-11-05");
  });
});
