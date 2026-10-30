import { StyleSheet } from "react-native";
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
