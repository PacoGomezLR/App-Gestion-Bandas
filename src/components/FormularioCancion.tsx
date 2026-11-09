import { useMemo, useState } from "react";
import { View } from "react-native";

import { LONGITUD_MAXIMA_CANCION, validarNombreCancion } from "../utils/canciones";
import { crearEstilosFormularioCancion } from "./FormularioCancion.styles";
import { BotonPrincipal, CampoFormulario, Mensaje } from "./PantallaBase";
import { BotonSecundario, Tarjeta } from "./PantallaInterior";

interface FormularioCancionProps {
  // Sin nombre inicial es un alta
  nombreInicial?: string;
  // Fallo de la base al guardar: lo escrito sigue en el campo
  errorGuardado: string;
  procesando: boolean;
  onGuardar: (nombre: string) => void;
  onCancelar: () => void;
}

export function FormularioCancion({
  nombreInicial,
  errorGuardado,
  procesando,
  onGuardar,
  onCancelar,
}: FormularioCancionProps) {
  const estilos = useMemo(() => crearEstilosFormularioCancion(), []);
  const editando = nombreInicial !== undefined;
  const [nombre, setNombre] = useState(nombreInicial ?? "");
  const [errorValidacion, setErrorValidacion] = useState("");

  function guardar() {
    const resultado = validarNombreCancion(nombre);

    if (!resultado.valido) {
      setErrorValidacion(resultado.error);
      return;
    }

    setErrorValidacion("");
    onGuardar(resultado.nombre);
  }

  const textoGuardar = editando ? "Guardar cambios" : "Guardar canción";
  const error = errorValidacion !== "" ? errorValidacion : errorGuardado;

  return (
    <Tarjeta titulo={editando ? "Editar canción" : "Nueva canción"}>
      <CampoFormulario
        etiqueta="Canción"
        placeholder="Años 80 - Los Piratas"
        value={nombre}
        onChangeText={setNombre}
        editable={!procesando}
        maxLength={LONGITUD_MAXIMA_CANCION}
        autoCapitalize="sentences"
        returnKeyType="done"
        onSubmitEditing={guardar}
      />

      {error !== "" && <Mensaje tipo="error" texto={error} />}

      <BotonPrincipal
        titulo={procesando ? "Guardando..." : textoGuardar}
        onPress={guardar}
        disabled={procesando}
      />
      <View style={estilos.accionSecundaria}>
        <BotonSecundario titulo="Cancelar" onPress={onCancelar} disabled={procesando} />
      </View>
    </Tarjeta>
  );
}
