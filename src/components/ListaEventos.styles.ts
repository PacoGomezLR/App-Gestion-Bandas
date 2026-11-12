import { StyleSheet, type TextStyle, type ViewStyle } from "react-native";

import { Spacing } from "@/constants/theme";
import type { useTheme } from "@/hooks/use-theme";
import type { EstadoEvento } from "../types/evento";

type ColoresTema = ReturnType<typeof useTheme>;

const TAMANO_CERRAR = 44;

export function crearEstilosListaEventos(colores: ColoresTema) {
  return StyleSheet.create({
    lista: {
      gap: Spacing.two,
    },
    // Superficie elevada y borde marcado: la tarjeta se despega del fondo casi negro
    tarjeta: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colores.borderStrong,
      backgroundColor: colores.backgroundSelected,
    },
    // Toda la cabecera de la tarjeta es pulsable (más de 44 px de alto)
    vistaPrevia: {
      minHeight: 64,
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.three,
      borderRadius: 16,
    },
    // Abierta, deja sitio al botón de cierre: el badge no queda debajo
    vistaPreviaAbierta: {
      paddingRight: Spacing.three + TAMANO_CERRAR,
    },
    vistaPreviaPulsada: {
      backgroundColor: colores.border,
    },
    // Arriba a la derecha, centrado con la primera línea. Zona táctil de 44 px
    // aunque el icono sea pequeño
    botonCerrar: {
      position: "absolute",
      top: Spacing.one + Spacing.half,
      right: Spacing.one,
      width: TAMANO_CERRAR,
      height: TAMANO_CERRAR,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 999,
    },
    botonCerrarPulsado: {
      backgroundColor: colores.border,
    },
    textoCerrar: {
      fontSize: 18,
      lineHeight: 22,
      color: colores.textSecondary,
    },
    // Tipo, lugar y fecha, uno debajo de otro
    textosVistaPrevia: {
      gap: Spacing.half,
    },
    // Primera línea: tipo a la izquierda y estado a la derecha, sin saltar de fila
    filaVistaPrevia: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: Spacing.two,
    },
    // Ocupa lo que deja el badge; si no cabe, el tipo baja de línea
    tipo: {
      flex: 1,
      fontSize: 17,
      lineHeight: 24,
      fontWeight: "600",
      color: colores.text,
    },
    // Segunda y tercera línea: información secundaria, con el mismo estilo
    lugar: {
      fontSize: 15,
      lineHeight: 20,
      color: colores.textSecondary,
    },
    fechaVistaPrevia: {
      fontSize: 15,
      lineHeight: 20,
      fontVariant: ["tabular-nums"],
      color: colores.textSecondary,
    },
    // Nunca se encoge: el texto largo es el tipo, no el estado
    badge: {
      flexShrink: 0,
      paddingHorizontal: Spacing.two + Spacing.half,
      paddingVertical: Spacing.half,
      borderRadius: 999,
    },
    textoBadge: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "600",
    },
    detalle: {
      paddingHorizontal: Spacing.three,
      paddingBottom: Spacing.three,
      gap: Spacing.three,
    },
    fondoPendiente: {
      backgroundColor: colores.warningBackground,
    },
    textoPendiente: {
      color: colores.warning,
    },
    fondoConfirmado: {
      backgroundColor: colores.successBackground,
    },
    textoConfirmado: {
      color: colores.success,
    },
  });
}

type EstilosListaEventos = ReturnType<typeof crearEstilosListaEventos>;

// Record obliga a dar colores a cada estado: si se añade uno, TypeScript avisa aquí
export function coloresBadge(
  estilos: EstilosListaEventos
): Record<EstadoEvento, { fondo: ViewStyle; texto: TextStyle }> {
  return {
    pendiente: { fondo: estilos.fondoPendiente, texto: estilos.textoPendiente },
    confirmado: { fondo: estilos.fondoConfirmado, texto: estilos.textoConfirmado },
  };
}
