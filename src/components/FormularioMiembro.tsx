import { Button, Text, TextInput } from "react-native";

interface FormularioMiembroProps {
  nombre: string;
  error: string;
  editando: boolean;
  procesando: boolean;
  onCambiarNombre: (nombre: string) => void;
  onGuardar: () => void;
  onCancelar: () => void;
}

export function FormularioMiembro({
  nombre,
  error,
  editando,
  procesando,
  onCambiarNombre,
  onGuardar,
  onCancelar,
}: FormularioMiembroProps) {
  return (
    <>
      <TextInput
        placeholder="Nombre del músico"
        value={nombre}
        onChangeText={onCambiarNombre}
        editable={!procesando}
      />

      {error !== "" && <Text>{error}</Text>}

      <Button
        title={editando ? "Guardar cambios" : "Guardar músico"}
        onPress={onGuardar}
        disabled={procesando}
      />

      {editando && (
        <Button
          title="Cancelar"
          onPress={onCancelar}
          disabled={procesando}
        />
      )}
    </>
  );
}
