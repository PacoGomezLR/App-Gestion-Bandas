import { useCanGoBack, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { crearEstilosBotonAtras } from "./BotonAtras.styles";

// «‹ Atrás»: vuelve a la pantalla anterior según el historial de Expo Router
// (router.back), sin destino fijo. Solo aparece si el router puede volver.
// Es la misma acción del navegador de pestañas que el botón o gesto Atrás de
// Android, así que los dos llevan al mismo sitio. En web usa el historial del
// router: no recarga la página.
// Solo para la vista principal de una pestaña: las vistas internas (Finanzas,
// Técnicos, Historial…) no son rutas y tienen su propio «Volver a…».
export function BotonAtras() {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosBotonAtras(tema), [tema]);
  const [conFoco, setConFoco] = useState(false);
  // Hook de Expo Router: se actualiza con cada navegación (el router global no
  // existe todavía durante el primer render)
  const puedeVolver = useCanGoBack();
  const router = useRouter();

  if (!puedeVolver) {
    return null;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Atrás"
      accessibilityHint="Vuelve a la pantalla anterior"
      onPress={() => router.back()}
      onFocus={() => setConFoco(true)}
      onBlur={() => setConFoco(false)}
      style={({ pressed }) => [estilos.boton, conFoco && estilos.conFoco, pressed && estilos.pulsado]}
    >
      <Text style={estilos.texto}>‹ Atrás</Text>
    </Pressable>
  );
}
