import { type ReactNode, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuthContext } from "../context/AuthContext";
import { useTheme } from "@/hooks/use-theme";
import { crearEstilosBotonCerrarSesion } from "./BotonCerrarSesion.styles";

interface BotonCerrarSesionProps {
  // Acción opcional en la misma fila, a la izquierda (por ejemplo «‹ Atrás»).
  // Sin ella, el botón se pinta exactamente como siempre
  izquierda?: ReactNode;
}

// Acción secundaria: sin navegación, AppAuthGate vuelve al acceso cuando desaparece la sesión
export function BotonCerrarSesion({ izquierda }: BotonCerrarSesionProps) {
  const { cerrarSesion, error } = useAuthContext();
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosBotonCerrarSesion(tema), [tema]);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  // El error del contexto solo se muestra aquí si viene de pulsar este botón
  const [intentado, setIntentado] = useState(false);

  async function cerrar() {
    if (cerrandoSesion) {
      return;
    }

    setIntentado(true);
    setCerrandoSesion(true);

    try {
      await cerrarSesion();
    } finally {
      setCerrandoSesion(false);
    }
  }

  const cerrarYError = (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: cerrandoSesion }}
        disabled={cerrandoSesion}
        onPress={() => {
          void cerrar();
        }}
        style={({ pressed }) => [
          estilos.boton,
          pressed && estilos.pulsado,
          cerrandoSesion && estilos.deshabilitado,
        ]}
      >
        <Text style={estilos.texto}>
          {cerrandoSesion ? "Cerrando sesión..." : "Cerrar sesión"}
        </Text>
      </Pressable>

      {intentado && !cerrandoSesion && error !== "" && (
        <Text accessibilityRole="alert" style={estilos.error}>
          {error}
        </Text>
      )}
    </>
  );

  return (
    // La pantalla no tiene cabecera: solo el borde superior respeta la barra de estado
    <SafeAreaView edges={["top"]} style={estilos.contenedor}>
      {izquierda === undefined ? (
        cerrarYError
      ) : (
        // Misma fila: la acción a la izquierda y Cerrar sesión a la derecha, donde siempre
        <View style={estilos.fila}>
          <View style={estilos.izquierda}>{izquierda}</View>
          <View style={estilos.derecha}>{cerrarYError}</View>
        </View>
      )}
    </SafeAreaView>
  );
}
