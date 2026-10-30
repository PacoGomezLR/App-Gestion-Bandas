import { type PropsWithChildren, type ReactNode, useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { crearEstilosPantallaInterior } from "./PantallaInterior.styles";

// Piezas visuales de las pantallas interiores de la app (con banda ya elegida).
// Solo presentación: los datos y la lógica los pone cada pantalla.

function useEstilos() {
  const tema = useTheme();
  return useMemo(() => crearEstilosPantallaInterior(tema), [tema]);
}

export function PantallaInterior({ children }: PropsWithChildren) {
  const estilos = useEstilos();

  return (
    <ScrollView style={estilos.pagina} contentContainerStyle={estilos.contenido}>
      {children}
    </ScrollView>
  );
}

export function CargandoInterior({ texto }: { texto: string }) {
  const tema = useTheme();
  const estilos = useEstilos();

  return (
    <View style={estilos.cargando}>
      <ActivityIndicator color={tema.primary} />
      <Text style={estilos.textoCargando}>{texto}</Text>
    </View>
  );
}

interface CabeceraPantallaProps {
  titulo: string;
  subtitulo?: string;
}

export function CabeceraPantalla({ titulo, subtitulo }: CabeceraPantallaProps) {
  const estilos = useEstilos();

  return (
    <View style={estilos.cabecera}>
      <Text accessibilityRole="header" style={estilos.titulo}>
        {titulo}
      </Text>
      {subtitulo !== undefined && subtitulo !== "" && (
        <Text style={estilos.subtitulo}>{subtitulo}</Text>
      )}
    </View>
  );
}

interface SeccionProps extends PropsWithChildren {
  titulo: string;
  // Acción opcional a la derecha del título (por ejemplo, Ver todos)
  accion?: ReactNode;
}

export function Seccion({ titulo, accion, children }: SeccionProps) {
  const estilos = useEstilos();

  return (
    <View style={estilos.seccion}>
      <View style={estilos.cabeceraSeccion}>
        <Text accessibilityRole="header" style={estilos.tituloSeccion}>
          {titulo}
        </Text>
        {accion}
      </View>
      {children}
    </View>
  );
}

interface BotonSecundarioProps {
  titulo: string;
  onPress: () => void;
  disabled?: boolean;
}

// Acción discreta en forma de píldora; no compite con la acción principal
export function BotonSecundario({ titulo, onPress, disabled = false }: BotonSecundarioProps) {
  const estilos = useEstilos();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.botonTexto,
        pressed && estilos.pulsado,
        disabled && estilos.deshabilitado,
      ]}
    >
      <Text style={estilos.textoBotonTexto}>{titulo}</Text>
    </Pressable>
  );
}

interface EstadoVacioProps {
  titulo: string;
  detalle?: string;
}

export function EstadoVacio({ titulo, detalle }: EstadoVacioProps) {
  const estilos = useEstilos();

  return (
    <View style={estilos.vacio}>
      <Text style={estilos.textoVacio}>{titulo}</Text>
      {detalle !== undefined && <Text style={estilos.detalleVacio}>{detalle}</Text>}
    </View>
  );
}
