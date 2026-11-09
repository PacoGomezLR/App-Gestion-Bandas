import { useMemo } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { weekDayNames } from "react-native-calendars/src/dateutils";

import { useTheme } from "@/hooks/use-theme";
import { etiquetaMes } from "../utils/fechas";
import { crearEstilosCalendarioEventos } from "./CalendarioEventos.styles";

const PRIMER_DIA_SEMANA = 1;

const FLECHA_ANTERIOR = require("react-native-calendars/src/calendar/img/previous.png");
const FLECHA_SIGUIENTE = require("react-native-calendars/src/calendar/img/next.png");

// Lo que la librería pasa a una cabecera propia
interface CabeceraCalendarioProps {
  month?: { toString: (formato: string) => string };
  addMonth?: (meses: number) => void;
}

// Sustituye a la de la librería, que oculta su título y sus flechas a los lectores
// de pantalla. Se ve igual: mismas flechas, mismos días, mismo tema
export function crearCabeceraCalendario(onAbrirSelector: (mes: string) => void) {
  return function CabeceraCalendario({ month, addMonth }: CabeceraCalendarioProps) {
    const tema = useTheme();
    const estilos = useMemo(() => crearEstilosCalendarioEventos(tema), [tema]);
    const mes = month?.toString("yyyy-MM") ?? "";
    const titulo = etiquetaMes(mes);

    return (
      <View>
        <View style={estilos.filaCabecera}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mes anterior"
            onPress={() => addMonth?.(-1)}
            style={({ pressed }) => [estilos.flecha, pressed && estilos.tituloMesPulsado]}
          >
            <Image source={FLECHA_ANTERIOR} style={estilos.imagenFlecha} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Cambiar mes y año. ${titulo}`}
            onPress={() => onAbrirSelector(mes)}
            style={({ pressed }) => [estilos.tituloMes, pressed && estilos.tituloMesPulsado]}
          >
            <Text style={estilos.textoTituloMes}>{titulo}</Text>
            <Text style={estilos.flechaTituloMes}>▾</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mes siguiente"
            onPress={() => addMonth?.(1)}
            style={({ pressed }) => [estilos.flecha, pressed && estilos.tituloMesPulsado]}
          >
            <Image source={FLECHA_SIGUIENTE} style={estilos.imagenFlecha} />
          </Pressable>
        </View>

        <View importantForAccessibility="no-hide-descendants" style={estilos.diasSemana}>
          {weekDayNames(PRIMER_DIA_SEMANA).map((dia: string) => (
            <Text key={dia} style={estilos.diaSemana}>
              {dia}
            </Text>
          ))}
        </View>
      </View>
    );
  };
}
