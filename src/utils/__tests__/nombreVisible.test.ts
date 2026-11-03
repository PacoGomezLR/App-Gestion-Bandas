import { normalizarNombreVisible } from "../nombreVisible";

describe("normalizarNombreVisible", () => {
  test("recorta espacios y acepta de 2 a 80 caracteres", () => {
    expect(normalizarNombreVisible("  Paco Gómez ")).toBe("Paco Gómez");
    expect(normalizarNombreVisible("Jo")).toBe("Jo");
    expect(normalizarNombreVisible("P".repeat(80))).toBe("P".repeat(80));
  });

  test("rechaza vacío, menos de 2 o más de 80 caracteres", () => {
    expect(normalizarNombreVisible("")).toBeNull();
    expect(normalizarNombreVisible("   ")).toBeNull();
    expect(normalizarNombreVisible(" P ")).toBeNull();
    expect(normalizarNombreVisible("P".repeat(81))).toBeNull();
  });
});
