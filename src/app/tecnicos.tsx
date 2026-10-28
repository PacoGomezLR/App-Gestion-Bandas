import { ScrollView, Text } from "react-native";

import { FormularioTecnico } from "../components/FormularioTecnico";
import { ListaTecnicos } from "../components/ListaTecnicos";
import { useTecnicosContext } from "../context/TecnicosContext";

export default function TecnicosScreen() {
  const {
    tecnicos,
    nombre,
    error,
    tecnicoEditandoId,
    procesando,
    setNombre,
    guardarTecnico,
    prepararEdicion,
    cancelarEdicion,
    eliminarTecnico,
    errorEliminacion,
    cargando,
    errorPersistencia,
  } = useTecnicosContext();

  if (cargando) {
    return <Text>Cargando datos...</Text>;
  }

  return (
    <ScrollView
      contentContainerStyle={{
        paddingBottom: 120,
      }}
    >
      <Text>Técnicos</Text>

      <FormularioTecnico
        nombre={nombre}
        error={error}
        editando={tecnicoEditandoId !== null}
        procesando={procesando}
        onCambiarNombre={setNombre}
        onGuardar={guardarTecnico}
        onCancelar={cancelarEdicion}
      />

      {errorPersistencia !== "" && (
        <Text>{errorPersistencia}</Text>
      )}

      {errorEliminacion !== "" && (
        <Text>{errorEliminacion}</Text>
      )}

      <ListaTecnicos
        tecnicos={tecnicos}
        procesando={procesando}
        onEditar={prepararEdicion}
        onEliminar={eliminarTecnico}
      />
    </ScrollView>
  );
}
