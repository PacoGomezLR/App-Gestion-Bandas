import {
  Button,
  ScrollView,
  Text,
} from "react-native";
import { FormularioEvento } from "../components/FormularioEvento";
import { ListaEventos } from "../components/ListaEventos";
import { useEventosContext } from "../context/EventosContext";
import { useTecnicosContext } from "../context/TecnicosContext";

export default function Index() {
  const {
    eventos,
    titulo,
    tipo,
    estado,
    fecha,
    tecnicoIds,
    error,
    eventoEditandoId,
    setTitulo,
    setTipo,
    setEstado,
    setFecha,
    alternarTecnico,
    guardarEvento,
    eliminarEvento,
    prepararEdicion,
    cancelarEdicion,
    cargando: cargandoEventos,
    errorPersistencia: errorPersistenciaEventos,
  } = useEventosContext();

  const {
    tecnicos,
    cargando: cargandoTecnicos,
    errorPersistencia: errorPersistenciaTecnicos,
  } = useTecnicosContext();

  const eventosVisibles =
    fecha === ""
      ? eventos
      : eventos.filter((evento) => evento.fecha === fecha);

  if (cargandoEventos || cargandoTecnicos) {
    return <Text>Cargando datos...</Text>;
  }

  return (
    <ScrollView
      contentContainerStyle={{
        paddingBottom: 120,
      }}
    >
      <Text>Calendario</Text>

      {errorPersistenciaEventos !== "" && (
        <Text>{errorPersistenciaEventos}</Text>
      )}

      {errorPersistenciaTecnicos !== "" && (
        <Text>{errorPersistenciaTecnicos}</Text>
      )}

      <FormularioEvento
        titulo={titulo}
        tipo={tipo}
        estado={estado}
        fecha={fecha}
        fechasConEventos={eventos.map((evento) => evento.fecha)}
        tecnicos={tecnicos}
        tecnicoIds={tecnicoIds}
        error={error}
        editando={eventoEditandoId !== null}
        onCambiarTitulo={setTitulo}
        onCambiarTipo={setTipo}
        onCambiarEstado={setEstado}
        onSeleccionarFecha={setFecha}
        onAlternarTecnico={alternarTecnico}
        onGuardar={guardarEvento}
        onCancelar={cancelarEdicion}
      />

      {fecha !== "" && (
        <Button
          title="Ver todos"
          onPress={() => setFecha("")}
        />
      )}

      <ListaEventos
        eventos={eventosVisibles}
        tecnicos={tecnicos}
        onEliminar={eliminarEvento}
        onEditar={prepararEdicion}
      />
    </ScrollView>
  );
}
