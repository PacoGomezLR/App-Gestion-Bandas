import { Text, View } from "react-native";

import type { Tecnico } from "../types/tecnico";

interface ListaTecnicosProps {
  tecnicos: Tecnico[];
}

export function ListaTecnicos({
  tecnicos,
}: ListaTecnicosProps) {
  return (
    <View>
      {tecnicos.map((tecnico) => (
        <Text key={tecnico.id}>
          {tecnico.nombre}
        </Text>
      ))}
    </View>
  );
}
