import { calcularDesplazamiento, type SituacionDesplazamiento } from "../desplazamiento";

// Pantalla de 800 de alto, zona desplazable desde 100 (bajo la cabecera del
// sistema) hasta abajo y barra inferior de 80
function situacion(cambios: Partial<SituacionDesplazamiento> = {}): SituacionDesplazamiento {
  return {
    desplazamientoActual: 300,
    zona: { arriba: 100, alto: 700 },
    objetivo: { arriba: 400, alto: 50 },
    altoVentana: 800,
    altoTeclado: 0,
    margenInferior: 80,
    ...cambios,
  };
}

// Lo visible va de 100 a 720 (800 − 80): centro en 410
const CENTRO_VISIBLE = 410;

test("si ya se ve cómodamente, no se mueve nada", () => {
  expect(calcularDesplazamiento(situacion())).toBeNull();
});

test("debajo de lo visible: lo sube hasta el centro", () => {
  const nuevo = calcularDesplazamiento(situacion({ objetivo: { arriba: 1000, alto: 50 } }));

  // Su centro (1025) pasa al centro de lo visible
  expect(nuevo).toBe(300 + 1025 - CENTRO_VISIBLE);
});

test("encima de lo visible: lo baja hasta el centro", () => {
  const nuevo = calcularDesplazamiento(
    situacion({ desplazamientoActual: 1000, objetivo: { arriba: -200, alto: 50 } })
  );

  expect(nuevo).toBe(1000 + -175 - CENTRO_VISIBLE);
});

test("pegado al borde de abajo (visible pero incómodo) también se centra", () => {
  expect(calcularDesplazamiento(situacion({ objetivo: { arriba: 690, alto: 40 } }))).not.toBeNull();
});

test("la barra inferior cuenta: lo que queda debajo de ella no se ve", () => {
  // Visible sin la barra, tapado con ella
  expect(calcularDesplazamiento(situacion({ objetivo: { arriba: 700, alto: 40 }, margenInferior: 0 }))).not.toBeNull();
  expect(calcularDesplazamiento(situacion({ objetivo: { arriba: 650, alto: 40 }, margenInferior: 0 }))).toBeNull();
});

test("con teclado, lo visible acaba donde empieza el teclado", () => {
  const sinTeclado = situacion({ objetivo: { arriba: 500, alto: 50 } });
  const conTeclado = { ...sinTeclado, altoTeclado: 350 };

  expect(calcularDesplazamiento(sinTeclado)).toBeNull();

  // Con teclado lo visible va de 100 a 450: centro en 275
  expect(calcularDesplazamiento(conTeclado)).toBe(300 + 525 - 275);
});

test("si la zona ya se ha encogido (Android ajusta la ventana), no se resta el teclado dos veces", () => {
  const nuevo = calcularDesplazamiento(
    situacion({ zona: { arriba: 100, alto: 350 }, altoTeclado: 350, objetivo: { arriba: 600, alto: 50 } })
  );

  // Lo visible: de 100 a 450 (lo que mide la zona), no de 100 a 100
  expect(nuevo).toBe(300 + 625 - 275);
});

test("nunca un desplazamiento negativo", () => {
  expect(
    calcularDesplazamiento(situacion({ desplazamientoActual: 0, objetivo: { arriba: 105, alto: 20 } }))
  ).toBe(0);
});

test("un objetivo más alto que lo visible se alinea por arriba, para ver su principio", () => {
  const nuevo = calcularDesplazamiento(situacion({ objetivo: { arriba: 1000, alto: 2000 } }));

  expect(nuevo).not.toBeNull();
  // El principio del objetivo queda dentro de lo visible
  const arribaTrasDesplazar = 1000 - ((nuevo ?? 0) - 300);
  expect(arribaTrasDesplazar).toBeGreaterThanOrEqual(100);
  expect(arribaTrasDesplazar).toBeLessThan(720);
});

test("sin nada visible (zona colapsada), no se mueve", () => {
  expect(calcularDesplazamiento(situacion({ zona: { arriba: 100, alto: 0 } }))).toBeNull();
});
