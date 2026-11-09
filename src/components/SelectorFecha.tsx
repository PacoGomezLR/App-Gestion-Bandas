import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Calendar } from "react-native-calendars";
import "../config/calendario";
import { useTheme } from "@/hooks/use-theme";
import { formatearFechaConBarras } from "../utils/fechas";
import { crearTemaCalendario } from "./CalendarioEventos.styles";
import { crearEstilosFinanzas } from "./Finanzas.styles";

interface SelectorFechaProps {
  etiqueta: string;
  // YYYY-MM-DD
  fecha: string;
  onCambiar: (fecha: string) => void;
  disabled?: boolean;
}

// Campo con la fecha; al pulsarlo abre el mismo calendario de la app, en el mes
// de esa fecha. Normalmente no hace falta abrirlo: la fecha ya viene puesta.
export function SelectorFecha({ etiqueta, fecha, onCambiar, disabled = false }: SelectorFechaProps) {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosFinanzas(tema), [tema]);
  const temaCalendario = useMemo(() => crearTemaCalendario(tema), [tema]);
  const [abierto, setAbierto] = useState(false);
  const fechaVisible = formatearFechaConBarras(fecha);

  return (
    <View style={estilos.campo}>
      <Text style={estilos.etiquetaCampo}>{etiqueta}</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${etiqueta}: ${fechaVisible}`}
        accessibilityHint="Abre el calendario para cambiarla"
        accessibilityState={{ disabled, expanded: abierto }}
        disabled={disabled}
        onPress={() => setAbierto(!abierto)}
        style={[
          estilos.campoSelector,
          abierto && estilos.campoSelectorAbierto,
          disabled && estilos.deshabilitado,
        ]}
      >
        <Text style={estilos.textoSelector}>{fechaVisible}</Text>
        <Text style={estilos.flechaSelector}>{abierto ? "▴" : "▾"}</Text>
      </Pressable>

      {abierto && !disabled && (
        <Calendar
          // react-native-calendars fija su tema al montarse: se vuelve a montar al cambiar claro/oscuro
          key={tema.background}
          current={fecha}
          firstDay={1}
          markedDates={{ [fecha]: { selected: true } }}
          onDayPress={(dia) => {
            onCambiar(dia.dateString);
            setAbierto(false);
          }}
          theme={temaCalendario}
          style={estilos.calendario}
        />
      )}
    </View>
  );
}
