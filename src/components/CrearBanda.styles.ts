import { StyleSheet } from "react-native";

import type { useTheme } from "@/hooks/use-theme";

type ColoresTema = ReturnType<typeof useTheme>;

export function crearEstilosCrearBanda(colores: ColoresTema) {
  return StyleSheet.create({
    introduccion: {
      fontSize: 16,
      lineHeight: 24,
      color: colores.textSecondary,
    },
  });
}
