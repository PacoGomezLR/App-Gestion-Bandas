import { type PropsWithChildren, type ReactNode, useMemo } from "react";
import { Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { formatearFecha } from "../utils/fechas";
import { crearEstilosPanelDia } from "./PanelDia.styles";

interface PanelDiaProps {
  fecha: string;
  // Solo para admin: la acción principal del día, justo debajo de la fecha
  crearEvento: ReactNode | null;
  // Formulario de evento desplegado justo debajo de Crear evento
  formulario: ReactNode | null;
  // Eventos de ese día, si los hay
  eventos: ReactNode | null;
  // Aviso de quién no puede ese día, si alguien no puede
  noDisponibles: ReactNode | null;
  disponibilidad: ReactNode;
}

function Bloque({ titulo, children }: PropsWithChildren<{ titulo: string }>) {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosPanelDia(tema), [tema]);

  return (
    <View style={estilos.bloque}>
      <Text accessibilityRole="header" style={estilos.tituloBloque}>
        {titulo}
      </Text>
      {children}
    </View>
  );
}

// Acciones del día elegido, justo debajo del calendario. Solo presentación:
// cada bloque lo prepara la pantalla. Orden: fecha → crear evento (y su
// formulario) → eventos → no disponibles → tu disponibilidad, que cierra el panel.
export function PanelDia({
  fecha,
  crearEvento,
  formulario,
  eventos,
  noDisponibles,
  disponibilidad,
}: PanelDiaProps) {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosPanelDia(tema), [tema]);

  return (
    <View style={estilos.panel}>
      <Text accessibilityRole="header" style={estilos.fecha}>
        {formatearFecha(fecha)}
      </Text>

      {crearEvento}
      {formulario !== null && <View style={estilos.formulario}>{formulario}</View>}
      {eventos !== null && <Bloque titulo="Eventos de este día">{eventos}</Bloque>}
      {noDisponibles !== null && <Bloque titulo="No disponibles">{noDisponibles}</Bloque>}
      <Bloque titulo="Tu disponibilidad">{disponibilidad}</Bloque>
    </View>
  );
}
