import { BotonCerrarSesion } from "../components/BotonCerrarSesion";
import { CalendarioEventos } from "../components/CalendarioEventos";
import { FormularioEvento } from "../components/FormularioEvento";
import { ListaEventos } from "../components/ListaEventos";
import { Mensaje } from "../components/PantallaBase";
import {
  BotonSecundario,
  CabeceraPantalla,
  CargandoInterior,
  EstadoVacio,
  PantallaInterior,
  Seccion,
} from "../components/PantallaInterior";
import { useBandaContext } from "../context/BandaContext";
import { useEventosContext } from "../context/EventosContext";
import { useMiembrosContext } from "../context/MiembrosContext";
import { useTecnicosContext } from "../context/TecnicosContext";
import { formatearFecha } from "../utils/fechas";

export default function Index() {
  // Sin rol visible: a quien no es admin simplemente no se le ofrecen las acciones
  const { esAdmin, bandaActual } = useBandaContext();

  const {
    eventos,
    tipo,
    estado,
    fecha,
    hora,
    lugar,
    notas,
    tecnicoIds,
    error,
    eventoEditandoId,
    setTipo,
    setEstado,
    setFecha,
    setHora,
    setLugar,
    setNotas,
    alternarTecnico,
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
    return <CargandoInterior texto="Cargando datos..." />;
  }

  return (
    <PantallaInterior>
      {/* Respeta la barra de estado (SafeAreaView propio) y queda arriba a la derecha */}
      <BotonCerrarSesion />

      <CabeceraPantalla titulo="Calendario" subtitulo={bandaActual?.nombre} />

      {errorPersistenciaEventos !== "" && (
        <Mensaje tipo="error" texto={errorPersistenciaEventos} />
      )}

      {errorPersistenciaTecnicos !== "" && (
        <Mensaje tipo="error" texto={errorPersistenciaTecnicos} />
      )}

      {errorPersistenciaMiembros !== "" && (
        <Mensaje tipo="error" texto={errorPersistenciaMiembros} />
      )}

      {/* Quien no es admin ve el mismo calendario para filtrar, sin el formulario */}
      {esAdmin ? (
        <FormularioEvento
          tipo={tipo}
          estado={estado}
          fecha={fecha}
          hora={hora}
          lugar={lugar}
          notas={notas}
          fechasConEventos={eventos.map((evento) => evento.fecha)}
          tecnicos={tecnicos}
          tecnicoIds={tecnicoIds}
          error={error}
          editando={eventoEditandoId !== null}
          procesando={procesando}
          onCambiarTipo={setTipo}
          onCambiarEstado={setEstado}
          onSeleccionarFecha={setFecha}
          onCambiarHora={setHora}
          onCambiarLugar={setLugar}
          onCambiarNotas={setNotas}
          onAlternarTecnico={alternarTecnico}
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

      <Seccion
        titulo="Fechas"
        accion={
          fecha !== "" && (
            <BotonSecundario
              titulo="Ver todos"
              onPress={() => setFecha("")}
              disabled={procesando}
            />
          )
        }
      >
        {eventosVisibles.length === 0 ? (
          <EstadoVacio
            titulo={fecha !== "" ? "Sin eventos este día" : "Todavía no hay eventos"}
            detalle={
              fecha !== ""
                ? `No hay nada programado para el ${formatearFecha(fecha)}.`
                : "Los conciertos, ensayos y bodas de la banda aparecerán aquí."
            }
          />
        ) : (
          <ListaEventos
            eventos={eventosVisibles}
            tecnicos={tecnicos}
            miembros={miembros}
            procesando={procesando}
            puedeEditar={esAdmin}
            onEliminar={eliminarEvento}
            onEditar={prepararEdicion}
          />
        )}
      </Seccion>
    </PantallaInterior>
  );
}
