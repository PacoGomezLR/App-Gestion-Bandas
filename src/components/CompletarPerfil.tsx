import { useState } from "react";

import { useAuthContext } from "../context/AuthContext";
import { ERROR_NOMBRE_VISIBLE, LONGITUD_MAXIMA_NOMBRE, normalizarNombreVisible } from "../utils/nombreVisible";
import { BotonPrincipal, CampoFormulario, Mensaje, PantallaBase } from "./PantallaBase";

// Solo para cuentas creadas antes de pedir el nombre al registrarse.
// Aparece una vez: al guardar, AppAuthGate deja pasar a la app.
export function CompletarPerfil() {
  const { completarNombreVisible, error } = useAuthContext();
  const [nombre, setNombre] = useState("");
  const [errorValidacion, setErrorValidacion] = useState("");
  const [procesando, setProcesando] = useState(false);

  async function guardar() {
    if (procesando) {
      return;
    }

    if (normalizarNombreVisible(nombre) === null) {
      setErrorValidacion(ERROR_NOMBRE_VISIBLE);
      return;
    }

    setErrorValidacion("");
    setProcesando(true);

    try {
      await completarNombreVisible(nombre);
    } finally {
      setProcesando(false);
    }
  }

  const mensajeError = errorValidacion !== "" ? errorValidacion : error;

  return (
    <PantallaBase subtitulo="Completa tu perfil">
      <Mensaje
        tipo="info"
        texto="Escribe tu nombre: es lo que verá el resto de la banda, por ejemplo cuando no puedas tocar un día."
      />

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

      {mensajeError !== "" && <Mensaje tipo="error" texto={mensajeError} />}

      <BotonPrincipal
        titulo="Guardar"
        onPress={() => {
          void guardar();
        }}
        disabled={procesando}
      />
    </PantallaBase>
  );
}
