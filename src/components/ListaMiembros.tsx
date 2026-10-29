import { Button, Text, View } from "react-native";

import type { Miembro } from "../types/miembro";

interface ListaMiembrosProps {
  miembros: Miembro[];
  procesando: boolean;
  // Solo el admin de la banda edita o elimina; el resto solo consulta
  puedeEditar: boolean;
  onEditar: (miembro: Miembro) => void;
  onEliminar: (id: string) => void;
}

export function ListaMiembros({
  miembros,
  procesando,
  puedeEditar,
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

          {puedeEditar && (
            <>
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
            </>
          )}
        </View>
      ))}
    </View>
  );
}
