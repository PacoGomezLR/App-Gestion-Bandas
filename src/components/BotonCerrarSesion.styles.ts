import { StyleSheet } from "react-native";

import { Spacing } from "@/constants/theme";
import type { useTheme } from "@/hooks/use-theme";

type ColoresTema = ReturnType<typeof useTheme>;

export function crearEstilosBotonCerrarSesion(colores: ColoresTema) {
  return StyleSheet.create({
    contenedor: {
      alignItems: "flex-end",
      gap: Spacing.one,
      // Se suma al margen de la barra de estado que añade SafeAreaView
      paddingTop: Spacing.two,
    },
    // Con una acción a la izquierda («‹ Atrás»): ocupa todo el ancho
    fila: {
      alignSelf: "stretch",
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
    },
    izquierda: {
      alignItems: "flex-start",
    },
    derecha: {
      alignItems: "flex-end",
      gap: Spacing.one,
    },
    boton: {
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: Spacing.three,
    },
    texto: {
      fontSize: 15,
      fontWeight: "600",
      color: colores.primaryPressed,
    },
    pulsado: {
      opacity: 0.6,
    },
    deshabilitado: {
      opacity: 0.5,
    },
    error: {
      paddingHorizontal: Spacing.three,
      color: colores.error,
    },
  });
}
