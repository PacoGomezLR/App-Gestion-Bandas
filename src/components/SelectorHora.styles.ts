import { StyleSheet } from "react-native";

import { Spacing } from "@/constants/theme";
import type { useTheme } from "@/hooks/use-theme";

type ColoresTema = ReturnType<typeof useTheme>;

export function crearEstilosSelectorHora(colores: ColoresTema) {
  return StyleSheet.create({
    contenedor: {
      gap: Spacing.two,
    },
    campo: {
      minHeight: 52,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: Spacing.three,
      borderWidth: 1,
      borderRadius: 12,
      borderColor: colores.backgroundSelected,
      backgroundColor: colores.backgroundElement,
    },
    texto: {
      fontSize: 16,
      color: colores.text,
    },
    valor: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.two,
    },
    campoDeshabilitado: {
      opacity: 0.5,
    },
  });
}
