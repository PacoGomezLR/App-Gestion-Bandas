import { StyleSheet } from "react-native";

import { Spacing } from "@/constants/theme";
import type { useTheme } from "@/hooks/use-theme";

type ColoresTema = ReturnType<typeof useTheme>;

// Cápsula con las dos acciones del evento: un solo bloque, dos botones
export function crearEstilosAccionesEvento(colores: ColoresTema) {
  return StyleSheet.create({
    contenedor: {
      gap: Spacing.two,
    },
    capsula: {
      flexDirection: "row",
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colores.border,
      overflow: "hidden",
      backgroundColor: colores.backgroundElement,
    },
    // Las dos mitades iguales, con zona táctil de 44 px
    accion: {
      flex: 1,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: Spacing.two,
    },
    // Línea fina entre las dos acciones, dibujada como borde
    separador: {
      borderLeftWidth: 1,
      borderLeftColor: colores.border,
    },
    pulsado: {
      backgroundColor: colores.border,
    },
    deshabilitado: {
      opacity: 0.5,
    },
    textoEditar: {
      fontSize: 15,
      fontWeight: "600",
      color: colores.text,
    },
    // Peligrosa: en rojo, pero sin relleno que la haga parecer la principal
    textoEliminar: {
      fontSize: 15,
      fontWeight: "600",
      color: colores.error,
    },
  });
}
