import { StyleSheet } from "react-native";

import { Spacing } from "@/constants/theme";
import type { useTheme } from "@/hooks/use-theme";

type ColoresTema = ReturnType<typeof useTheme>;

// Mismo tamaño que los botones de la app (PantallaBase)
const ALTURA_BOTON = 52;
const RADIO_BOTON = 12;
// Las opciones y los botones forman una columna centrada, sin pegarse a los bordes
const ANCHO_MAXIMO = 360;

export function crearEstilosTuDisponibilidad(colores: ColoresTema) {
  return StyleSheet.create({
    contenedor: {
      gap: Spacing.three,
      alignItems: "center",
    },
    // Las dos opciones: mismo ancho, misma altura, centradas como grupo
    opciones: {
      flexDirection: "row",
      justifyContent: "center",
      gap: Spacing.two,
      width: "100%",
      maxWidth: ANCHO_MAXIMO,
    },
    opcion: {
      flex: 1,
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing.two,
      paddingHorizontal: Spacing.two,
      borderRadius: RADIO_BOTON,
      borderWidth: 1,
      borderColor: colores.backgroundSelected,
      backgroundColor: colores.background,
    },
    opcionDisponible: {
      borderColor: colores.success,
      backgroundColor: colores.successBackground,
    },
    opcionNoDisponible: {
      borderColor: colores.conflict,
      backgroundColor: colores.conflictBackground,
    },
    radio: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: colores.textSecondary,
    },
    radioElegido: {
      borderWidth: 6,
      borderColor: colores.text,
    },
    textoOpcion: {
      fontSize: 15,
      fontWeight: "500",
      color: colores.textSecondary,
    },
    textoOpcionElegida: {
      fontWeight: "700",
      color: colores.text,
    },
    acciones: {
      width: "100%",
      maxWidth: ANCHO_MAXIMO,
      gap: Spacing.two,
    },
    boton: {
      minHeight: ALTURA_BOTON,
      alignSelf: "stretch",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: Spacing.three,
      borderRadius: RADIO_BOTON,
    },
    // Jerarquía: "+ Crear evento" es el único botón relleno del panel.
    // Guardar disponibilidad es tonal (principal del bloque, sin competir) y
    // Descartar cambios es solo texto.
    botonGuardar: {
      backgroundColor: colores.infoBackground,
    },
    textoGuardar: {
      fontSize: 16,
      fontWeight: "700",
      textAlign: "center",
      color: colores.info,
    },
    botonDescartar: {
      backgroundColor: "transparent",
    },
    textoDescartar: {
      fontSize: 15,
      fontWeight: "600",
      textAlign: "center",
      color: colores.textSecondary,
    },
    pulsado: {
      opacity: 0.7,
    },
    deshabilitado: {
      opacity: 0.45,
    },
  });
}
