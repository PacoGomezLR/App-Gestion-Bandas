import { BotonPrincipal, CampoFormulario, Mensaje } from "./PantallaBase";
import { BotonSecundario, Tarjeta } from "./PantallaInterior";

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
    <Tarjeta titulo={editando ? "Editar técnico" : "Nuevo técnico"}>
      <CampoFormulario
        etiqueta="Nombre del técnico"
        value={nombre}
        onChangeText={onCambiarNombre}
        editable={!procesando}
        autoCapitalize="words"
      />

      {error !== "" && <Mensaje tipo="error" texto={error} />}

      <BotonPrincipal
        titulo={editando ? "Guardar cambios" : "Guardar técnico"}
        onPress={onGuardar}
        disabled={procesando}
      />
      <BotonSecundario titulo="Cancelar" onPress={onCancelar} disabled={procesando} />
    </Tarjeta>
  );
}
