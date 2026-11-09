import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Calendar } from "react-native-calendars";
import type { MarkingProps } from "react-native-calendars/src/calendar/day/marking";
import "../config/calendario";
import { useTheme } from "@/hooks/use-theme";
import { tituloNoDisponibles } from "../utils/disponibilidad";
import { fechaDeHoy, formatearFecha } from "../utils/fechas";
import { crearCabeceraCalendario } from "./CabeceraCalendario";
import {
  crearEstilosCalendarioEventos,
  crearMarcaNoDisponible,
  crearTemaCalendarioFijo,
} from "./CalendarioEventos.styles";
import { SelectorMesAnio } from "./SelectorMesAnio";

interface CalendarioEventosProps {
  fecha: string;
  fechasConEventos: string[];
  // Cuántos integrantes no están disponibles cada día; sin entrada = todos disponibles.
  // Los nombres nunca van en la celda: se muestran en el contenido del día.
  noDisponiblesPorFecha?: Record<string, number>;
  // Explicación breve encima del calendario; sin ella no se muestra nada
  ayuda?: string;
  onSeleccionarFecha: (fecha: string) => void;
}

export function CalendarioEventos({
  fecha,
  fechasConEventos,
  noDisponiblesPorFecha = {},
  ayuda,
  onSeleccionarFecha,
}: CalendarioEventosProps) {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosCalendarioEventos(tema), [tema]);
  const temaCalendario = useMemo(() => crearTemaCalendarioFijo(tema), [tema]);
  // Mes visible al abrir el selector de mes y año; null = cerrado
  const [selectorMes, setSelectorMes] = useState<string | null>(null);
  // El mes lo lleva la librería: un salto la vuelve a montar en el mes pedido.
  // vez cambia en cada salto, para que pedir dos veces el mismo mes también funcione
  const [salto, setSalto] = useState<{ mes: string; vez: number } | null>(null);
  const Cabecera = useMemo(() => crearCabeceraCalendario(setSelectorMes), []);

  function saltarAMes(mes: string) {
    setSelectorMes(null);
    setSalto((anterior) => ({ mes, vez: (anterior?.vez ?? 0) + 1 }));
  }

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
      {ayuda !== undefined && (
        <View testID="ayuda-calendario" style={estilos.pildoraAyuda}>
          <Text style={estilos.textoAyuda}>{ayuda}</Text>
        </View>
      )}

      {/* Sin fecha elegida no se muestra una etiqueta vacía */}
      {fecha !== "" && (
        <Text style={estilos.fechaSeleccionada}>
          Fecha seleccionada: {formatearFecha(fecha)}
        </Text>
      )}

      <Calendar
        // react-native-calendars fija su tema al montarse: se vuelve a montar al cambiar claro/oscuro
        key={`${tema.background}-${salto?.vez ?? 0}`}
        current={salto === null ? undefined : `${salto.mes}-01`}
        testID="calendario"
        firstDay={1}
        // custom permite el anillo de no disponibles sin perder el punto de los eventos
        markingType="custom"
        onDayPress={(day) => {
          onSeleccionarFecha(day.dateString);
        }}
        markedDates={fechasMarcadas}
        theme={temaCalendario}
        style={estilos.calendario}
        customHeader={Cabecera}
      />

      {selectorMes !== null && (
        <SelectorMesAnio
          mes={selectorMes}
          mesHoy={fechaDeHoy().slice(0, 7)}
          onElegir={saltarAMes}
          onCerrar={() => setSelectorMes(null)}
        />
      )}
    </View>
  );
}
