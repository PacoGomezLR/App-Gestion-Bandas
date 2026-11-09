import { StyleSheet } from "react-native";

import { Spacing } from "@/constants/theme";
import type { useTheme } from "@/hooks/use-theme";

type ColoresTema = ReturnType<typeof useTheme>;

// Formulario y detalle de un evento: etiqueta discreta encima de cada dato
export function crearEstilosBloqueEvento(colores: ColoresTema) {
  return StyleSheet.create({
    formulario: {
      gap: Spacing.four,
    },
    grupo: {
      gap: Spacing.three,
    },
    filaFechaHora: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: Spacing.three,
    },
    columna: {
      flex: 1,
    },
    // Misma altura que el campo de la hora, que tiene al lado
    fecha: {
      minHeight: 52,
      justifyContent: "center",
    },
    bloque: {
      gap: Spacing.half,
    },
    campo: {
      gap: Spacing.two,
    },
    etiqueta: {
      fontSize: 13,
      lineHeight: 18,
      color: colores.textSecondary,
    },
    // Igual que la etiqueta de CampoFormulario
    etiquetaCampo: {
      fontSize: 14,
      fontWeight: "600",
      color: colores.text,
    },
    valor: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: "500",
      fontVariant: ["tabular-nums"],
      color: colores.text,
    },
    secundario: {
      fontSize: 14,
      lineHeight: 19,
      color: colores.textSecondary,
    },
    acciones: {
      gap: Spacing.two,
    },
    // Una acción secundaria no ocupa todo el ancho: así no se mide con la principal
    accionSecundaria: {
      alignItems: "center",
      gap: Spacing.two,
    },
  });
}
