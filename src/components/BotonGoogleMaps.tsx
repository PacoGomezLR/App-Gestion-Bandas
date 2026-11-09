import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { abrirEnlaceGoogleMaps } from "../lib/googleMaps";
import { crearEstilosBotonGoogleMaps } from "./BotonGoogleMaps.styles";
import { Mensaje } from "./PantallaBase";

interface BotonGoogleMapsProps {
  // El enlace guardado en el evento: se abre exactamente este
  url: string;
}

export function BotonGoogleMaps({ url }: BotonGoogleMapsProps) {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosBotonGoogleMaps(tema), [tema]);
  const [fallo, setFallo] = useState(false);

  async function abrir() {
    setFallo(!(await abrirEnlaceGoogleMaps(url)));
  }

  return (
    <View style={estilos.contenedor}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Abrir ubicación del evento en Google Maps"
        onPress={() => void abrir()}
        style={({ pressed }) => [estilos.boton, pressed && estilos.pulsado]}
      >
        <Text importantForAccessibility="no">📍</Text>
        <Text style={estilos.texto}>Abrir en Google Maps</Text>
      </Pressable>

      {fallo && <Mensaje tipo="error" texto="No se ha podido abrir Google Maps." />}
    </View>
  );
}
