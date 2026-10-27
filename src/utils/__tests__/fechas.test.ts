import { formatearFecha } from "../fechas";

describe("formatearFecha", () => {
  test("convierte YYYY-MM-DD a DD-MM-YYYY", () => {
    expect(formatearFecha("2026-03-12")).toBe("12-03-2026");
  });

  test("devuelve una cadena vacía si no hay fecha", () => {
    expect(formatearFecha("")).toBe("");
  });
});
