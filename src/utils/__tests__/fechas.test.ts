import { etiquetaMes, formatearFecha } from "../fechas";

describe("etiquetaMes", () => {
  test("nombre del mes en español y año", () => {
    expect(etiquetaMes("2026-11")).toBe("Noviembre 2026");
    expect(etiquetaMes("2026-01")).toBe("Enero 2026");
    expect(etiquetaMes("2025-12")).toBe("Diciembre 2025");
  });
});

describe("formatearFecha", () => {
  test("convierte YYYY-MM-DD a DD-MM-YYYY", () => {
    expect(formatearFecha("2026-03-12")).toBe("12-03-2026");
  });

  test("devuelve una cadena vacía si no hay fecha", () => {
    expect(formatearFecha("")).toBe("");
  });
});
