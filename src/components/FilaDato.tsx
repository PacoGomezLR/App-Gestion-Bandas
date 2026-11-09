import { useMemo } from "react";
import { Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { crearEstilosFinanzas } from "./Finanzas.styles";

interface FilaDatoProps {
  etiqueta: string;
  valor: string;
  destacado?: boolean;
}

// Etiqueta a la izquierda y valor a la derecha; se lee como una sola frase
export function FilaDato({ etiqueta, valor, destacado = false }: FilaDatoProps) {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosFinanzas(tema), [tema]);

  return (
    <View accessible accessibilityLabel={`${etiqueta}: ${valor}`} style={estilos.filaDato}>
      <Text style={estilos.etiquetaDato}>{etiqueta}</Text>
      <Text style={[estilos.valorDato, destacado && estilos.valorDatoDestacado]}>{valor}</Text>
    </View>
  );
}
