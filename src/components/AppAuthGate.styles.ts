import { StyleSheet } from "react-native";

import { Spacing } from "@/constants/theme";
import type { useTheme } from "@/hooks/use-theme";

type ColoresTema = ReturnType<typeof useTheme>;

export function crearEstilosAppAuthGate(colores: ColoresTema) {
  return StyleSheet.create({
    cargando: {
      alignItems: "center",
      gap: Spacing.three,
    },
    textoCargando: {
      color: colores.textSecondary,
    },
  });
}
