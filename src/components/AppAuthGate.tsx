import { Fragment, type PropsWithChildren, useMemo } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { useAuthContext } from "../context/AuthContext";
import { BandaProvider, useBandaContext } from "../context/BandaContext";
import { useTheme } from "@/hooks/use-theme";
import { crearEstilosAppAuthGate } from "./AppAuthGate.styles";
import { CrearBanda } from "./CrearBanda";
import { BotonPrincipal, Mensaje, PantallaBase } from "./PantallaBase";
import { PantallaAcceso } from "./PantallaAcceso";

function Cargando() {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosAppAuthGate(tema), [tema]);

  return (
    <PantallaBase>
      <View style={estilos.cargando}>
        <ActivityIndicator size="large" color={tema.primary} />
        <Text style={estilos.textoCargando}>Cargando...</Text>
      </View>
    </PantallaBase>
  );
}

// Los hijos (datos de la app) solo se montan con una banda activa
function ContenidoBanda({ children }: PropsWithChildren) {
  const { cargando, bandaActual, errorCarga, recargarBandas } = useBandaContext();

  if (cargando) {
    return <Cargando />;
  }

  if (bandaActual === null) {
    // Si la carga falla no se ofrece crear banda: podría duplicar una existente
    if (errorCarga !== "") {
      return (
        <PantallaBase>
          <Mensaje tipo="error" texto={errorCarga} />
          <BotonPrincipal
            titulo="Reintentar"
            onPress={() => {
              void recargarBandas();
            }}
          />
        </PantallaBase>
      );
    }

    return <CrearBanda />;
  }

  // key por banda: al cambiar de banda se desmontan los datos y formularios de la
  // anterior, y una respuesta tardía de esa banda ya no puede llegar a la nueva
  return <Fragment key={bandaActual.id}>{children}</Fragment>;
}

// Sin sesión no se montan los hijos: los datos locales no se cargan antes de autenticar
export function AppAuthGate({ children }: PropsWithChildren) {
  const { cargando, session } = useAuthContext();

  if (cargando) {
    return <Cargando />;
  }

  if (session === null) {
    return <PantallaAcceso />;
  }

  return (
    <BandaProvider>
      <ContenidoBanda>{children}</ContenidoBanda>
    </BandaProvider>
  );
}
