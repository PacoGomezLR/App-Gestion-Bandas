import { StyleSheet } from "react-native";

import { Spacing } from "@/constants/theme";
import type { useTheme } from "@/hooks/use-theme";

type ColoresTema = ReturnType<typeof useTheme>;

const TAMANO_BOTON_ESCALA = 44;

export function crearEstilosPantallaLogoBanda(colores: ColoresTema) {
  return StyleSheet.create({
    vista: {
      gap: Spacing.three,
    },
    // Marco de la vista previa: superficie oscura (nunca blanca) para ver dónde
    // acaba la zona del logo. Dentro, el logo se ve igual que en el Calendario
    marco: {
      padding: Spacing.three,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colores.borderStrong,
      backgroundColor: colores.backgroundElement,
    },
    // Sin logo: un hueco discreto, solo en esta pantalla
    hueco: {
      minHeight: 120,
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: colores.borderStrong,
      alignItems: "center",
      justifyContent: "center",
    },
    textoHueco: {
      fontSize: 14,
      lineHeight: 20,
      color: colores.textSecondary,
    },
    // Tamaño   [−]   170 %   [+]
    filaEscala: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.three,
    },
    etiquetaEscala: {
      flex: 1,
      fontSize: 15,
      fontWeight: "600",
      color: colores.text,
    },
    botonEscala: {
      width: TAMANO_BOTON_ESCALA,
      height: TAMANO_BOTON_ESCALA,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colores.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colores.backgroundElement,
    },
    botonEscalaPulsado: {
      backgroundColor: colores.border,
    },
    botonEscalaDeshabilitado: {
      opacity: 0.4,
    },
    textoBotonEscala: {
      fontSize: 22,
      lineHeight: 24,
      fontWeight: "600",
      color: colores.text,
    },
    valorEscala: {
      minWidth: 64,
      textAlign: "center",
      fontSize: 16,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
      color: colores.text,
    },
    ayuda: {
      fontSize: 14,
      lineHeight: 20,
      color: colores.textSecondary,
    },
    acciones: {
      gap: Spacing.two,
    },
  });
}
