import { ScrollView, Text } from "react-native";

import { FormularioTecnico } from "../components/FormularioTecnico";
import { ListaTecnicos } from "../components/ListaTecnicos";
import { useBandaContext } from "../context/BandaContext";
import { useEventosContext } from "../context/EventosContext";
import { useTecnicosContext } from "../context/TecnicosContext";

export default function TecnicosScreen() {
  const {
    tecnicos,
    nombre,
    error,
    tecnicoEditandoId,
    procesando,
    setNombre,
    guardarTecnico,
    prepararEdicion,
    cancelarEdicion,
    eliminarTecnico,
    errorEliminacion,
    cargando,
    errorPersistencia,
  } = useTecnicosContext();

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
      <Text>Técnicos</Text>

      {esAdmin && (
        <FormularioTecnico
          nombre={nombre}
          error={error}
          editando={tecnicoEditandoId !== null}
          procesando={procesando}
          onCambiarNombre={setNombre}
          onGuardar={guardarTecnico}
          onCancelar={cancelarEdicion}
        />
      )}

      {errorPersistencia !== "" && (
        <Text>{errorPersistencia}</Text>
      )}

      {errorEliminacion !== "" && (
        <Text>{errorEliminacion}</Text>
      )}

      <ListaTecnicos
        tecnicos={tecnicos}
        procesando={procesando}
        puedeEditar={esAdmin}
        onEditar={prepararEdicion}
        onEliminar={eliminarTecnico}
      />
    </ScrollView>
  );
}
