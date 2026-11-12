// Cuánto desplazar una pantalla para que un elemento quede a la vista, más o
// menos en el centro. Todo en coordenadas de ventana (lo que da measureInWindow).

export interface MedidaEnVentana {
  arriba: number;
  alto: number;
}

export interface SituacionDesplazamiento {
  // Lo ya desplazado (contentOffset.y del ScrollView)
  desplazamientoActual: number;
  // Dónde está y cuánto mide la zona desplazable en la ventana
  zona: MedidaEnVentana;
  objetivo: MedidaEnVentana;
  altoVentana: number;
  // 0 si no hay teclado
  altoTeclado: number;
  // Lo que tapa abajo (la barra de pestañas) cuando no hay teclado
  margenInferior: number;
}

// Fracción de la zona visible que se deja libre arriba y abajo: dentro de esa
// zona cómoda no se mueve nada (no hay desplazamientos inútiles)
export const MARGEN_COMODO = 0.12;

// Nuevo desplazamiento (≥ 0), o null si el elemento ya se ve cómodamente
export function calcularDesplazamiento({
  desplazamientoActual,
  zona,
  objetivo,
  altoVentana,
  altoTeclado,
  margenInferior,
}: SituacionDesplazamiento): number | null {
  const visibleArriba = zona.arriba;
  // Con teclado manda el teclado; sin él, la barra inferior. Y nunca más allá de
  // la propia zona (en Android la ventana ya se encoge con el teclado)
  const tapadoAbajo = altoTeclado > 0 ? altoTeclado : margenInferior;
  const visibleAbajo = Math.min(zona.arriba + zona.alto, altoVentana - tapadoAbajo);
  const altoVisible = visibleAbajo - visibleArriba;

  if (altoVisible <= 0) {
    return null;
  }

  const margen = altoVisible * MARGEN_COMODO;
  const yaVisible =
    objetivo.arriba >= visibleArriba + margen &&
    objetivo.arriba + objetivo.alto <= visibleAbajo - margen;

  if (yaVisible) {
    return null;
  }

  // Centro del objetivo sobre el centro de lo visible. Si el objetivo es más
  // alto que lo visible, se alinea su parte de arriba para que se vea el principio
  const destinoCentro = visibleArriba + altoVisible / 2;
  const centroObjetivo =
    objetivo.alto > altoVisible ? objetivo.arriba + altoVisible / 2 - margen : objetivo.arriba + objetivo.alto / 2;

  return Math.max(0, Math.round(desplazamientoActual + centroObjetivo - destinoCentro));
}
