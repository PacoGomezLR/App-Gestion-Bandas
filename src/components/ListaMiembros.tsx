import { Button, Text, View } from "react-native";

import type { Miembro } from "../types/miembro";

interface ListaMiembrosProps {
  miembros: Miembro[];
  procesando: boolean;
  onEditar: (miembro: Miembro) => void;
  onEliminar: (id: string) => void;
}

export function ListaMiembros({
  miembros,
  procesando,
  onEditar,
  onEliminar,
}: ListaMiembrosProps) {
  return (
    <View>
      {miembros.map((miembro) => (
        <View key={miembro.id}>
          <Text>
            {miembro.nombre}
          </Text>

          <Button
            title="Editar"
            onPress={() => onEditar(miembro)}
            disabled={procesando}
          />

          <Button
            title="Eliminar"
            onPress={() => onEliminar(miembro.id)}
            disabled={procesando}
          />
        </View>
      ))}
    </View>
  );
}
