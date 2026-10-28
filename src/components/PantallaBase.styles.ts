import { StyleSheet } from "react-native";

import { Spacing } from "@/constants/theme";
import type { useTheme } from "@/hooks/use-theme";

type ColoresTema = ReturnType<typeof useTheme>;

const ALTURA_CONTROL = 52;
const RADIO_CONTROL = 12;

// Recibe los colores del esquema actual (claro u oscuro)
export function crearEstilosPantallaBase(colores: ColoresTema) {
  return StyleSheet.create({
    pagina: {
      flex: 1,
      backgroundColor: colores.background,
    },
    teclado: {
      flex: 1,
    },
    contenido: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: Spacing.four,
      paddingVertical: Spacing.five,
    },
    // Ocupa todo el ancho en móvil y se limita en pantallas grandes
    columna: {
      width: "100%",
      maxWidth: 440,
      alignSelf: "center",
      gap: Spacing.three,
    },
    cabecera: {
      gap: Spacing.two,
      marginBottom: Spacing.four,
    },
    marca: {
      fontSize: 34,
      lineHeight: 40,
      fontWeight: "700",
      color: colores.text,
    },
    subtitulo: {
      fontSize: 17,
      lineHeight: 24,
      color: colores.textSecondary,
    },
    campo: {
      gap: Spacing.two,
    },
    etiqueta: {
      fontSize: 14,
      fontWeight: "600",
      color: colores.text,
    },
    entrada: {
      minHeight: ALTURA_CONTROL,
      paddingHorizontal: Spacing.three,
      borderWidth: 1,
      borderRadius: RADIO_CONTROL,
      fontSize: 16,
      color: colores.text,
      backgroundColor: colores.backgroundElement,
      borderColor: colores.backgroundSelected,
    },
    entradaEnfocada: {
      borderColor: colores.primary,
    },
    boton: {
      minHeight: ALTURA_CONTROL,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: Spacing.three,
      borderRadius: RADIO_CONTROL,
      marginTop: Spacing.two,
      backgroundColor: colores.primary,
    },
    textoBoton: {
      fontSize: 16,
      fontWeight: "600",
      color: colores.onPrimary,
    },
    pulsado: {
      opacity: 0.85,
    },
    deshabilitado: {
      opacity: 0.5,
    },
    accionSecundaria: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      alignItems: "center",
      gap: Spacing.one,
      marginTop: Spacing.two,
    },
    pregunta: {
      color: colores.textSecondary,
    },
    enlace: {
      fontWeight: "600",
      paddingVertical: Spacing.one,
      color: colores.primary,
    },
    mensaje: {
      padding: Spacing.three,
      borderRadius: RADIO_CONTROL,
    },
    mensajeError: {
      backgroundColor: colores.errorBackground,
    },
    mensajeInfo: {
      backgroundColor: colores.infoBackground,
    },
    textoError: {
      color: colores.error,
    },
    textoInfo: {
      color: colores.info,
    },
  });
}
