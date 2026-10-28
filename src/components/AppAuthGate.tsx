import type { PropsWithChildren } from "react";
import { Button, StyleSheet, Text, View } from "react-native";

import { useAuthContext } from "../context/AuthContext";
import { BandaProvider, useBandaContext } from "../context/BandaContext";
import { CrearBanda } from "./CrearBanda";
import { PantallaAcceso } from "./PantallaAcceso";

function Cargando() {
  return (
    <View style={styles.contenedor}>
      <Text>Cargando...</Text>
    </View>
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
        <View style={styles.contenedor}>
          <Text>{errorCarga}</Text>
          <Button
            title="Reintentar"
            onPress={() => {
              void recargarBandas();
            }}
          />
        </View>
      );
    }

    return <CrearBanda />;
  }

  return <>{children}</>;
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

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    backgroundColor: "#ffffff",
  },
});
