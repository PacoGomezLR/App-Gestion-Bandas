import { Button, Text, TextInput } from "react-native";

interface FormularioTecnicoProps {
  nombre: string;
  error: string;
  editando: boolean;
  procesando: boolean;
  onCambiarNombre: (nombre: string) => void;
  onGuardar: () => void;
  onCancelar: () => void;
}

export function FormularioTecnico({
  nombre,
  error,
  editando,
  procesando,
  onCambiarNombre,
  onGuardar,
  onCancelar,
}: FormularioTecnicoProps) {
  return (
    <>
      <TextInput
        placeholder="Nombre del técnico"
        value={nombre}
        onChangeText={onCambiarNombre}
        editable={!procesando}
      />

      {error !== "" && <Text>{error}</Text>}

      <Button
        title={editando ? "Guardar cambios" : "Guardar técnico"}
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
