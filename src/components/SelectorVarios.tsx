import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { crearEstilosFinanzas } from "./Finanzas.styles";

interface OpcionVarios {
  valor: string;
  etiqueta: string;
}

interface SelectorVariosProps {
  etiqueta: string;
  opciones: readonly OpcionVarios[];
  elegidos: readonly string[];
  onAlternar: (valor: string) => void;
  disabled?: boolean;
}

// Varias opciones a la vez. La marca ✓ dice lo mismo que el color
export function SelectorVarios({
  etiqueta,
  opciones,
  elegidos,
  onAlternar,
  disabled = false,
}: SelectorVariosProps) {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosFinanzas(tema), [tema]);

  return (
    <View style={estilos.campo}>
      <Text style={estilos.etiquetaCampo}>{etiqueta}</Text>

      <View accessibilityLabel={etiqueta} style={estilos.opciones}>
        {opciones.map((opcion) => {
          const elegida = elegidos.includes(opcion.valor);

          return (
            <Pressable
              key={opcion.valor}
              accessibilityRole="checkbox"
              accessibilityLabel={opcion.etiqueta}
              accessibilityState={{ checked: elegida, disabled }}
              disabled={disabled}
              onPress={() => onAlternar(opcion.valor)}
              style={[
                estilos.opcion,
                elegida && estilos.opcionSuave,
                disabled && estilos.deshabilitado,
              ]}
            >
              <Text style={[estilos.textoOpcion, elegida && estilos.textoOpcionSuave]}>
                {elegida ? `${opcion.etiqueta} ✓` : opcion.etiqueta}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
