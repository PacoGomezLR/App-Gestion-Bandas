import { Button, Text, View } from "react-native";

import type { Tecnico } from "../types/tecnico";

interface ListaTecnicosProps {
  tecnicos: Tecnico[];
  onEditar: (tecnico: Tecnico) => void;
}

export function ListaTecnicos({
  tecnicos,
  onEditar,
}: ListaTecnicosProps) {
  return (
    <View>
      {tecnicos.map((tecnico) => (
        <View key={tecnico.id}>
          <Text>
            {tecnico.nombre}
          </Text>

          <Button
            title="Editar"
            onPress={() => onEditar(tecnico)}
          />
        </View>
      ))}
    </View>
  );
}
