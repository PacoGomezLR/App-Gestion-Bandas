import { useRef, useState } from "react";

import { useAuthContext } from "../context/AuthContext";
import { validarNuevaContrasena } from "../utils/contrasena";
import { AccionSecundaria, BotonPrincipal, CampoFormulario, Mensaje, PantallaBase } from "./PantallaBase";

export const AVISO_CONTRASENA_ACTUALIZADA = "Contraseña actualizada correctamente.";

// Se ve al abrir el enlace «restablecer contraseña»: la sesión de recuperación
// ya existe y aquí se elige la nueva. Guardar llama a updateUser; después,
// Continuar entra en la app como siempre. Cancelar cierra esa sesión y vuelve
// al acceso con la contraseña de antes.
export function NuevaContrasena() {
  const { actualizarContrasena, finalizarRecuperacion, cerrarSesion, error } = useAuthContext();
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");
  const [errorValidacion, setErrorValidacion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [actualizada, setActualizada] = useState(false);
  // Un doble toque llega antes de que el botón se repinte deshabilitado
  const guardandoRef = useRef(false);

  async function guardar() {
    if (guardandoRef.current) {
      return;
    }

    const problema = validarNuevaContrasena(nueva, repetida);

    if (problema !== null) {
      setErrorValidacion(problema);
      return;
    }

    guardandoRef.current = true;
    setErrorValidacion("");
    setGuardando(true);

    try {
      // Si falla, el motivo llega por error del contexto
      if ((await actualizarContrasena(nueva)) === "actualizada") {
        // La contraseña no se queda en memoria
        setNueva("");
        setRepetida("");
        setActualizada(true);
      }
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
    }
  }

  async function cancelar() {
    await cerrarSesion();
    finalizarRecuperacion();
  }

  if (actualizada) {
    return (
      <PantallaBase subtitulo="Nueva contraseña">
        <Mensaje tipo="exito" texto={AVISO_CONTRASENA_ACTUALIZADA} />
        <BotonPrincipal titulo="Continuar" onPress={finalizarRecuperacion} />
      </PantallaBase>
    );
  }

  const mensajeError = errorValidacion !== "" ? errorValidacion : error;

  return (
    <PantallaBase subtitulo="Nueva contraseña">
      <CampoFormulario
        etiqueta="Nueva contraseña"
        value={nueva}
        onChangeText={setNueva}
        editable={!guardando}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
      />

      <CampoFormulario
        etiqueta="Repetir contraseña"
        value={repetida}
        onChangeText={setRepetida}
        editable={!guardando}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
      />

      {mensajeError !== "" && <Mensaje tipo="error" texto={mensajeError} />}

      <BotonPrincipal
        titulo={guardando ? "Guardando..." : "Guardar"}
        onPress={() => {
          void guardar();
        }}
        disabled={guardando}
      />

      <AccionSecundaria
        pregunta="¿Prefieres no cambiarla?"
        titulo="Cancelar"
        onPress={() => {
          void cancelar();
        }}
        disabled={guardando}
      />
    </PantallaBase>
  );
}
