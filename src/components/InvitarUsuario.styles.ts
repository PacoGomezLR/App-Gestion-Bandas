import { StyleSheet } from "react-native";

import { Spacing } from "@/constants/theme";
import type { useTheme } from "@/hooks/use-theme";

type ColoresTema = ReturnType<typeof useTheme>;

export function crearEstilosInvitarUsuario(colores: ColoresTema) {
  return StyleSheet.create({
    etiqueta: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "700",
      letterSpacing: 0.5,
      textTransform: "uppercase",
      color: colores.textSecondary,
    },
    opciones: {
      gap: Spacing.two,
    },
    opcion: {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.three,
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colores.backgroundSelected,
      backgroundColor: colores.background,
    },
    opcionElegida: {
      borderColor: colores.primary,
    },
    radio: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: colores.textSecondary,
    },
    radioElegido: {
      borderWidth: 6,
      borderColor: colores.primary,
    },
    textosOpcion: {
      flex: 1,
      gap: Spacing.half,
    },
    textoOpcion: {
      fontSize: 16,
      fontWeight: "600",
      color: colores.text,
    },
    detalleOpcion: {
      fontSize: 14,
      lineHeight: 19,
      color: colores.textSecondary,
    },
    texto: {
      fontSize: 15,
      lineHeight: 21,
      color: colores.textSecondary,
    },
  });
}
