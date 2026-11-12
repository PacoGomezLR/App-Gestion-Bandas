// El tema oscuro de MI Banda: que los tokens sigan formando un sistema legible
// (contraste WCAG AA) y que nada vuelva a depender del esquema del sistema.
import { Colores } from "../theme";
import { TemaNavegacion } from "../temaNavegacion";

jest.mock("../../global.css", () => ({}));

function luminancia(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((inicio) => {
    const canal = parseInt(hex.slice(inicio, inicio + 2), 16) / 255;

    return canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string): number {
  const [clara, oscura] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);

  return (clara + 0.05) / (oscura + 0.05);
}

const SUPERFICIES = {
  background: Colores.background,
  backgroundElement: Colores.backgroundElement,
  backgroundSelected: Colores.backgroundSelected,
};

describe("tema: superficies", () => {
  test("todos los colores son hexadecimales de 6 cifras", () => {
    for (const [nombre, valor] of Object.entries(Colores)) {
      expect([nombre, /^#[0-9A-F]{6}$/i.test(valor)]).toEqual([nombre, true]);
    }
  });

  test("fondo casi negro, pero no negro puro", () => {
    expect(Colores.background).not.toBe("#000000");
    expect(luminancia(Colores.background)).toBeLessThan(0.01);
  });

  test("las superficies se elevan de más oscura a más clara", () => {
    expect(luminancia(Colores.background)).toBeLessThan(luminancia(Colores.backgroundElement));
    expect(luminancia(Colores.backgroundElement)).toBeLessThan(luminancia(Colores.backgroundSelected));
    // El borde se distingue de la superficie sobre la que se dibuja
    expect(luminancia(Colores.backgroundSelected)).toBeLessThan(luminancia(Colores.border));
    expect(luminancia(Colores.border)).toBeLessThan(luminancia(Colores.borderStrong));
  });
});

describe("tema: contraste de texto (AA, 4,5:1)", () => {
  test.each([
    ["text", Colores.text],
    ["textSecondary", Colores.textSecondary],
    ["textMuted", Colores.textMuted],
    ["primaryPressed", Colores.primaryPressed],
    ["error", Colores.error],
    ["success", Colores.success],
    ["warning", Colores.warning],
    ["conflict", Colores.conflict],
  ])("%s se lee sobre fondo y tarjetas", (_nombre, color) => {
    for (const superficie of [SUPERFICIES.background, SUPERFICIES.backgroundElement]) {
      expect(contraste(color, superficie)).toBeGreaterThanOrEqual(4.5);
    }
  });

  // La superficie elevada es el fondo de las tarjetas de eventos: lugar, fecha,
  // acciones de acento y Eliminar evento tienen que seguir leyéndose
  test.each([
    ["text", Colores.text],
    ["textSecondary", Colores.textSecondary],
    ["textMuted", Colores.textMuted],
    ["primaryPressed", Colores.primaryPressed],
    ["error", Colores.error],
    ["success", Colores.success],
    ["warning", Colores.warning],
  ])("%s también sobre la superficie elevada (tarjetas de eventos)", (_nombre, color) => {
    expect(contraste(color, Colores.backgroundSelected)).toBeGreaterThanOrEqual(4.5);
  });

  test.each([
    ["onPrimary sobre primary (botón principal, día elegido)", Colores.onPrimary, Colores.primary],
    ["Pendiente en su badge", Colores.warning, Colores.warningBackground],
    ["Confirmado en su badge", Colores.success, Colores.successBackground],
    ["error en su mensaje", Colores.error, Colores.errorBackground],
    ["información en su píldora", Colores.info, Colores.infoBackground],
    ["no disponible en su aviso", Colores.conflict, Colores.conflictBackground],
    ["texto sobre lo elegido", Colores.text, Colores.primarySoft],
  ])("%s", (_caso, texto, fondo) => {
    expect(contraste(texto, fondo)).toBeGreaterThanOrEqual(4.5);
  });

  test("la jerarquía de grises se mantiene: principal > secundario > tenue", () => {
    const fondo = Colores.background;

    expect(contraste(Colores.text, fondo)).toBeGreaterThan(contraste(Colores.textSecondary, fondo));
    expect(contraste(Colores.textSecondary, fondo)).toBeGreaterThan(contraste(Colores.textMuted, fondo));
  });
});

describe("tema: elementos que no son texto (3:1)", () => {
  test("el foco y los indicadores de color principal se ven sobre la tarjeta", () => {
    expect(contraste(Colores.primary, Colores.backgroundElement)).toBeGreaterThanOrEqual(3);
  });

  test("Pendiente y Confirmado no dependen de un mismo tono", () => {
    expect(Colores.warning).not.toBe(Colores.success);
    expect(Colores.conflict).not.toBe(Colores.warning);
  });
});

describe("tema de navegación", () => {
  test("oscuro y con el mismo fondo que las pantallas", () => {
    expect(TemaNavegacion.dark).toBe(true);
    expect(TemaNavegacion.colors.background).toBe(Colores.background);
    expect(TemaNavegacion.colors.card).toBe(Colores.background);
    expect(TemaNavegacion.colors.text).toBe(Colores.text);
    expect(TemaNavegacion.colors.border).toBe(Colores.border);
  });
});
