import { StyleSheet } from "react-native";

import { Spacing } from "@/constants/theme";
import type { useTheme } from "@/hooks/use-theme";

type ColoresTema = ReturnType<typeof useTheme>;

export function crearEstilosPantallaInvitacion(colores: ColoresTema) {
  return StyleSheet.create({
    bloque: {
      gap: Spacing.two,
      alignItems: "center",
    },
    titulo: {
      fontSize: 22,
      lineHeight: 28,
      fontWeight: "700",
      textAlign: "center",
      color: colores.text,
    },
    texto: {
      fontSize: 16,
      lineHeight: 22,
      textAlign: "center",
      color: colores.textSecondary,
    },
    nombreBanda: {
      fontSize: 26,
      lineHeight: 32,
      fontWeight: "700",
      textAlign: "center",
      color: colores.primary,
    },
  });
}
