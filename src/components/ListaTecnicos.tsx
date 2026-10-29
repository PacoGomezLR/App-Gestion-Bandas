import { Button, Text, View } from "react-native";

import type { Tecnico } from "../types/tecnico";

interface ListaTecnicosProps {
  tecnicos: Tecnico[];
  procesando: boolean;
  // Solo el admin de la banda edita o elimina; el resto solo consulta
  puedeEditar: boolean;
  onEditar: (tecnico: Tecnico) => void;
  onEliminar: (id: string) => void;
}

export function ListaTecnicos({
  tecnicos,
  procesando,
  puedeEditar,
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

          {puedeEditar && (
            <>
              <Button
                title="Editar"
                onPress={() => onEditar(tecnico)}
                disabled={procesando}
              />

              <Button
                title="Eliminar"
                onPress={() => onEliminar(tecnico.id)}
                disabled={procesando}
              />
            </>
          )}
        </View>
      ))}
    </View>
  );
}
