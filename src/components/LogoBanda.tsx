import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { ajustarEscalaLogo, proporcionZonaLogo } from "../utils/escalaLogo";
import {
  crearEstilosLogoBanda,
  estiloImagenLogo,
  estiloZonaLogo,
  PROPORCION_INICIAL_LOGO,
} from "./LogoBanda.styles";
import { CabeceraPantalla } from "./PantallaInterior";

interface LogoBandaProps {
  url: string;
  nombreBanda: string;
  // La escala de la banda (o la del borrador, al editar)
  escala: number;
}

// El logo entero y sin deformar (contain), con su transparencia, a todo el ancho
// disponible y con la escala de la banda. Igual en la portada y al editarlo
export function LogoBanda({ url, nombreBanda, escala }: LogoBandaProps) {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosLogoBanda(tema), [tema]);
  const [proporcion, setProporcion] = useState<number>(PROPORCION_INICIAL_LOGO);
  const escalaVisible = ajustarEscalaLogo(escala);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Logo de ${nombreBanda}`}
      testID="logo-banda"
      style={[estilos.zona, estiloZonaLogo(escalaVisible, proporcion)]}
    >
      <Image
        testID="imagen-logo-banda"
        source={{ uri: url }}
        contentFit="contain"
        transition={150}
        onLoad={({ source }) => {
          const real = proporcionZonaLogo(source.width, source.height);

          if (real !== null) {
            setProporcion(real);
          }
        }}
        style={[estilos.imagen, estiloImagenLogo(escalaVisible)]}
      />
    </View>
  );
}

interface CabeceraConLogoProps {
  titulo: string;
  nombreBanda?: string;
  logoUrl: string | null;
  escala: number;
}

// Portada: el logo arriba, protagonista, y debajo solo el título. El nombre de
// la banda no se repite como subtítulo; con logo, es su etiqueta accesible.
// Sin logo, solo el título, sin hueco
export function CabeceraConLogo({ titulo, nombreBanda, logoUrl, escala }: CabeceraConLogoProps) {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosLogoBanda(tema), [tema]);

  if (logoUrl === null) {
    return <CabeceraPantalla titulo={titulo} />;
  }

  return (
    <View style={estilos.cabecera}>
      <LogoBanda url={logoUrl} nombreBanda={nombreBanda ?? "la banda"} escala={escala} />
      <CabeceraPantalla titulo={titulo} />
    </View>
  );
}
