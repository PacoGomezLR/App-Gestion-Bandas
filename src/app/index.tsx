import {
  Button,
  ScrollView,
  Text,
} from "react-native";
import { BotonCerrarSesion } from "../components/BotonCerrarSesion";
import { FormularioEvento } from "../components/FormularioEvento";
import { ListaEventos } from "../components/ListaEventos";
import { useEventosContext } from "../context/EventosContext";
import { useMiembrosContext } from "../context/MiembrosContext";
import { useTecnicosContext } from "../context/TecnicosContext";

export default function Index() {
  const {
    eventos,
    titulo,
    tipo,
    estado,
    fecha,
    hora,
    lugar,
    notas,
    tecnicoIds,
    miembroIds,
    error,
    eventoEditandoId,
    setTitulo,
    setTipo,
    setEstado,
    setFecha,
    setHora,
    setLugar,
    setNotas,
    alternarTecnico,
    alternarMiembro,
    guardarEvento,
    eliminarEvento,
    prepararEdicion,
    cancelarEdicion,
    procesando,
    cargando: cargandoEventos,
    errorPersistencia: errorPersistenciaEventos,
  } = useEventosContext();

  const {
    tecnicos,
    cargando: cargandoTecnicos,
    errorPersistencia: errorPersistenciaTecnicos,
  } = useTecnicosContext();

  const {
    miembros,
    cargando: cargandoMiembros,
    errorPersistencia: errorPersistenciaMiembros,
  } = useMiembrosContext();

  const eventosVisibles =
    fecha === ""
      ? eventos
      : eventos.filter((evento) => evento.fecha === fecha);

  if (cargandoEventos || cargandoTecnicos || cargandoMiembros) {
    return <Text>Cargando datos...</Text>;
  }

  return (
    <ScrollView
      contentContainerStyle={{
        paddingBottom: 120,
      }}
    >
      <BotonCerrarSesion />

      <Text>Calendario</Text>

      {errorPersistenciaEventos !== "" && (
        <Text>{errorPersistenciaEventos}</Text>
      )}

      {errorPersistenciaTecnicos !== "" && (
        <Text>{errorPersistenciaTecnicos}</Text>
      )}

      {errorPersistenciaMiembros !== "" && (
        <Text>{errorPersistenciaMiembros}</Text>
      )}

      <FormularioEvento
        titulo={titulo}
        tipo={tipo}
        estado={estado}
        fecha={fecha}
        hora={hora}
        lugar={lugar}
        notas={notas}
        fechasConEventos={eventos.map((evento) => evento.fecha)}
        tecnicos={tecnicos}
        tecnicoIds={tecnicoIds}
        miembros={miembros}
        miembroIds={miembroIds}
        error={error}
        editando={eventoEditandoId !== null}
        procesando={procesando}
        onCambiarTitulo={setTitulo}
        onCambiarTipo={setTipo}
        onCambiarEstado={setEstado}
        onSeleccionarFecha={setFecha}
        onCambiarHora={setHora}
        onCambiarLugar={setLugar}
        onCambiarNotas={setNotas}
        onAlternarTecnico={alternarTecnico}
        onAlternarMiembro={alternarMiembro}
        onGuardar={guardarEvento}
        onCancelar={cancelarEdicion}
      />

      {fecha !== "" && (
        <Button
          title="Ver todos"
          onPress={() => setFecha("")}
          disabled={procesando}
        />
      )}

      <ListaEventos
        eventos={eventosVisibles}
        tecnicos={tecnicos}
        miembros={miembros}
        procesando={procesando}
        onEliminar={eliminarEvento}
        onEditar={prepararEdicion}
      />
    </ScrollView>
  );
}
