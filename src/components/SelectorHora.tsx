import DateTimePicker from "@expo/ui/community/datetime-picker";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { BotonSecundario } from "./PantallaInterior";
import { crearEstilosSelectorHora } from "./SelectorHora.styles";

interface SelectorHoraProps {
  hora: string;
  onCambiarHora: (hora: string) => void;
  disabled?: boolean;
}

// Mismo criterio que useEventos: HH:MM de 00:00 a 23:59
const FORMATO_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

// El selector necesita un Date; la fecha concreta no importa, solo la hora local
export function convertirHoraADate(hora: string): Date {
  const coincidencia = FORMATO_HORA.exec(hora);

  if (coincidencia) {
    return new Date(2000, 0, 1, Number(coincidencia[1]), Number(coincidencia[2]), 0, 0);
  }

  // Sin hora guardada se abre con la hora actual, sin segundos
  const ahora = new Date();
  ahora.setSeconds(0, 0);
  return ahora;
}

// Hora local, nunca toISOString(): evita desfases por zona horaria
export function convertirDateAHora(fecha: Date): string {
  const horas = String(fecha.getHours()).padStart(2, "0");
  const minutos = String(fecha.getMinutes()).padStart(2, "0");

  return `${horas}:${minutos}`;
}

export function SelectorHora({ hora, onCambiarHora, disabled = false }: SelectorHoraProps) {
  const tema = useTheme();
  const styles = useMemo(() => crearEstilosSelectorHora(tema), [tema]);
  // Solo estado de interfaz: la hora sigue viniendo por props
  const [selectorAbierto, setSelectorAbierto] = useState(false);

  return (
    <View style={styles.contenedor}>
      {/* Toda la fila abre el selector; sin hora solo se ve la etiqueta */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={hora === "" ? "Elegir hora" : `Cambiar hora. Hora actual ${hora}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => setSelectorAbierto(true)}
        style={[styles.campo, disabled && styles.campoDeshabilitado]}
      >
        <Text style={styles.texto}>Hora</Text>
        <View style={styles.valor}>
          {hora !== "" && <Text style={styles.texto}>{hora}</Text>}
          <Text style={styles.texto}>›</Text>
        </View>
      </Pressable>

      {hora !== "" && (
        <BotonSecundario
          titulo="Quitar hora"
          onPress={() => onCambiarHora("")}
          disabled={disabled}
        />
      )}

      {/* En Android el diálogo se abre al montarse; al elegir o cancelar se desmonta */}
      {selectorAbierto && (
        <DateTimePicker
          value={convertirHoraADate(hora)}
          mode="time"
          presentation="dialog"
          is24Hour
          onValueChange={(_evento, fechaSeleccionada) => {
            setSelectorAbierto(false);
            onCambiarHora(convertirDateAHora(fechaSeleccionada));
          }}
          onDismiss={() => setSelectorAbierto(false)}
        />
      )}
    </View>
  );
}
