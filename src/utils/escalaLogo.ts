// Escala del logo de la banda: la misma que limita la base (migración 013)
export const ESCALA_LOGO = {
  minima: 0.5,
  defecto: 1,
  maxima: 2.5,
  paso: 0.1,
} as const;

// Dentro de los límites y con dos decimales, como la guarda la base. Un valor
// raro (NaN, de otra versión de la app…) vuelve al tamaño normal
export function ajustarEscalaLogo(valor: number): number {
  if (!Number.isFinite(valor)) {
    return ESCALA_LOGO.defecto;
  }

  const limitada = Math.min(ESCALA_LOGO.maxima, Math.max(ESCALA_LOGO.minima, valor));

  return Math.round(limitada * 100) / 100;
}

export function aumentarEscalaLogo(valor: number): number {
  return ajustarEscalaLogo(valor + ESCALA_LOGO.paso);
}

export function reducirEscalaLogo(valor: number): number {
  return ajustarEscalaLogo(valor - ESCALA_LOGO.paso);
}

// "170 %"
export function porcentajeEscalaLogo(valor: number): string {
  return `${Math.round(ajustarEscalaLogo(valor) * 100)} %`;
}

// Proporción mínima de la zona del logo (ancho / alto): uno muy vertical no
// pasa de un cuadrado; uno horizontal manda su propia proporción
const PROPORCION_MINIMA_ZONA = 1;

export function proporcionZonaLogo(ancho: number, alto: number): number | null {
  if (!(ancho > 0 && alto > 0)) {
    return null;
  }

  return Math.max(ancho / alto, PROPORCION_MINIMA_ZONA);
}
