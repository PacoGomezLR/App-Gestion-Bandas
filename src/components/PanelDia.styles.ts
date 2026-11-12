import { StyleSheet } from "react-native";

import { Spacing } from "@/constants/theme";
import type { useTheme } from "@/hooks/use-theme";

type ColoresTema = ReturnType<typeof useTheme>;

export function crearEstilosPanelDia(colores: ColoresTema) {
  return StyleSheet.create({
    // Pegado al calendario: el borde superior con el color de la selección
    // lo une visualmente al día elegido
    panel: {
      marginTop: -Spacing.two,
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.three,
      borderRadius: 16,
      borderTopWidth: 3,
      borderTopColor: colores.primary,
      backgroundColor: colores.backgroundElement,
      gap: Spacing.four,
    },
    fecha: {
      fontSize: 20,
      lineHeight: 26,
      fontWeight: "700",
      color: colores.text,
    },
    bloque: {
      gap: Spacing.two,
    },
    // El formulario desplegado se separa del resto con una línea
    formulario: {
      paddingBottom: Spacing.three,
      borderBottomWidth: 1,
      borderBottomColor: colores.border,
      gap: Spacing.two,
    },
    tituloBloque: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "700",
      letterSpacing: 0.5,
      textTransform: "uppercase",
      color: colores.textSecondary,
    },
  });
}
