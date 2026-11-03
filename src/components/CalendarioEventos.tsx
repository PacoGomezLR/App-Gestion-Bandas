import { useMemo } from "react";
import { Text, View } from "react-native";
import { Calendar } from "react-native-calendars";
import type { MarkingProps } from "react-native-calendars/src/calendar/day/marking";
import "../config/calendario";
import { useTheme } from "@/hooks/use-theme";
import { tituloNoDisponibles } from "../utils/disponibilidad";
import { formatearFecha } from "../utils/fechas";
import {
  crearEstilosCalendarioEventos,
  crearMarcaNoDisponible,
  crearTemaCalendario,
} from "./CalendarioEventos.styles";

interface CalendarioEventosProps {
  fecha: string;
  fechasConEventos: string[];
  // Cuántos integrantes no están disponibles cada día; sin entrada = todos disponibles.
  // Los nombres nunca van en la celda: se muestran en el contenido del día.
  noDisponiblesPorFecha?: Record<string, number>;
  onSeleccionarFecha: (fecha: string) => void;
}

export function CalendarioEventos({
  fecha,
  fechasConEventos,
  noDisponiblesPorFecha = {},
  onSeleccionarFecha,
}: CalendarioEventosProps) {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosCalendarioEventos(tema), [tema]);
  const temaCalendario = useMemo(() => crearTemaCalendario(tema), [tema]);

  const fechasMarcadas = fechasConEventos.reduce<Record<string, MarkingProps>>(
    (resultado, fechaEvento) => {
      resultado[fechaEvento] = {
        marked: true,
      };

      return resultado;
    },
    {}
  );

  // Evento = punto; alguien no disponible = anillo. Si coinciden se ven los dos
  for (const [fechaConflicto, cantidad] of Object.entries(noDisponiblesPorFecha)) {
    if (cantidad === 0) {
      continue;
    }

    const conEvento = fechasMarcadas[fechaConflicto]?.marked === true;

    fechasMarcadas[fechaConflicto] = {
      ...fechasMarcadas[fechaConflicto],
      customStyles: crearMarcaNoDisponible(tema, fechaConflicto === fecha),
      accessibilityLabel: `${formatearFecha(fechaConflicto)}: ${tituloNoDisponibles(cantidad)}${
        conEvento ? ", con evento" : ""
      }`,
    };
  }

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
        // custom permite el anillo de no disponibles sin perder el punto de los eventos
        markingType="custom"
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
