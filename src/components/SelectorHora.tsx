import DateTimePicker from "@expo/ui/community/datetime-picker";
import { useState } from "react";
import { Button, Pressable, StyleSheet, Text, View } from "react-native";

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
        <Text>Hora</Text>
        <View style={styles.valor}>
          {hora !== "" && <Text>{hora}</Text>}
          <Text>›</Text>
        </View>
      </Pressable>

      {hora !== "" && (
        <Button
          title="Quitar hora"
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

const styles = StyleSheet.create({
  contenedor: {
    gap: 4,
  },
  campo: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    // Valores de Colors.light y Spacing en constants/theme
    backgroundColor: "#F0F0F3",
    borderRadius: 16,
  },
  valor: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  campoDeshabilitado: {
    opacity: 0.5,
  },
});
