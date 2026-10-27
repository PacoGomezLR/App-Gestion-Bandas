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
    setNombre,
    guardarTecnico,
    prepararEdicion,
    cancelarEdicion,
    eliminarTecnico,
  } = useTecnicosContext();

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
        onCambiarNombre={setNombre}
        onGuardar={guardarTecnico}
        onCancelar={cancelarEdicion}
      />

      <ListaTecnicos
        tecnicos={tecnicos}
        onEditar={prepararEdicion}
        onEliminar={eliminarTecnico}
      />
    </ScrollView>
  );
}
