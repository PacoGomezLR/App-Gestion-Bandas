import { useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";

import { useBandaContext } from "../context/BandaContext";

// Para una cuenta que aún no pertenece a ninguna banda
export function CrearBanda() {
  const { crearBanda, error } = useBandaContext();
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
    <View style={styles.contenedor}>
      <TextInput
        placeholder="Nombre de la banda"
        value={nombre}
        onChangeText={setNombre}
        editable={!creando}
      />

      {mensajeError !== "" && <Text>{mensajeError}</Text>}

      <Button
        title="Crear banda"
        onPress={() => {
          void crear();
        }}
        disabled={creando}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    justifyContent: "center",
    gap: 16,
    padding: 24,
    backgroundColor: "#ffffff",
  },
});
