import { StyleSheet } from "react-native";

import { BottomTabInset, Spacing } from "@/constants/theme";
import type { useTheme } from "@/hooks/use-theme";

type ColoresTema = ReturnType<typeof useTheme>;

const RADIO_TARJETA = 16;

// Piezas comunes de las pantallas interiores (Calendario ahora; Técnicos después)
export function crearEstilosPantallaInterior(colores: ColoresTema) {
  return StyleSheet.create({
    pagina: {
      flex: 1,
      backgroundColor: colores.background,
    },
    contenido: {
      paddingHorizontal: Spacing.three,
      // Deja libre la zona de las pestañas inferiores
      paddingBottom: BottomTabInset + Spacing.five,
      gap: Spacing.four,
    },
    cargando: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing.three,
      backgroundColor: colores.background,
    },
    textoCargando: {
      color: colores.textSecondary,
    },
    cabecera: {
      gap: Spacing.one,
    },
    titulo: {
      fontSize: 32,
      lineHeight: 38,
      fontWeight: "700",
      color: colores.text,
    },
    subtitulo: {
      fontSize: 16,
      lineHeight: 22,
      color: colores.textSecondary,
    },
    seccion: {
      gap: Spacing.three,
    },
    cabeceraSeccion: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: Spacing.two,
    },
    tituloSeccion: {
      fontSize: 20,
      lineHeight: 26,
      fontWeight: "700",
      color: colores.text,
    },
    // Acción secundaria con zona táctil de 44 px
    botonTexto: {
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: Spacing.three,
      borderRadius: 999,
      backgroundColor: colores.backgroundElement,
    },
    textoBotonTexto: {
      fontSize: 15,
      fontWeight: "600",
      color: colores.primary,
    },
    pulsado: {
      opacity: 0.6,
    },
    deshabilitado: {
      opacity: 0.5,
    },
    vacio: {
      paddingVertical: Spacing.five,
      paddingHorizontal: Spacing.four,
      borderRadius: RADIO_TARJETA,
      alignItems: "center",
      gap: Spacing.one,
      backgroundColor: colores.backgroundElement,
    },
    textoVacio: {
      fontSize: 17,
      fontWeight: "600",
      textAlign: "center",
      color: colores.text,
    },
    detalleVacio: {
      fontSize: 15,
      lineHeight: 21,
      textAlign: "center",
      color: colores.textSecondary,
    },
  });
}
