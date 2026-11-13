import { StyleSheet } from "react-native";

import { Spacing } from "@/constants/theme";
import type { useTheme } from "@/hooks/use-theme";

type ColoresTema = ReturnType<typeof useTheme>;

// Mismo lenguaje que «Cerrar sesión»: acción de texto discreta, arriba
export function crearEstilosBotonAtras(colores: ColoresTema) {
  return StyleSheet.create({
    boton: {
      minHeight: 44,
      minWidth: 44,
      justifyContent: "center",
      paddingHorizontal: Spacing.three,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: "transparent",
    },
    // Foco de teclado (web) visible sobre el fondo oscuro
    conFoco: {
      borderColor: colores.primary,
    },
    pulsado: {
      opacity: 0.6,
    },
    texto: {
      fontSize: 15,
      fontWeight: "600",
      color: colores.primaryPressed,
    },
  });
}
