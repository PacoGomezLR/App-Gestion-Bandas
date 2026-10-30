import { useMemo } from "react";
import { Text, View } from "react-native";
import { Calendar } from "react-native-calendars";
import "../config/calendario";
import { useTheme } from "@/hooks/use-theme";
import { formatearFecha } from "../utils/fechas";
import {
  crearEstilosCalendarioEventos,
  crearTemaCalendario,
} from "./CalendarioEventos.styles";

interface CalendarioEventosProps {
  fecha: string;
  fechasConEventos: string[];
  onSeleccionarFecha: (fecha: string) => void;
}

export function CalendarioEventos({
  fecha,
  fechasConEventos,
  onSeleccionarFecha,
}: CalendarioEventosProps) {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosCalendarioEventos(tema), [tema]);
  const temaCalendario = useMemo(() => crearTemaCalendario(tema), [tema]);

  const fechasMarcadas = fechasConEventos.reduce<
    Record<string, { marked?: boolean; selected?: boolean }>
  >((resultado, fechaEvento) => {
    resultado[fechaEvento] = {
      marked: true,
    };

    return resultado;
  }, {});

  if (fecha !== "") {
    fechasMarcadas[fecha] = {
      ...fechasMarcadas[fecha],
      selected: true,
    };
  }

  return (
    <View style={estilos.contenedor}>
      {/* Sin fecha elegida no se muestra una etiqueta vacía */}
      {fecha !== "" && (
        <Text style={estilos.fechaSeleccionada}>
          Fecha seleccionada: {formatearFecha(fecha)}
        </Text>
      )}

      <Calendar
        // react-native-calendars fija su tema al montarse: se vuelve a montar al cambiar claro/oscuro
        key={tema.background}
        firstDay={1}
        onDayPress={(day) => {
          onSeleccionarFecha(day.dateString);
        }}
        markedDates={fechasMarcadas}
        theme={temaCalendario}
        style={estilos.calendario}
      />
    </View>
  );
}
