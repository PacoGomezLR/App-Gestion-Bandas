import { useRef, useState } from "react";

import { useAuthContext } from "../context/AuthContext";
import { useInvitacionPendiente } from "../context/InvitacionPendienteContext";
import { ERROR_NOMBRE_VISIBLE, LONGITUD_MAXIMA_NOMBRE, normalizarNombreVisible } from "../utils/nombreVisible";
import { AccionSecundaria, BotonPrincipal, CampoFormulario, Mensaje, PantallaBase } from "./PantallaBase";

type ModoAcceso = "entrar" | "registro" | "recuperar";

export const AVISO_CUENTA_CREADA =
  "Cuenta creada. Revisa tu correo y confirma tu cuenta antes de iniciar sesión.";
export const AVISO_CORREO_REENVIADO =
  "Correo de verificación reenviado. Revisa tu bandeja de entrada y la carpeta de spam.";
// Igual exista o no la cuenta: no se revela qué correos están registrados
export const AVISO_RECUPERACION_ENVIADA =
  "Te hemos enviado un correo para restablecer tu contraseña.";

// Entrar o crear una cuenta. Crear cuenta pide el nombre que verá la banda, pero
// no da acceso a ninguna banda ni pide rol. «Restablecer contraseña» pide solo
// el correo y envía el enlace de recuperación
export function PantallaAcceso() {
  const {
    iniciarSesion,
    crearCuenta,
    reenviarVerificacion,
    solicitarRecuperacion,
    correoSinVerificar,
    error,
  } = useAuthContext();
  const { tokenPendiente } = useInvitacionPendiente();
  const [modo, setModo] = useState<ModoAcceso>("entrar");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repetirPassword, setRepetirPassword] = useState("");
  const [errorValidacion, setErrorValidacion] = useState("");
  const [aviso, setAviso] = useState("");
  // Estado local: impide lanzar dos accesos o registros a la vez desde la interfaz
  const [procesando, setProcesando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  // Un doble toque llega antes de que el botón se repinte deshabilitado
  const reenviandoRef = useRef(false);

  const registrando = modo === "registro";
  const recuperando = modo === "recuperar";
  // Solo para el correo que Supabase ha dado por no verificado: si se escribe
  // otro, la acción desaparece
  const puedeReenviar =
    modo === "entrar" &&
    correoSinVerificar !== null &&
    correoSinVerificar === email.trim().toLowerCase();

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

    if (normalizarNombreVisible(nombre) === null) {
      setErrorValidacion(ERROR_NOMBRE_VISIBLE);
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
      const resultado = await crearCuenta(nombre, email, password);

      // Con sesión iniciada no hay nada que mostrar: AppAuthGate cambia de pantalla.
      // Sin sesión hay que confirmar el correo antes de entrar (la invitación
      // pendiente, si la hay, sigue en memoria)
      if (resultado === "confirmacion_requerida") {
        setModo("entrar");
        setPassword("");
        setRepetirPassword("");
        setAviso(AVISO_CUENTA_CREADA);
      }
    } finally {
      setProcesando(false);
    }
  }

  async function reenviar() {
    if (reenviandoRef.current) {
      return;
    }

    reenviandoRef.current = true;
    setReenviando(true);
    setErrorValidacion("");
    setAviso("");

    try {
      // Si falla, el motivo llega por error del contexto (sin inventar éxito)
      if ((await reenviarVerificacion()) === "enviado") {
        setAviso(AVISO_CORREO_REENVIADO);
      }
    } finally {
      reenviandoRef.current = false;
      setReenviando(false);
    }
  }

  async function pedirRecuperacion() {
    if (procesando) {
      return;
    }

    if (email.trim() === "") {
      setErrorValidacion("Introduce el correo electrónico");
      return;
    }

    setErrorValidacion("");
    setAviso("");
    setProcesando(true);

    try {
      // Si falla (límite de correos, red…), el motivo llega por error del contexto
      if ((await solicitarRecuperacion(email)) === "enviado") {
        cambiarModo("entrar");
        setPassword("");
        setAviso(AVISO_RECUPERACION_ENVIADA);
      }
    } finally {
      setProcesando(false);
    }
  }

  const mensajeError = errorValidacion !== "" ? errorValidacion : error;

  return (
    <PantallaBase
      subtitulo={
        registrando
          ? "Crea tu cuenta"
          : recuperando
            ? "Restablecer contraseña"
            : "Organiza tu banda en un solo lugar"
      }
    >
      {registrando && (
        <CampoFormulario
          etiqueta="Nombre"
          placeholder="Nombre y apellido"
          value={nombre}
          onChangeText={setNombre}
          editable={!procesando}
          maxLength={LONGITUD_MAXIMA_NOMBRE}
          autoCapitalize="words"
          autoComplete="name"
        />
      )}

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

      {!recuperando && (
        <CampoFormulario
          etiqueta="Contraseña"
          value={password}
          onChangeText={setPassword}
          editable={!procesando}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={registrando ? "new-password" : "password"}
        />
      )}

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

      {/* La invitación se recuerda mientras entra, crea la cuenta o confirma el correo */}
      {tokenPendiente !== null && (
        <Mensaje
          tipo="info"
          texto="Tienes una invitación a una banda. Entra o crea tu cuenta para continuar."
        />
      )}

      {aviso !== "" && <Mensaje tipo="info" texto={aviso} />}
      {mensajeError !== "" && <Mensaje tipo="error" texto={mensajeError} />}

      {puedeReenviar && (
        <AccionSecundaria
          pregunta="¿No te ha llegado el correo?"
          titulo="Reenviar correo de verificación"
          onPress={() => {
            void reenviar();
          }}
          disabled={procesando || reenviando}
        />
      )}

      <BotonPrincipal
        titulo={registrando ? "Crear cuenta" : recuperando ? "Enviar enlace" : "Entrar"}
        onPress={() => {
          void (registrando ? registrar() : recuperando ? pedirRecuperacion() : entrar());
        }}
        disabled={procesando}
      />

      {modo === "entrar" && (
        <AccionSecundaria
          pregunta="¿Has olvidado tu contraseña?"
          titulo="Restablecer contraseña"
          onPress={() => cambiarModo("recuperar")}
          disabled={procesando}
        />
      )}

      <AccionSecundaria
        pregunta={
          registrando ? "¿Ya tienes cuenta?" : recuperando ? "¿La recuerdas?" : "¿Aún no tienes cuenta?"
        }
        titulo={registrando || recuperando ? "Entrar" : "Crear cuenta"}
        onPress={() => cambiarModo(modo === "entrar" ? "registro" : "entrar")}
        disabled={procesando}
      />
    </PantallaBase>
  );
}
