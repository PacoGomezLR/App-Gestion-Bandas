import type { CSSProperties } from "react";
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
      borderColor: colores.border,
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

// Web: el <input type="time"> es un elemento del navegador y lleva CSS, no
// estilos de React Native. Ocupa el resto de la fila (fácil de tocar) y no
// quita el contorno de foco del navegador.
// - 16px: Safari en iPhone no hace zoom al enfocarlo.
// - color-scheme dark: el selector y el icono del navegador en oscuro.
export function crearEstiloInputHoraWeb(colores: ColoresTema): CSSProperties {
  return {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    marginLeft: Spacing.three,
    padding: 0,
    border: "none",
    background: "transparent",
    color: colores.text,
    fontFamily: "inherit",
    fontSize: 16,
    textAlign: "right",
    colorScheme: "dark",
  };
}
