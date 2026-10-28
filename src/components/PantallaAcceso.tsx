import { useState } from "react";

import { useAuthContext } from "../context/AuthContext";
import { AccionSecundaria, BotonPrincipal, CampoFormulario, Mensaje, PantallaBase } from "./PantallaBase";

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
    <PantallaBase
      subtitulo={registrando ? "Crea tu cuenta" : "Organiza tu banda en un solo lugar"}
    >
      <CampoFormulario
        etiqueta="Correo electrónico"
        placeholder="nombre@correo.com"
        value={email}
        onChangeText={setEmail}
        editable={!procesando}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />

      <CampoFormulario
        etiqueta="Contraseña"
        value={password}
        onChangeText={setPassword}
        editable={!procesando}
        secureTextEntry
        autoCapitalize="none"
        autoComplete={registrando ? "new-password" : "password"}
      />

      {registrando && (
        <CampoFormulario
          etiqueta="Repetir contraseña"
          value={repetirPassword}
          onChangeText={setRepetirPassword}
          editable={!procesando}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
        />
      )}

      {aviso !== "" && <Mensaje tipo="info" texto={aviso} />}
      {mensajeError !== "" && <Mensaje tipo="error" texto={mensajeError} />}

      <BotonPrincipal
        titulo={registrando ? "Crear cuenta" : "Entrar"}
        onPress={() => {
          void (registrando ? registrar() : entrar());
        }}
        disabled={procesando}
      />

      <AccionSecundaria
        pregunta={registrando ? "¿Ya tienes cuenta?" : "¿Aún no tienes cuenta?"}
        titulo={registrando ? "Entrar" : "Crear cuenta"}
        onPress={() => cambiarModo(registrando ? "entrar" : "registro")}
        disabled={procesando}
      />
    </PantallaBase>
  );
}
