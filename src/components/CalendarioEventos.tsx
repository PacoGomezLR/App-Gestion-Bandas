import { Text } from "react-native";
import { Calendar } from "react-native-calendars";
import "../config/calendario";
import { formatearFecha } from "../utils/fechas";

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
    <>
      <Text>Fecha seleccionada: {formatearFecha(fecha)}</Text>

      <Calendar
        firstDay={1}
        onDayPress={(day) => {
          onSeleccionarFecha(day.dateString);
        }}
        markedDates={fechasMarcadas}
      />
    </>
  );
}
