import { ScrollView, Text } from "react-native";

import { FormularioMiembro } from "../components/FormularioMiembro";
import { ListaMiembros } from "../components/ListaMiembros";
import { useBandaContext } from "../context/BandaContext";
import { useEventosContext } from "../context/EventosContext";
import { useMiembrosContext } from "../context/MiembrosContext";

export default function MiembrosScreen() {
  const {
    miembros,
    nombre,
    error,
    miembroEditandoId,
    procesando,
    setNombre,
    guardarMiembro,
    prepararEdicion,
    cancelarEdicion,
    eliminarMiembro,
    cargando,
    errorPersistencia,
    errorEliminacion,
  } = useMiembrosContext();

  const {
    cargando: cargandoEventos,
  } = useEventosContext();

  // Sin rol visible: a quien no es admin simplemente no se le ofrecen las acciones
  const { esAdmin } = useBandaContext();

  if (cargando || cargandoEventos) {
    return <Text>Cargando datos...</Text>;
  }

  return (
    <ScrollView
      contentContainerStyle={{
        paddingBottom: 120,
      }}
    >
      <Text>Músicos</Text>

      {esAdmin && (
        <FormularioMiembro
          nombre={nombre}
          error={error}
          editando={miembroEditandoId !== null}
          procesando={procesando}
          onCambiarNombre={setNombre}
          onGuardar={guardarMiembro}
          onCancelar={cancelarEdicion}
        />
      )}

      {errorPersistencia !== "" && (
        <Text>{errorPersistencia}</Text>
      )}

      {errorEliminacion !== "" && (
        <Text>{errorEliminacion}</Text>
      )}

      <ListaMiembros
        miembros={miembros}
        procesando={procesando}
        puedeEditar={esAdmin}
        onEditar={prepararEdicion}
        onEliminar={eliminarMiembro}
      />
    </ScrollView>
  );
}
