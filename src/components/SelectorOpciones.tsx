import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { crearEstilosFinanzas } from "./Finanzas.styles";

interface OpcionSelector<T extends string> {
  valor: T;
  etiqueta: string;
}

interface SelectorOpcionesProps<T extends string> {
  etiqueta: string;
  opciones: readonly OpcionSelector<T>[];
  // null = sin elegir todavía
  valor: T | null;
  onCambiar: (valor: T) => void;
  disabled?: boolean;
  // Sin etiqueta visible cuando ya la da el bloque; se sigue leyendo en voz alta
  etiquetaVisible?: boolean;
  // La opción elegida no compite con el botón principal del formulario
  suave?: boolean;
}

// Una opción entre pocas, en forma de píldoras que bajan de línea si no caben
export function SelectorOpciones<T extends string>({
  etiqueta,
  opciones,
  valor,
  onCambiar,
  disabled = false,
  etiquetaVisible = true,
  suave = false,
}: SelectorOpcionesProps<T>) {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosFinanzas(tema), [tema]);

  return (
    <View style={estilos.campo}>
      {etiquetaVisible && <Text style={estilos.etiquetaCampo}>{etiqueta}</Text>}

      <View accessibilityRole="radiogroup" accessibilityLabel={etiqueta} style={estilos.opciones}>
        {opciones.map((opcion) => {
          const elegida = opcion.valor === valor;

          return (
            <Pressable
              key={opcion.valor}
              accessibilityRole="radio"
              accessibilityLabel={opcion.etiqueta}
              accessibilityState={{ checked: elegida, disabled }}
              disabled={disabled}
              onPress={() => onCambiar(opcion.valor)}
              style={[
                estilos.opcion,
                elegida && (suave ? estilos.opcionSuave : estilos.opcionElegida),
                disabled && estilos.deshabilitado,
              ]}
            >
              <Text
                style={[
                  estilos.textoOpcion,
                  elegida && (suave ? estilos.textoOpcionSuave : estilos.textoOpcionElegida),
                ]}
              >
                {opcion.etiqueta}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
