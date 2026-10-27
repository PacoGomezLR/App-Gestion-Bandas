import { Button, Text, TextInput } from "react-native";

interface FormularioTecnicoProps {
  nombre: string;
  error: string;
  editando: boolean;
  onCambiarNombre: (nombre: string) => void;
  onGuardar: () => void;
}

export function FormularioTecnico({
  nombre,
  error,
  editando,
  onCambiarNombre,
  onGuardar,
}: FormularioTecnicoProps) {
  return (
    <>
      <TextInput
        placeholder="Nombre del técnico"
        value={nombre}
        onChangeText={onCambiarNombre}
      />

      {error !== "" && <Text>{error}</Text>}

      <Button
        title={editando ? "Guardar cambios" : "Guardar técnico"}
        onPress={onGuardar}
      />
    </>
  );
}
