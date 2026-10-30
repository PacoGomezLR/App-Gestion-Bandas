import { StyleSheet, type TextStyle, type ViewStyle } from "react-native";

import { Spacing } from "@/constants/theme";
import type { useTheme } from "@/hooks/use-theme";
import type { EstadoEvento } from "../types/evento";

type ColoresTema = ReturnType<typeof useTheme>;

export function crearEstilosListaEventos(colores: ColoresTema) {
  return StyleSheet.create({
    lista: {
      gap: Spacing.two,
    },
    tarjeta: {
      borderRadius: 16,
      backgroundColor: colores.backgroundElement,
    },
    // Toda la cabecera de la tarjeta es pulsable (más de 44 px de alto)
    vistaPrevia: {
      minHeight: 64,
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.three,
      borderRadius: 16,
    },
    vistaPreviaPulsada: {
      backgroundColor: colores.backgroundSelected,
    },
    // flexWrap: en pantallas estrechas el estado pasa debajo del título
    filaVistaPrevia: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      gap: Spacing.two,
    },
    // Tipo y lugar arriba, fecha debajo; el bloque cede espacio al estado
    textosVistaPrevia: {
      flexShrink: 1,
      gap: Spacing.half,
    },
    tipo: {
      fontSize: 17,
      lineHeight: 24,
      fontWeight: "600",
      color: colores.text,
    },
    // El lugar va en la misma línea, en segundo plano
    lugar: {
      fontWeight: "400",
      color: colores.textSecondary,
    },
    fechaVistaPrevia: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "500",
      color: colores.textSecondary,
    },
    badge: {
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
      gap: Spacing.one,
    },
    textoDetalle: {
      fontSize: 15,
      lineHeight: 22,
      color: colores.text,
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
