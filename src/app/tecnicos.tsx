import { ScrollView, Text } from "react-native";

import { FormularioTecnico } from "../components/FormularioTecnico";
import { ListaTecnicos } from "../components/ListaTecnicos";
import { useTecnicos } from "../hooks/useTecnicos";

export default function TecnicosScreen() {
  const {
    tecnicos,
    nombre,
    error,
    setNombre,
    guardarTecnico,
  } = useTecnicos();

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
        onCambiarNombre={setNombre}
        onGuardar={guardarTecnico}
      />

      <ListaTecnicos tecnicos={tecnicos} />
    </ScrollView>
  );
}
