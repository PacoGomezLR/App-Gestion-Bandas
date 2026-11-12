import { StyleSheet, type ViewStyle } from "react-native";

import { Spacing } from "@/constants/theme";
import type { useTheme } from "@/hooks/use-theme";

type ColoresTema = ReturnType<typeof useTheme>;

export const ANCHO_ANIO = 80;
export const SEPARACION_ANIOS = Spacing.two;

export function crearEstilosSelectorMesAnio(colores: ColoresTema) {
  return StyleSheet.create({
    contenedor: {
      flex: 1,
      justifyContent: "flex-end",
    },
    // Sin token de velo: el propio fondo de la app, atenuado
    fondo: {
      ...StyleSheet.absoluteFill,
      opacity: 0.7,
      backgroundColor: colores.background,
    },
    panel: {
      gap: Spacing.three,
      paddingHorizontal: Spacing.three,
      paddingTop: Spacing.four,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      // Sobre el velo oscuro, el borde marca dónde empieza el panel
      borderTopWidth: 1,
      borderColor: colores.border,
      backgroundColor: colores.backgroundElement,
    },
    titulo: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: "700",
      color: colores.text,
    },
    grupo: {
      gap: Spacing.two,
    },
    etiqueta: {
      fontSize: 14,
      fontWeight: "600",
      color: colores.text,
    },
    anios: {
      gap: SEPARACION_ANIOS,
    },
    meses: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      rowGap: Spacing.two,
    },
    opcion: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing.one,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colores.border,
      backgroundColor: colores.background,
    },
    opcionAnio: {
      width: ANCHO_ANIO,
    },
    opcionMes: {
      width: "23%",
    },
    opcionElegida: {
      borderColor: colores.primary,
      backgroundColor: colores.backgroundSelected,
    },
    pulsado: {
      opacity: 0.6,
    },
    texto: {
      fontSize: 15,
      fontWeight: "600",
      color: colores.text,
    },
    textoElegido: {
      color: colores.primaryPressed,
    },
    // Con el fondo de las opciones: el de BotonSecundario es el mismo que el del
    // panel y se perdería. Sin relleno de color: la principal es elegir un mes
    botonHoy: {
      minHeight: 52,
      alignItems: "center",
      justifyContent: "center",
      marginTop: Spacing.two,
      paddingHorizontal: Spacing.three,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colores.border,
      backgroundColor: colores.background,
    },
    textoBotonHoy: {
      fontSize: 16,
      fontWeight: "600",
      color: colores.primaryPressed,
    },
  });
}

// Depende del dispositivo: la barra de navegación de Android más un margen propio
export function crearMargenInferiorPanel(zonaSegura: number): ViewStyle {
  return { paddingBottom: zonaSegura + Spacing.four };
}
