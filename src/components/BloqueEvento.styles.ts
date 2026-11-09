import { StyleSheet } from "react-native";

import { Spacing } from "@/constants/theme";
import type { useTheme } from "@/hooks/use-theme";

type ColoresTema = ReturnType<typeof useTheme>;

// Bloques con título del formulario y del detalle de un evento
export function crearEstilosBloqueEvento(colores: ColoresTema) {
  return StyleSheet.create({
    formulario: {
      gap: Spacing.four,
    },
    bloque: {
      gap: Spacing.two,
    },
    bloqueCampos: {
      gap: Spacing.three,
    },
    titulo: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "700",
      letterSpacing: 0.5,
      textTransform: "uppercase",
      color: colores.textSecondary,
    },
    texto: {
      fontSize: 15,
      lineHeight: 22,
      color: colores.text,
    },
    secundario: {
      fontSize: 14,
      lineHeight: 19,
      color: colores.textSecondary,
    },
    importe: {
      fontSize: 17,
      lineHeight: 24,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
      color: colores.text,
    },
    acciones: {
      gap: Spacing.two,
    },
  });
}
