import { StyleSheet } from "react-native";

import { Spacing } from "@/constants/theme";
import type { useTheme } from "@/hooks/use-theme";

type ColoresTema = ReturnType<typeof useTheme>;

// Recibe los colores del esquema actual (claro u oscuro)
export function crearEstilosPaginaInvitacionWeb(colores: ColoresTema) {
  return StyleSheet.create({
    pagina: {
      flex: 1,
      paddingHorizontal: Spacing.four,
      paddingVertical: Spacing.five,
      backgroundColor: colores.background,
    },
    // Ocupa todo el ancho en móvil y se limita en escritorio
    columna: {
      width: "100%",
      maxWidth: 440,
      alignSelf: "center",
      gap: Spacing.three,
    },
    marca: {
      fontSize: 34,
      lineHeight: 40,
      fontWeight: "700",
      color: colores.text,
    },
    titulo: {
      fontSize: 22,
      lineHeight: 28,
      fontWeight: "700",
      color: colores.text,
    },
    texto: {
      fontSize: 17,
      lineHeight: 24,
      color: colores.textSecondary,
    },
    boton: {
      minHeight: 52,
      marginTop: Spacing.two,
      paddingHorizontal: Spacing.four,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colores.primary,
    },
    botonPulsado: {
      opacity: 0.85,
    },
    textoBoton: {
      fontSize: 17,
      fontWeight: "700",
      color: colores.onPrimary,
    },
    nota: {
      marginTop: Spacing.three,
      padding: Spacing.three,
      gap: Spacing.one,
      borderRadius: 12,
      backgroundColor: colores.backgroundElement,
    },
    tituloNota: {
      fontSize: 15,
      fontWeight: "600",
      color: colores.text,
    },
    textoNota: {
      fontSize: 15,
      lineHeight: 22,
      color: colores.textSecondary,
    },
    error: {
      padding: Spacing.three,
      borderRadius: 12,
      fontSize: 17,
      lineHeight: 24,
      color: colores.error,
      backgroundColor: colores.errorBackground,
    },
  });
}
