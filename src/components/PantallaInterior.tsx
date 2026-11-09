import { Children, isValidElement, type PropsWithChildren, type ReactNode, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  type ScrollViewProps,
  Text,
  View,
} from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { crearEstilosPantallaInterior } from "./PantallaInterior.styles";

// Piezas visuales de las pantallas interiores de la app (con banda ya elegida).
// Solo presentación: los datos y la lógica los pone cada pantalla.

function useEstilos() {
  const tema = useTheme();
  return useMemo(() => crearEstilosPantallaInterior(tema), [tema]);
}

interface PantallaInteriorProps extends PropsWithChildren {
  // Con formularios: un toque en Guardar no se gasta en cerrar el teclado
  keyboardShouldPersistTaps?: ScrollViewProps["keyboardShouldPersistTaps"];
}

export function PantallaInterior({ children, keyboardShouldPersistTaps }: PantallaInteriorProps) {
  const estilos = useEstilos();

  return (
    <ScrollView
      style={estilos.pagina}
      contentContainerStyle={estilos.contenido}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
    >
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

interface BotonDestructivoProps {
  titulo: string;
  onPress: () => void;
  disabled?: boolean;
}

// Acción que borra algo: solo texto en color de error, sin competir con la principal
export function BotonDestructivo({ titulo, onPress, disabled = false }: BotonDestructivoProps) {
  const estilos = useEstilos();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.botonDestructivo,
        pressed && estilos.pulsado,
        disabled && estilos.deshabilitado,
      ]}
    >
      <Text style={estilos.textoDestructivo}>{titulo}</Text>
    </Pressable>
  );
}

interface TarjetaProps extends PropsWithChildren {
  titulo: string;
}

// Bloque contextual: un formulario corto o un paso de un flujo
export function Tarjeta({ titulo, children }: TarjetaProps) {
  const estilos = useEstilos();

  return (
    <View style={estilos.tarjeta}>
      <Text accessibilityRole="header" style={estilos.tituloTarjeta}>
        {titulo}
      </Text>
      {children}
    </View>
  );
}

// Filas de una lista, con una línea fina entre cada dos
export function GrupoFilas({ children }: PropsWithChildren) {
  const estilos = useEstilos();

  return (
    <View style={estilos.grupoFilas}>
      {/* toArray descarta las filas condicionales que no se pintan y da a cada una su key */}
      {Children.toArray(children).map((fila, indice) => (
        <View
          key={isValidElement(fila) && fila.key !== null ? fila.key : indice}
          style={indice > 0 ? estilos.separadorFila : undefined}
        >
          {fila}
        </View>
      ))}
    </View>
  );
}

interface FilaTextoProps {
  titulo: string;
  // Texto de relleno (por ejemplo, sin nombre): se ve más apagado
  secundario?: boolean;
  centrado?: boolean;
}

// Fila de solo lectura: no es un botón, el lector de pantalla solo lee el texto
export function FilaTexto({ titulo, secundario = false, centrado = false }: FilaTextoProps) {
  const estilos = useEstilos();

  return (
    <View style={estilos.filaLectura}>
      <Text
        style={[
          estilos.textoFila,
          secundario && estilos.tituloFilaSecundario,
          centrado && estilos.tituloFilaCentrado,
        ]}
      >
        {titulo}
      </Text>
    </View>
  );
}

interface FilaNavegableProps {
  titulo: string;
  // Dato breve a la derecha (por ejemplo, un contador)
  valor?: number;
  // Título centrado en toda la fila, sin flecha que le reste espacio
  centrado?: boolean;
  onPress: () => void;
  disabled?: boolean;
}

// Fila que abre otra vista: el título y el contador se leen como un solo botón
export function FilaNavegable({
  titulo,
  valor,
  centrado = false,
  onPress,
  disabled = false,
}: FilaNavegableProps) {
  const estilos = useEstilos();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={valor === undefined ? titulo : `${titulo}: ${valor}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.fila,
        pressed && estilos.pulsado,
        disabled && estilos.deshabilitado,
      ]}
    >
      <Text style={[estilos.tituloFila, centrado && estilos.tituloFilaCentrado]}>{titulo}</Text>
      {valor !== undefined && <Text style={estilos.valorFila}>{valor}</Text>}
      {!centrado && <Text style={estilos.flechaFila}>›</Text>}
    </Pressable>
  );
}
