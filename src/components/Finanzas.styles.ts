import { StyleSheet, type ViewStyle } from "react-native";

import { Spacing } from "@/constants/theme";
import type { useTheme } from "@/hooks/use-theme";

type ColoresTema = ReturnType<typeof useTheme>;

const ALTURA_CONTROL = 52;
const RADIO_CONTROL = 12;

export function crearEstilosFinanzas(colores: ColoresTema) {
  return StyleSheet.create({
    importeBote: {
      fontSize: 38,
      lineHeight: 46,
      fontWeight: "700",
      textAlign: "center",
      fontVariant: ["tabular-nums"],
      color: colores.text,
    },
    negativo: {
      color: colores.error,
    },
    positivo: {
      color: colores.success,
    },
    datos: {
      gap: Spacing.two,
    },
    // Una etiqueta larga baja de línea sin empujar el importe fuera de la pantalla
    filaDato: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: Spacing.three,
    },
    etiquetaDato: {
      flex: 1,
      fontSize: 15,
      lineHeight: 21,
      color: colores.textSecondary,
    },
    valorDato: {
      fontSize: 15,
      lineHeight: 21,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
      color: colores.text,
    },
    valorDatoDestacado: {
      fontWeight: "700",
    },
    // Dato de texto largo (evento, notas): la etiqueta va encima
    bloqueDato: {
      gap: Spacing.half,
    },
    textoDato: {
      fontSize: 16,
      lineHeight: 22,
      color: colores.text,
    },
    filaMovimiento: {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.three,
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two,
      backgroundColor: colores.backgroundElement,
    },
    textosMovimiento: {
      flex: 1,
      gap: Spacing.half,
    },
    conceptoMovimiento: {
      fontSize: 16,
      lineHeight: 22,
      color: colores.text,
    },
    detalleMovimiento: {
      fontSize: 13,
      lineHeight: 18,
      color: colores.textSecondary,
    },
    importeMovimiento: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
      color: colores.text,
    },
    importeDetalle: {
      fontSize: 30,
      lineHeight: 38,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    pulsado: {
      opacity: 0.6,
    },
    deshabilitado: {
      opacity: 0.5,
    },
    campo: {
      gap: Spacing.two,
    },
    // Igual que la etiqueta de CampoFormulario
    etiquetaCampo: {
      fontSize: 14,
      fontWeight: "600",
      color: colores.text,
    },
    ayudaCampo: {
      fontSize: 14,
      lineHeight: 19,
      color: colores.textSecondary,
    },
    opciones: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: Spacing.two,
    },
    opcion: {
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: Spacing.three,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colores.backgroundSelected,
      backgroundColor: colores.background,
    },
    opcionElegida: {
      borderColor: colores.primary,
      backgroundColor: colores.primary,
    },
    textoOpcion: {
      fontSize: 15,
      fontWeight: "600",
      color: colores.text,
    },
    textoOpcionElegida: {
      color: colores.onPrimary,
    },
    // Elegida sin relleno: para formularios en los que el azul es de la acción principal
    opcionSuave: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.one,
      borderColor: colores.primary,
      backgroundColor: colores.backgroundSelected,
    },
    textoOpcionSuave: {
      color: colores.primary,
    },
    // Campo que abre un selector: se ve como los de texto
    campoSelector: {
      minHeight: ALTURA_CONTROL,
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.two,
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two,
      borderWidth: 1,
      borderRadius: RADIO_CONTROL,
      borderColor: colores.backgroundSelected,
      backgroundColor: colores.background,
    },
    // Sobre el fondo del formulario de eventos: igual que sus campos de texto
    campoDesplegable: {
      backgroundColor: colores.backgroundElement,
    },
    campoSelectorAbierto: {
      borderColor: colores.primary,
    },
    textoSelector: {
      flex: 1,
      fontSize: 16,
      lineHeight: 22,
      color: colores.text,
    },
    textoSelectorVacio: {
      color: colores.textSecondary,
    },
    flechaSelector: {
      fontSize: 22,
      lineHeight: 24,
      color: colores.textSecondary,
    },
    calendario: {
      borderRadius: RADIO_CONTROL,
      paddingBottom: Spacing.two,
      overflow: "hidden",
      backgroundColor: colores.background,
    },
    listaEventos: {
      borderRadius: RADIO_CONTROL,
      overflow: "hidden",
      gap: StyleSheet.hairlineWidth,
      backgroundColor: colores.backgroundSelected,
    },
    opcionEvento: {
      minHeight: 48,
      justifyContent: "center",
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two,
      backgroundColor: colores.background,
    },
    textoOpcionEvento: {
      fontSize: 15,
      lineHeight: 21,
      color: colores.text,
    },
    textoOpcionEventoElegida: {
      fontWeight: "700",
      color: colores.primary,
    },
    periodoInforme: {
      fontSize: 15,
      lineHeight: 21,
      color: colores.textSecondary,
    },
    bloqueInforme: {
      gap: Spacing.three,
    },
    mesEvolucion: {
      gap: Spacing.one,
    },
    pistaBarra: {
      height: 6,
      borderRadius: 3,
      overflow: "hidden",
      backgroundColor: colores.backgroundSelected,
    },
    barra: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colores.primary,
    },
    barraNegativa: {
      backgroundColor: colores.error,
    },
  });
}

// El ancho depende del dato: no puede ser un estilo fijo
export function crearAnchoBarra(porcentaje: number): ViewStyle {
  return { width: `${porcentaje}%` };
}
