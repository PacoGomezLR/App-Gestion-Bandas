import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useAuthContext } from "../context/AuthContext";
import { useTheme } from "@/hooks/use-theme";
import { crearEstilosBotonCerrarSesion } from "./BotonCerrarSesion.styles";

// Acción secundaria: sin navegación, AppAuthGate vuelve al acceso cuando desaparece la sesión
export function BotonCerrarSesion() {
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

  return (
    <View style={estilos.contenedor}>
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
    </View>
  );
}
