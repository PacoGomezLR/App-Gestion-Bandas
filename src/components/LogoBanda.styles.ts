import { StyleSheet, type ImageStyle, type ViewStyle } from "react-native";

import { Spacing } from "@/constants/theme";
import type { useTheme } from "@/hooks/use-theme";

type ColoresTema = ReturnType<typeof useTheme>;

// Proporción (ancho / alto) mientras la imagen no ha cargado: la de un logo
// horizontal típico. Al cargar se usa la real
export const PROPORCION_INICIAL_LOGO = 2.5;

export function crearEstilosLogoBanda(_colores: ColoresTema) {
  return StyleSheet.create({
    // Sin fondo, borde ni sombra: un PNG transparente se ve sobre el fondo de la
    // app. Lo que se sale al ampliar se recorta en el borde de la zona
    zona: {
      alignSelf: "center",
      overflow: "hidden",
    },
    imagen: {
      width: "100%",
      height: "100%",
    },
    // Portada: el logo arriba y, debajo, el título de siempre
    cabecera: {
      gap: Spacing.three,
    },
  });
}

// La zona del logo: manda el ancho disponible y la proporción de la imagen
// decide el alto (no hay alto máximo que encoja un logo horizontal).
// - Escala ≤ 1: la zona se estrecha (sin dejar hueco vacío alrededor).
// - Escala > 1: la zona ocupa todo el ancho y la imagen se amplía dentro de ella
//   (sirve para PNG con mucho margen transparente)
export function estiloZonaLogo(escala: number, proporcion: number): ViewStyle {
  return {
    width: `${Math.min(escala, 1) * 100}%`,
    aspectRatio: proporcion,
  };
}

export function estiloImagenLogo(escala: number): ImageStyle {
  return escala > 1 ? { transform: [{ scale: escala }] } : {};
}
