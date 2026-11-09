import { StyleSheet } from "react-native";

import { Spacing } from "@/constants/theme";
import type { useTheme } from "@/hooks/use-theme";

type ColoresTema = ReturnType<typeof useTheme>;

// Selector segmentado: un carril con las dos vistas; la elegida sobresale
export function crearEstilosSelectorApartado(colores: ColoresTema) {
  return StyleSheet.create({
    carril: {
      flexDirection: "row",
      gap: Spacing.one,
      padding: Spacing.one,
      borderRadius: 999,
      backgroundColor: colores.backgroundElement,
    },
    segmento: {
      flex: 1,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: Spacing.two,
      borderRadius: 999,
    },
    segmentoElegido: {
      backgroundColor: colores.background,
    },
    pulsado: {
      opacity: 0.6,
    },
    texto: {
      fontSize: 15,
      fontWeight: "500",
      textAlign: "center",
      color: colores.textSecondary,
    },
    // Negrita además del fondo: no depende solo del color
    textoElegido: {
      fontWeight: "700",
      color: colores.text,
    },
  });
}
