import { Button, Text, View } from "react-native";

import type { Tecnico } from "../types/tecnico";

interface ListaTecnicosProps {
  tecnicos: Tecnico[];
  onEditar: (tecnico: Tecnico) => void;
  onEliminar: (id: string) => void;
}

export function ListaTecnicos({
  tecnicos,
  onEditar,
  onEliminar,
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

          <Button
            title="Eliminar"
            onPress={() => onEliminar(tecnico.id)}
          />
        </View>
      ))}
    </View>
  );
}
