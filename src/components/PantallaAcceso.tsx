import { useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";

import { useAuthContext } from "../context/AuthContext";

type ModoAcceso = "entrar" | "registro";

// Entrar o crear una cuenta. Crear cuenta no da acceso a ninguna banda ni pide rol
export function PantallaAcceso() {
  const { iniciarSesion, crearCuenta, error } = useAuthContext();
  const [modo, setModo] = useState<ModoAcceso>("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repetirPassword, setRepetirPassword] = useState("");
  const [errorValidacion, setErrorValidacion] = useState("");
  const [aviso, setAviso] = useState("");
  // Estado local: impide lanzar dos accesos o registros a la vez desde la interfaz
  const [procesando, setProcesando] = useState(false);

  const registrando = modo === "registro";

  function cambiarModo(nuevoModo: ModoAcceso) {
    setModo(nuevoModo);
    setErrorValidacion("");
    setAviso("");
    setRepetirPassword("");
  }

  async function entrar() {
    if (procesando) {
      return;
    }

    if (email.trim() === "" || password === "") {
      setErrorValidacion("Introduce el correo electrónico y la contraseña");
      return;
    }

    setErrorValidacion("");
    setAviso("");
    setProcesando(true);

    try {
      await iniciarSesion(email, password);
    } finally {
      setProcesando(false);
    }
  }

  async function registrar() {
    if (procesando) {
      return;
    }

    if (email.trim() === "" || password === "" || repetirPassword === "") {
      setErrorValidacion("Introduce el correo electrónico y la contraseña");
      return;
    }

    if (password !== repetirPassword) {
      setErrorValidacion("Las contraseñas no coinciden");
      return;
    }

    setErrorValidacion("");
    setAviso("");
    setProcesando(true);

    try {
      const resultado = await crearCuenta(email, password);

      // Con sesión iniciada no hay nada que mostrar: AppAuthGate cambia de pantalla
      if (resultado === "confirmacion_requerida") {
        setModo("entrar");
        setPassword("");
        setRepetirPassword("");
        setAviso("Cuenta creada. Revisa tu correo para confirmar tu cuenta.");
      }
    } finally {
      setProcesando(false);
    }
  }

  const mensajeError = errorValidacion !== "" ? errorValidacion : error;

  return (
    <View style={styles.contenedor}>
      <Text>{registrando ? "Crear cuenta" : "Acceso"}</Text>

      <TextInput
        placeholder="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        editable={!procesando}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />

      <TextInput
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        editable={!procesando}
        secureTextEntry
        autoCapitalize="none"
        autoComplete={registrando ? "new-password" : "password"}
      />

      {registrando && (
        <TextInput
          placeholder="Repetir contraseña"
          value={repetirPassword}
          onChangeText={setRepetirPassword}
          editable={!procesando}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
        />
      )}

      {aviso !== "" && <Text>{aviso}</Text>}
      {mensajeError !== "" && <Text>{mensajeError}</Text>}

      <Button
        title={registrando ? "Crear cuenta" : "Entrar"}
        onPress={() => {
          void (registrando ? registrar() : entrar());
        }}
        disabled={procesando}
      />

      <Button
        title={registrando ? "Ya tengo cuenta" : "Crear cuenta"}
        onPress={() => cambiarModo(registrando ? "entrar" : "registro")}
        disabled={procesando}
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
