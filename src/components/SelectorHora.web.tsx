import { type ChangeEvent, useMemo } from "react";
import { Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { esHoraValida } from "../utils/hora";
import { BotonSecundario } from "./PantallaInterior";
import { crearEstiloInputHoraWeb, crearEstilosSelectorHora } from "./SelectorHora.styles";
import type { SelectorHoraProps } from "./SelectorHora.types";

// Siguen disponibles desde aquí, como en la versión nativa
export { convertirDateAHora, convertirHoraADate } from "../utils/hora";

// Web (Safari, también instalada en la pantalla de inicio): el DateTimePicker de
// @expo/ui no pinta nada en web. Aquí va un <input type="time"> del navegador:
// en iPhone abre la rueda nativa de hora y en escritorio se usa con teclado.
// Misma fila, mismo «Quitar hora» y mismos valores: "" o HH:MM, sin segundos.
export function SelectorHora({ hora, onCambiarHora, disabled = false }: SelectorHoraProps) {
  const tema = useTheme();
  const styles = useMemo(() => crearEstilosSelectorHora(tema), [tema]);
  const estiloInput = useMemo(() => crearEstiloInputHoraWeb(tema), [tema]);

  function cambiar(evento: ChangeEvent<HTMLInputElement>) {
    const valor = evento.target.value;

    // Vaciar el campo (Borrar en iPhone) es «sin hora»; lo demás, solo HH:MM
    if (valor === "" || esHoraValida(valor)) {
      onCambiarHora(valor);
    }
  }

  return (
    <View style={styles.contenedor}>
      <View style={[styles.campo, disabled && styles.campoDeshabilitado]}>
        <Text style={styles.texto}>Hora</Text>
        <input
          type="time"
          // step 60: minutos, nunca segundos
          step={60}
          value={hora}
          onChange={cambiar}
          disabled={disabled}
          aria-label={hora === "" ? "Hora del evento, sin hora" : "Hora del evento"}
          style={estiloInput}
        />
      </View>

      {hora !== "" && (
        <BotonSecundario
          titulo="Quitar hora"
          onPress={() => onCambiarHora("")}
          disabled={disabled}
        />
      )}
    </View>
  );
}
