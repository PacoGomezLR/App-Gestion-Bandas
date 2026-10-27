import { Text } from "react-native";
import { Calendar } from "react-native-calendars";
import "../config/calendario";
import { formatearFecha } from "../utils/fechas";

interface CalendarioEventosProps {
  fecha: string;
  onSeleccionarFecha: (fecha: string) => void;
}

export function CalendarioEventos({
  fecha,
  onSeleccionarFecha,
}: CalendarioEventosProps) {
  return (
    <>
      <Text>Fecha seleccionada: {formatearFecha(fecha)}</Text>

      <Calendar
        firstDay={1}
        onDayPress={(day) => {
          onSeleccionarFecha(day.dateString);
        }}
        markedDates={{
          [fecha]: {
            selected: true,
          },
        }}
      />
    </>
  );
}
