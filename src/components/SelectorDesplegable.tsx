import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { crearEstilosFinanzas } from "./Finanzas.styles";

interface OpcionDesplegable<T extends string> {
  valor: T;
  etiqueta: string;
}

interface SelectorDesplegableProps<T extends string> {
  etiqueta: string;
  // Lo que se ve mientras no hay ninguna opción elegida
  placeholder: string;
  opciones: readonly OpcionDesplegable<T>[];
  valor: T | null;
  onCambiar: (valor: T) => void;
  disabled?: boolean;
}

// Campo que despliega sus opciones debajo. Mismo patrón que SelectorEvento y
// SelectorFecha; la marca ✓ dice cuál está elegida sin depender del color
export function SelectorDesplegable<T extends string>({
  etiqueta,
  placeholder,
  opciones,
  valor,
  onCambiar,
  disabled = false,
}: SelectorDesplegableProps<T>) {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosFinanzas(tema), [tema]);
  const [abierto, setAbierto] = useState(false);

  const elegida = opciones.find((opcion) => opcion.valor === valor);

  return (
    <View style={estilos.campo}>
      <Text style={estilos.etiquetaCampo}>{etiqueta}</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${etiqueta}: ${elegida?.etiqueta ?? placeholder}`}
        accessibilityState={{ disabled, expanded: abierto }}
        disabled={disabled}
        onPress={() => setAbierto(!abierto)}
        style={[
          estilos.campoSelector,
          estilos.campoDesplegable,
          abierto && estilos.campoSelectorAbierto,
          disabled && estilos.deshabilitado,
        ]}
      >
        <Text style={[estilos.textoSelector, elegida === undefined && estilos.textoSelectorVacio]}>
          {elegida?.etiqueta ?? placeholder}
        </Text>
        <Text style={estilos.flechaSelector}>{abierto ? "▴" : "▾"}</Text>
      </Pressable>

      {abierto && !disabled && (
        <View accessibilityRole="radiogroup" accessibilityLabel={etiqueta} style={estilos.listaEventos}>
          {opciones.map((opcion) => {
            const marcada = opcion.valor === valor;

            return (
              <Pressable
                key={opcion.valor}
                accessibilityRole="radio"
                accessibilityLabel={opcion.etiqueta}
                accessibilityState={{ checked: marcada }}
                onPress={() => {
                  onCambiar(opcion.valor);
                  setAbierto(false);
                }}
                style={({ pressed }) => [estilos.opcionEvento, pressed && estilos.pulsado]}
              >
                <Text
                  style={[estilos.textoOpcionEvento, marcada && estilos.textoOpcionEventoElegida]}
                >
                  {marcada ? `${opcion.etiqueta} ✓` : opcion.etiqueta}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
