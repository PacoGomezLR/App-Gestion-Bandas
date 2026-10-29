import {
  Button,
  ScrollView,
  Text,
} from "react-native";
import { BotonCerrarSesion } from "../components/BotonCerrarSesion";
import { CalendarioEventos } from "../components/CalendarioEventos";
import { FormularioEvento } from "../components/FormularioEvento";
import { ListaEventos } from "../components/ListaEventos";
import { useBandaContext } from "../context/BandaContext";
import { useEventosContext } from "../context/EventosContext";
import { useMiembrosContext } from "../context/MiembrosContext";
import { useTecnicosContext } from "../context/TecnicosContext";

export default function Index() {
  // Sin rol visible: a quien no es admin simplemente no se le ofrecen las acciones
  const { esAdmin } = useBandaContext();

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

      {/* Quien no es admin ve el mismo calendario para filtrar, sin el formulario */}
      {esAdmin ? (
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
      ) : (
        <CalendarioEventos
          fecha={fecha}
          fechasConEventos={eventos.map((evento) => evento.fecha)}
          onSeleccionarFecha={setFecha}
        />
      )}

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
        puedeEditar={esAdmin}
        onEliminar={eliminarEvento}
        onEditar={prepararEdicion}
      />
    </ScrollView>
  );
}
