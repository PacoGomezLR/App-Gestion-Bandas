import { StyleSheet } from "react-native";

import { Spacing } from "@/constants/theme";
import type { useTheme } from "@/hooks/use-theme";

type ColoresTema = ReturnType<typeof useTheme>;

export function crearEstilosBotonGoogleMaps(colores: ColoresTema) {
  return StyleSheet.create({
    contenedor: {
      gap: Spacing.two,
    },
    // Acción contextual: con borde y sin relleno de color, para no competir con Editar
    boton: {
      minHeight: 44,
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.two,
      paddingHorizontal: Spacing.three,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colores.backgroundSelected,
      backgroundColor: colores.background,
    },
    pulsado: {
      opacity: 0.6,
    },
    texto: {
      fontSize: 15,
      fontWeight: "600",
      color: colores.primary,
    },
  });
}
