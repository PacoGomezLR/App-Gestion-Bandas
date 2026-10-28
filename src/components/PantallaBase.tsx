import { type PropsWithChildren, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { crearEstilosPantallaBase } from "./PantallaBase.styles";

// Piezas visuales compartidas por acceso, creación de banda y estados de carga.
// Solo presentación: la lógica vive en cada pantalla.

const NOMBRE_APP = "MI Banda";

// useTheme devuelve un objeto constante por esquema: solo se recrean al cambiar de claro a oscuro
function useEstilos() {
  const tema = useTheme();
  return useMemo(() => crearEstilosPantallaBase(tema), [tema]);
}

interface PantallaBaseProps extends PropsWithChildren {
  subtitulo?: string;
}

export function PantallaBase({ subtitulo, children }: PantallaBaseProps) {
  const estilos = useEstilos();

  return (
    <SafeAreaView style={estilos.pagina}>
      {/* En pantallas pequeñas el formulario sube con el teclado y se puede desplazar */}
      <KeyboardAvoidingView behavior="padding" style={estilos.teclado}>
        <ScrollView
          contentContainerStyle={estilos.contenido}
          keyboardShouldPersistTaps="handled"
        >
          <View style={estilos.columna}>
            <View style={estilos.cabecera}>
              <Text accessibilityRole="header" style={estilos.marca}>
                {NOMBRE_APP}
              </Text>
              {subtitulo !== undefined && (
                <Text style={estilos.subtitulo}>{subtitulo}</Text>
              )}
            </View>

            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface CampoFormularioProps
  extends Omit<TextInputProps, "style" | "onFocus" | "onBlur" | "accessibilityLabel"> {
  etiqueta: string;
}

// Etiqueta visible encima del campo; la misma etiqueta es su nombre accesible
export function CampoFormulario({ etiqueta, editable = true, ...props }: CampoFormularioProps) {
  const tema = useTheme();
  const estilos = useEstilos();
  const [enfocado, setEnfocado] = useState(false);

  return (
    <View style={estilos.campo}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <TextInput
        {...props}
        accessibilityLabel={etiqueta}
        editable={editable}
        onFocus={() => setEnfocado(true)}
        onBlur={() => setEnfocado(false)}
        placeholderTextColor={tema.textSecondary}
        style={[
          estilos.entrada,
          enfocado && estilos.entradaEnfocada,
          !editable && estilos.deshabilitado,
        ]}
      />
    </View>
  );
}

interface BotonProps {
  titulo: string;
  onPress: () => void;
  disabled?: boolean;
}

export function BotonPrincipal({ titulo, onPress, disabled = false }: BotonProps) {
  const estilos = useEstilos();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.boton,
        pressed && estilos.pulsado,
        disabled && estilos.deshabilitado,
      ]}
    >
      <Text style={estilos.textoBoton}>{titulo}</Text>
    </Pressable>
  );
}

interface AccionSecundariaProps extends BotonProps {
  pregunta: string;
}

// Acción textual que no compite con el botón principal
export function AccionSecundaria({ pregunta, titulo, onPress, disabled = false }: AccionSecundariaProps) {
  const estilos = useEstilos();

  return (
    <View style={estilos.accionSecundaria}>
      <Text style={estilos.pregunta}>{pregunta}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        hitSlop={Spacing.two}
        onPress={onPress}
        style={disabled && estilos.deshabilitado}
      >
        <Text style={estilos.enlace}>{titulo}</Text>
      </Pressable>
    </View>
  );
}

interface MensajeProps {
  tipo: "error" | "info";
  texto: string;
}

export function Mensaje({ tipo, texto }: MensajeProps) {
  const estilos = useEstilos();
  const esError = tipo === "error";

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[estilos.mensaje, esError ? estilos.mensajeError : estilos.mensajeInfo]}
    >
      <Text style={esError ? estilos.textoError : estilos.textoInfo}>{texto}</Text>
    </View>
  );
}
