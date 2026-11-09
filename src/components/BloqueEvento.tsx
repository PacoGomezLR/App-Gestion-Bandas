import { type PropsWithChildren, useMemo } from "react";
import { Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { crearEstilosBloqueEvento } from "./BloqueEvento.styles";

interface BloqueEventoProps extends PropsWithChildren {
  titulo: string;
}

// Separa por temas el formulario y el detalle de un evento
export function BloqueEvento({ titulo, children }: BloqueEventoProps) {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosBloqueEvento(tema), [tema]);

  return (
    <View style={estilos.bloque}>
      <Text accessibilityRole="header" style={estilos.titulo}>
        {titulo}
      </Text>
      <View style={estilos.bloqueCampos}>{children}</View>
    </View>
  );
}
