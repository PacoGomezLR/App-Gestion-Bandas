import DateTimePicker from "@expo/ui/community/datetime-picker";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { convertirDateAHora, convertirHoraADate } from "../utils/hora";
import { BotonSecundario } from "./PantallaInterior";
import { crearEstilosSelectorHora } from "./SelectorHora.styles";
import type { SelectorHoraProps } from "./SelectorHora.types";

// Siguen disponibles desde aquí como antes
export { convertirDateAHora, convertirHoraADate };

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
