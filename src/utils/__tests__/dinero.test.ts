import {
  formatearCentimos,
  formatearImporteMovimiento,
  importeParaFormulario,
  parsearImporte,
} from "../dinero";

function centimos(texto: string): number | null {
  const resultado = parsearImporte(texto);

  return resultado.valido ? resultado.centimos : null;
}

function error(texto: string): string | null {
  const resultado = parsearImporte(texto);

  return resultado.valido ? null : resultado.error;
}

describe("parsearImporte", () => {
  test.each([
    ["12", 1200],
    ["12,5", 1250],
    ["12,50", 1250],
    ["12.50", 1250],
    ["12.5", 1250],
    ["0,01", 1],
    ["0.10", 10],
    ["007", 700],
    ["  12,50  ", 1250],
    ["999999999,99", 99999999999],
  ])("%s → %i céntimos", (texto, esperado) => {
    expect(centimos(texto)).toBe(esperado);
  });

  // Valores que con parseFloat(valor) * 100 dan decimales de más
  test.each([
    ["1,10", 110],
    ["4,35", 435],
    ["19,99", 1999],
    ["1,15", 115],
    ["8,20", 820],
    ["1001,10", 100110],
  ])("%s es exacto, sin errores de coma flotante", (texto, esperado) => {
    expect(centimos(texto)).toBe(esperado);
  });

  test("devuelve siempre un entero", () => {
    for (let decimales = 0; decimales < 100; decimales += 1) {
      const valor = centimos(`3,${String(decimales).padStart(2, "0")}`);

      expect(valor).toBe(300 + decimales);
      expect(Number.isInteger(valor)).toBe(true);
    }
  });

  test("rechaza más de dos decimales", () => {
    expect(error("12,345")).toBe("El importe admite como máximo dos decimales");
    expect(error("12.345")).toBe("El importe admite como máximo dos decimales");
  });

  test("no adivina si un punto es de miles", () => {
    expect(centimos("1.245")).toBeNull();
    expect(centimos("1.245,50")).toBeNull();
    expect(centimos("1,245.50")).toBeNull();
  });

  test.each(["abc", "12a", "1e3", "12,", ",50", "1 000", "12€", "0x10", "Infinity", "NaN"])(
    "rechaza %s",
    (texto) => {
      expect(error(texto)).toBe("Escribe el importe solo con números, por ejemplo 12,50");
    }
  );

  test("rechaza el importe vacío", () => {
    expect(error("")).toBe("El importe es obligatorio");
    expect(error("   ")).toBe("El importe es obligatorio");
  });

  test.each(["0", "0,00", "0.0", "000"])("rechaza %s", (texto) => {
    expect(error(texto)).toBe("El importe debe ser mayor que cero");
  });

  test("rechaza los negativos", () => {
    expect(error("-5")).toBe("El importe debe ser mayor que cero");
    expect(error("-12,50")).toBe("El importe debe ser mayor que cero");
  });

  test("rechaza lo que supera el límite de la base", () => {
    expect(error("1000000000")).toBe("El importe es demasiado alto");
    expect(error("99999999999999999999999")).toBe("El importe es demasiado alto");
  });
});

describe("formatearCentimos", () => {
  // getByText normaliza el espacio fijo, pero aquí se comprueba el texto exacto
  const conEuro = (texto: string) => `${texto} €`;

  test.each([
    [0, "0,00"],
    [5, "0,05"],
    [50, "0,50"],
    [8500, "85,00"],
    [99999, "999,99"],
    [100000, "1.000,00"],
    [124550, "1.245,50"],
    [123456789, "1.234.567,89"],
    [99999999999, "999.999.999,99"],
    [-3550, "-35,50"],
    [-124550, "-1.245,50"],
  ])("%i → %s €", (valor, esperado) => {
    expect(formatearCentimos(valor)).toBe(conEuro(esperado));
  });

  test("el signo del movimiento lo da su tipo", () => {
    expect(formatearImporteMovimiento("ingreso", 35000)).toBe(conEuro("+350,00"));
    expect(formatearImporteMovimiento("gasto", 3550)).toBe(conEuro("-35,50"));
  });
});

describe("importeParaFormulario", () => {
  test.each([
    [1250, "12,50"],
    [5, "0,05"],
    [124550, "1245,50"],
  ])("%i → %s", (valor, esperado) => {
    expect(importeParaFormulario(valor)).toBe(esperado);
  });

  test("lo escrito se puede volver a leer sin cambiar el importe", () => {
    for (const valor of [1, 99, 100, 1250, 124550, 99999999999]) {
      expect(centimos(importeParaFormulario(valor))).toBe(valor);
    }
  });
});

describe("parsearImporte con permitirCero (caché de un evento)", () => {
  const cache = (texto: string) => parsearImporte(texto, { permitirCero: true });

  test.each([
    ["1200", 120000],
    ["1200,5", 120050],
    ["1200,50", 120050],
    ["1200.50", 120050],
    ["1250,50", 125050],
    ["100", 10000],
    ["100,5", 10050],
    ["100.50", 10050],
    ["0", 0],
    ["0,00", 0],
  ])("%s → %i céntimos", (texto, esperado) => {
    expect(cache(texto)).toEqual({ valido: true, centimos: esperado });
  });

  test("rechaza negativos, letras y más de dos decimales", () => {
    expect(cache("-100")).toEqual({ valido: false, error: "El importe no puede ser negativo" });
    expect(cache("abc")).toMatchObject({ valido: false });
    expect(cache("12,345")).toEqual({
      valido: false,
      error: "El importe admite como máximo dos decimales",
    });
  });

  test("Finanzas sigue sin admitir 0", () => {
    expect(parsearImporte("0")).toEqual({
      valido: false,
      error: "El importe debe ser mayor que cero",
    });
  });

  test("el formato en español sirve también para el caché", () => {
    expect(formatearCentimos(120000)).toBe("1.200,00\u00A0€");
    expect(formatearCentimos(0)).toBe("0,00\u00A0€");
  });
});
