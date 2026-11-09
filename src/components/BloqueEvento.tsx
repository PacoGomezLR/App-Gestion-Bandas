import { type PropsWithChildren, useMemo } from "react";
import { Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { crearEstilosBloqueEvento } from "./BloqueEvento.styles";

interface BloqueEventoProps extends PropsWithChildren {
  etiqueta: string;
}

// Un dato del detalle de un evento: etiqueta discreta y su valor, leídos como uno
export function BloqueEvento({ etiqueta, children }: BloqueEventoProps) {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosBloqueEvento(tema), [tema]);

  return (
    <View accessible style={estilos.bloque}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <Text style={estilos.valor}>{children}</Text>
    </View>
  );
}
