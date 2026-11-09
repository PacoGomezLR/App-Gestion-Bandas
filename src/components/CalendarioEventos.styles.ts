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
    // Cabecera propia: los mismos tamaños que la de la librería
    filaCabecera: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 6,
    },
    flecha: {
      minWidth: 44,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    imagenFlecha: {
      tintColor: colores.primary,
    },
    diasSemana: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginTop: Spacing.half,
    },
    diaSemana: {
      width: 32,
      marginBottom: 7,
      textAlign: "center",
      fontSize: 13,
      fontWeight: "600",
      color: colores.textSecondary,
    },
    // Se ve como el título de la librería, con zona táctil de 44 px
    tituloMes: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.one,
      paddingHorizontal: Spacing.two,
    },
    tituloMesPulsado: {
      opacity: 0.6,
    },
    textoTituloMes: {
      fontSize: 18,
      fontWeight: "700",
      color: colores.text,
    },
    flechaTituloMes: {
      fontSize: 18,
      color: colores.textSecondary,
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

// Una fila de días: 32 px del día y 7 px de margen arriba y abajo. La librería
// no escala ese texto, así que el alto no depende de la fuente del móvil
const ALTO_SEMANA = 46;
export const SEMANAS_RESERVADAS = 6;

// Reserva siempre 6 semanas: el mes no cambia el alto ni mueve lo de debajo.
// showSixWeeks no sirve: su cálculo supone semanas en domingo y, empezando en
// lunes, da entre 5 y 7 filas. Esta clave de la librería no está en su tipo Theme
export function crearTemaCalendarioFijo(colores: ColoresTema): Theme {
  const tema = {
    ...crearTemaCalendario(colores),
    "stylesheet.calendar.main": {
      monthView: {
        minHeight: ALTO_SEMANA * SEMANAS_RESERVADAS,
        backgroundColor: colores.backgroundElement,
      },
    },
  };

  return tema;
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
