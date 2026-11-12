import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { crearEstilosAccionesEvento } from "./AccionesEvento.styles";
import { Mensaje } from "./PantallaBase";

interface AccionesEventoProps {
  procesando: boolean;
  // Por qué no se ha podido eliminar este evento (por ejemplo, tiene movimientos)
  errorEliminacion: string | null;
  onEditar: () => void;
  onEliminar: () => void;
}

// Editar y Eliminar juntos en una cápsula, al final del detalle. Siguen siendo
// dos botones distintos: Eliminar en rojo, como acción peligrosa
export function AccionesEvento({ procesando, errorEliminacion, onEditar, onEliminar }: AccionesEventoProps) {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosAccionesEvento(tema), [tema]);

  return (
    <View style={estilos.contenedor}>
      <View testID="acciones-evento" style={estilos.capsula}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: procesando }}
          disabled={procesando}
          onPress={onEditar}
          style={({ pressed }) => [
            estilos.accion,
            pressed && estilos.pulsado,
            procesando && estilos.deshabilitado,
          ]}
        >
          <Text style={estilos.textoEditar}>Editar evento</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: procesando }}
          disabled={procesando}
          onPress={onEliminar}
          style={({ pressed }) => [
            estilos.accion,
            estilos.separador,
            pressed && estilos.pulsado,
            procesando && estilos.deshabilitado,
          ]}
        >
          <Text style={estilos.textoEliminar}>Eliminar evento</Text>
        </Pressable>
      </View>

      {errorEliminacion !== null && <Mensaje tipo="error" texto={errorEliminacion} />}
    </View>
  );
}
