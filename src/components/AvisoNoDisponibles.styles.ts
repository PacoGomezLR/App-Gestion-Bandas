import { StyleSheet } from "react-native";

import { Spacing } from "@/constants/theme";
import type { useTheme } from "@/hooks/use-theme";

type ColoresTema = ReturnType<typeof useTheme>;

export function crearEstilosAvisoNoDisponibles(colores: ColoresTema) {
  return StyleSheet.create({
    contenedor: {
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.three,
      borderRadius: 16,
      // Borde además del fondo: el aviso no depende solo del color
      borderWidth: 2,
      borderColor: colores.conflict,
      backgroundColor: colores.conflictBackground,
      gap: Spacing.one,
    },
    titulo: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: "700",
      color: colores.conflict,
    },
    integrante: {
      fontSize: 15,
      lineHeight: 21,
      color: colores.text,
    },
  });
}
