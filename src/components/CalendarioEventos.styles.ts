import { StyleSheet, type TextStyle, type ViewStyle } from "react-native";
import type { Theme } from "react-native-calendars/src/types";

import { Spacing } from "@/constants/theme";
import type { useTheme } from "@/hooks/use-theme";

type ColoresTema = ReturnType<typeof useTheme>;

export function crearEstilosCalendarioEventos(colores: ColoresTema) {
  return StyleSheet.create({
    contenedor: {
      gap: Spacing.two,
    },
    fechaSeleccionada: {
      fontSize: 15,
      fontWeight: "600",
      color: colores.textSecondary,
    },
    calendario: {
      borderRadius: 16,
      paddingBottom: Spacing.two,
      overflow: "hidden",
      backgroundColor: colores.backgroundElement,
    },
  });
}

// Radio que react-native-calendars pone por defecto a los días con customStyles
const RADIO_DIA = 16;

// Día con algún integrante no disponible: un anillo alrededor del número.
// Es otra forma, no solo otro color: el punto del evento sigue visible debajo.
// Seleccionado, el texto conserva el color de la selección para leerse bien.
// Objetos planos y nuevos en cada llamada, NO StyleSheet.create: la librería
// escribe borderRadius en customStyles.container si falta, y un estilo de
// StyleSheet está congelado ("Cannot add new property 'borderRadius'").
export function crearMarcaNoDisponible(
  colores: ColoresTema,
  seleccionado: boolean
): { container: ViewStyle; text: TextStyle } {
  return {
    container: {
      borderWidth: 2,
      borderColor: colores.conflict,
      // Explícito: así la librería no necesita añadirlo
      borderRadius: RADIO_DIA,
    },
    text: seleccionado
      ? { fontWeight: "700" }
      : { fontWeight: "700", color: colores.conflict },
  };
}

// Colores y tipografía de react-native-calendars a partir del tema de la app
export function crearTemaCalendario(colores: ColoresTema): Theme {
  return {
    calendarBackground: colores.backgroundElement,
    monthTextColor: colores.text,
    textMonthFontSize: 18,
    textMonthFontWeight: "700",
    textSectionTitleColor: colores.textSecondary,
    textDayHeaderFontSize: 13,
    textDayHeaderFontWeight: "600",
    dayTextColor: colores.text,
    textDayFontSize: 16,
    textDayFontWeight: "500",
    textDisabledColor: colores.backgroundSelected,
    todayTextColor: colores.primary,
    selectedDayBackgroundColor: colores.primary,
    selectedDayTextColor: colores.onPrimary,
    dotColor: colores.primary,
    selectedDotColor: colores.onPrimary,
    arrowColor: colores.primary,
  };
}
