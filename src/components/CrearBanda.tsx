import { useMemo, useState } from "react";
import { Text } from "react-native";

import { useBandaContext } from "../context/BandaContext";
import { useTheme } from "@/hooks/use-theme";
import { crearEstilosCrearBanda } from "./CrearBanda.styles";
import { BotonPrincipal, CampoFormulario, Mensaje, PantallaBase } from "./PantallaBase";

// Para una cuenta que aún no pertenece a ninguna banda
export function CrearBanda() {
  const { crearBanda, error } = useBandaContext();
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosCrearBanda(tema), [tema]);
  const [nombre, setNombre] = useState("");
  const [errorValidacion, setErrorValidacion] = useState("");
  // Estado local: impide crear dos bandas con una doble pulsación
  const [creando, setCreando] = useState(false);

  async function crear() {
    if (creando) {
      return;
    }

    const nombreLimpio = nombre.trim();

    if (nombreLimpio === "") {
      setErrorValidacion("Escribe el nombre de la banda");
      return;
    }

    setErrorValidacion("");
    setCreando(true);

    try {
      await crearBanda(nombreLimpio);
    } finally {
      setCreando(false);
    }
  }

  const mensajeError = errorValidacion !== "" ? errorValidacion : error;

  return (
    <PantallaBase subtitulo="Crea tu banda">
      <Text style={estilos.introduccion}>
        Empieza creando el espacio de tu banda.
      </Text>

      <CampoFormulario
        etiqueta="Nombre de la banda"
        placeholder="Ej. Cathaline"
        value={nombre}
        onChangeText={setNombre}
        editable={!creando}
        autoCapitalize="words"
        returnKeyType="done"
      />

      {mensajeError !== "" && <Mensaje tipo="error" texto={mensajeError} />}

      <BotonPrincipal
        titulo="Crear banda"
        onPress={() => {
          void crear();
        }}
        disabled={creando}
      />
    </PantallaBase>
  );
}
