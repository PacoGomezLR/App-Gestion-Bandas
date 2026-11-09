import type { MovimientoFinanciero } from "../../types/finanzas";
import {
  type BorradorMovimiento,
  borradorDeMovimiento,
  borradorNuevo,
  cambiarTipoBorrador,
  validarBorrador,
} from "../borradorMovimiento";

const COMPLETO: BorradorMovimiento = {
  tipo: "gasto",
  importe: "12,50",
  concepto: "  Gasolina  ",
  categoria: "transporte",
  fecha: "2026-11-01",
  eventoId: null,
  notas: "  ",
};

const MOVIMIENTO: MovimientoFinanciero = {
  id: "m1",
  tipo: "ingreso",
  importeCentimos: 80050,
  concepto: "Boda",
  categoria: "concierto",
  fecha: "2026-10-14",
  eventoId: "e1",
  notas: "En efectivo",
  creadoEn: "2026-11-02T10:00:00+00:00",
};

function error(borrador: BorradorMovimiento): string | null {
  const resultado = validarBorrador(borrador);

  return resultado.valido ? null : resultado.error;
}

describe("borradorNuevo", () => {
  test("trae la fecha recibida y no supone ningún tipo", () => {
    expect(borradorNuevo("2026-11-05")).toEqual({
      tipo: null,
      importe: "",
      concepto: "",
      categoria: null,
      fecha: "2026-11-05",
      eventoId: null,
      notas: "",
    });
  });
});

describe("borradorDeMovimiento", () => {
  test("conserva la fecha del movimiento y el resto de sus datos", () => {
    expect(borradorDeMovimiento(MOVIMIENTO)).toEqual({
      tipo: "ingreso",
      importe: "800,50",
      concepto: "Boda",
      categoria: "concierto",
      fecha: "2026-10-14",
      eventoId: "e1",
      notas: "En efectivo",
    });
  });

  test("created_at no se usa como fecha económica", () => {
    expect(borradorDeMovimiento(MOVIMIENTO).fecha).not.toBe("2026-11-02");
  });

  test("guardar sin tocar nada deja los mismos datos", () => {
    const { id: _id, creadoEn: _creadoEn, ...datos } = MOVIMIENTO;

    expect(validarBorrador(borradorDeMovimiento(MOVIMIENTO))).toEqual({ valido: true, datos });
  });
});

describe("cambiarTipoBorrador", () => {
  test("quita la categoría si no vale para el tipo nuevo", () => {
    expect(cambiarTipoBorrador({ ...COMPLETO, categoria: "transporte" }, "ingreso").categoria).toBeNull();
  });

  test("las categorías nuevas no sobreviven al cambiar al otro tipo", () => {
    expect(
      cambiarTipoBorrador({ ...COMPLETO, tipo: "ingreso", categoria: "sobrante_concierto" }, "gasto").categoria
    ).toBeNull();
    expect(
      cambiarTipoBorrador({ ...COMPLETO, tipo: "gasto", categoria: "alquiler_furgoneta" }, "ingreso").categoria
    ).toBeNull();
  });

  test("conserva 'otro', que existe en los dos", () => {
    expect(cambiarTipoBorrador({ ...COMPLETO, categoria: "otro" }, "ingreso").categoria).toBe("otro");
  });

  test("no toca lo demás", () => {
    expect(cambiarTipoBorrador(COMPLETO, "ingreso")).toMatchObject({
      tipo: "ingreso",
      importe: "12,50",
      fecha: "2026-11-01",
    });
  });
});

describe("validarBorrador", () => {
  test("convierte a céntimos, recorta textos y deja notas vacías como null", () => {
    expect(validarBorrador(COMPLETO)).toEqual({
      valido: true,
      datos: {
        tipo: "gasto",
        importeCentimos: 1250,
        concepto: "Gasolina",
        categoria: "transporte",
        fecha: "2026-11-01",
        eventoId: null,
        notas: null,
      },
    });
  });

  test("nunca guarda sin un tipo inequívoco", () => {
    expect(error({ ...COMPLETO, tipo: null })).toBe("Elige si es un ingreso o un gasto");
  });

  test("el importe se valida con su parser", () => {
    expect(error({ ...COMPLETO, importe: "" })).toBe("El importe es obligatorio");
    expect(error({ ...COMPLETO, importe: "0" })).toBe("El importe debe ser mayor que cero");
  });

  test("no admite un concepto vacío tras recortar", () => {
    expect(error({ ...COMPLETO, concepto: "   " })).toBe("El concepto es obligatorio");
  });

  test("respeta las longitudes de la base", () => {
    expect(error({ ...COMPLETO, concepto: "x".repeat(120) })).toBeNull();
    expect(error({ ...COMPLETO, concepto: "x".repeat(121) })).toBe(
      "El concepto admite como máximo 120 caracteres"
    );
    expect(error({ ...COMPLETO, notas: "x".repeat(500) })).toBeNull();
    expect(error({ ...COMPLETO, notas: "x".repeat(501) })).toBe(
      "Las notas admiten como máximo 500 caracteres"
    );
  });

  test("exige una categoría de su tipo", () => {
    expect(error({ ...COMPLETO, categoria: null })).toBe("Elige una categoría");
    expect(error({ ...COMPLETO, categoria: "concierto" })).toBe("Elige una categoría");
  });

  test("cada categoría nueva vale solo con su tipo", () => {
    expect(validarBorrador({ ...COMPLETO, tipo: "ingreso", categoria: "sobrante_concierto" })).toMatchObject({
      datos: { tipo: "ingreso", categoria: "sobrante_concierto" },
    });
    expect(validarBorrador({ ...COMPLETO, tipo: "gasto", categoria: "alquiler_furgoneta" })).toMatchObject({
      datos: { tipo: "gasto", categoria: "alquiler_furgoneta" },
    });
    expect(error({ ...COMPLETO, tipo: "gasto", categoria: "sobrante_concierto" })).toBe("Elige una categoría");
    expect(error({ ...COMPLETO, tipo: "ingreso", categoria: "alquiler_furgoneta" })).toBe("Elige una categoría");
  });

  test("el evento es opcional", () => {
    expect(error({ ...COMPLETO, eventoId: null })).toBeNull();
    expect(validarBorrador({ ...COMPLETO, eventoId: "e1" })).toMatchObject({
      datos: { eventoId: "e1" },
    });
  });
});
