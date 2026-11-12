import {
  ajustarEscalaLogo,
  aumentarEscalaLogo,
  ESCALA_LOGO,
  porcentajeEscalaLogo,
  proporcionZonaLogo,
  reducirEscalaLogo,
} from "../escalaLogo";

test("los mismos límites que la base (013): de 0,5 a 2,5, normal 1", () => {
  expect(ESCALA_LOGO).toEqual({ minima: 0.5, defecto: 1, maxima: 2.5, paso: 0.1 });
});

describe("ajustarEscalaLogo", () => {
  test.each([
    [1, 1],
    [1.7, 1.7],
    [0.5, 0.5],
    [2.5, 2.5],
    // Fuera de rango: al límite más cercano; nunca negativo ni desaparece
    [0.1, 0.5],
    [-3, 0.5],
    [0, 0.5],
    [9, 2.5],
    // Dos decimales, como la base
    [1.234, 1.23],
    // Valores raros: tamaño normal
    [Number.NaN, 1],
    [Number.POSITIVE_INFINITY, 1],
  ])("%p → %p", (valor, esperado) => {
    expect(ajustarEscalaLogo(valor)).toBe(esperado);
  });
});

test("+ y − van de 0,1 en 0,1 sin acumular errores de coma flotante", () => {
  let escala = 1;

  for (let i = 0; i < 7; i += 1) {
    escala = aumentarEscalaLogo(escala);
  }

  expect(escala).toBe(1.7);
  expect(reducirEscalaLogo(1.7)).toBe(1.6);
});

test("no pasa de los límites aunque se siga pulsando", () => {
  expect(aumentarEscalaLogo(2.5)).toBe(2.5);
  expect(reducirEscalaLogo(0.5)).toBe(0.5);
});

test("se enseña en porcentaje", () => {
  expect(porcentajeEscalaLogo(1)).toBe("100 %");
  expect(porcentajeEscalaLogo(1.7)).toBe("170 %");
  expect(porcentajeEscalaLogo(0.5)).toBe("50 %");
});

describe("proporcionZonaLogo", () => {
  test("un logo horizontal manda su propia proporción: ocupa todo el ancho", () => {
    expect(proporcionZonaLogo(1200, 300)).toBe(4);
  });

  test("uno muy vertical no pasa de un cuadrado", () => {
    expect(proporcionZonaLogo(300, 1200)).toBe(1);
  });

  test("sin dimensiones válidas, sin proporción", () => {
    expect(proporcionZonaLogo(0, 100)).toBeNull();
    expect(proporcionZonaLogo(100, 0)).toBeNull();
  });
});
