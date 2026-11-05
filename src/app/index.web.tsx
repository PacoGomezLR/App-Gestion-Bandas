import { useMemo } from "react";
import { Text, View } from "react-native";

import { crearEstilosPaginaInvitacionWeb } from "@/components/PaginaInvitacionWeb.styles";
import { useTheme } from "@/hooks/use-theme";

// Web: la app es Android; aquí solo se explica para qué sirve este dominio
export default function InicioWeb() {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosPaginaInvitacionWeb(tema), [tema]);

  return (
    <View style={estilos.pagina}>
      <View style={estilos.columna}>
        <Text accessibilityRole="header" style={estilos.marca}>
          MI Banda
        </Text>
        <Text style={estilos.texto}>
          MI Banda es una app para Android. Si te han invitado a una banda, abre en el móvil el
          enlace de invitación que te enviaron.
        </Text>
      </View>
    </View>
  );
}
