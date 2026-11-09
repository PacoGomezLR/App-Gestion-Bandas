import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import type { EstadoCancion } from "../types/cancion";
import { APARTADOS, etiquetaApartado } from "../utils/canciones";
import { crearEstilosSelectorApartado } from "./SelectorApartado.styles";

interface SelectorApartadoProps {
  apartado: EstadoCancion;
  // Canciones de cada apartado, ya cargadas; null = sin contar todavía
  totales: Record<EstadoCancion, number> | null;
  onCambiar: (apartado: EstadoCancion) => void;
}

// Dos vistas del mismo módulo, como pestañas internas
export function SelectorApartado({ apartado, totales, onCambiar }: SelectorApartadoProps) {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosSelectorApartado(tema), [tema]);

  return (
    <View accessibilityRole="tablist" style={estilos.carril}>
      {APARTADOS.map((opcion) => {
        const elegido = opcion === apartado;
        const etiqueta = etiquetaApartado(opcion);
        const total = totales?.[opcion];

        return (
          <Pressable
            key={opcion}
            accessibilityRole="tab"
            accessibilityLabel={total === undefined ? etiqueta : `${etiqueta}, ${total}`}
            accessibilityState={{ selected: elegido }}
            onPress={() => onCambiar(opcion)}
            style={({ pressed }) => [
              estilos.segmento,
              elegido && estilos.segmentoElegido,
              pressed && estilos.pulsado,
            ]}
          >
            <Text style={[estilos.texto, elegido && estilos.textoElegido]}>
              {total === undefined ? etiqueta : `${etiqueta} (${total})`}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
