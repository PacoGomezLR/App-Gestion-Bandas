import { useState } from "react";
import { Alert } from "react-native";

import { AvisoNoDisponibles } from "../components/AvisoNoDisponibles";
import { BotonCerrarSesion } from "../components/BotonCerrarSesion";
import { CalendarioEventos } from "../components/CalendarioEventos";
import { FormularioEvento } from "../components/FormularioEvento";
import { GestionarBanda } from "../components/GestionarBanda";
import { ListaEventos } from "../components/ListaEventos";
import { PanelDia } from "../components/PanelDia";
import { BotonPrincipal, Mensaje } from "../components/PantallaBase";
import { TuDisponibilidad } from "../components/TuDisponibilidad";
import {
  BotonSecundario,
  CabeceraPantalla,
  CargandoInterior,
  EstadoVacio,
  PantallaInterior,
  Seccion,
} from "../components/PantallaInterior";
import { useBandaContext } from "../context/BandaContext";
import { useDisponibilidadContext } from "../context/DisponibilidadContext";
import { useEventosContext } from "../context/EventosContext";
import { useIntegrantesContext } from "../context/IntegrantesContext";
import { useTecnicosContext } from "../context/TecnicosContext";
import { useAtrasAndroid } from "../hooks/useAtrasAndroid";
import type { Evento } from "../types/evento";
import { eventosPasados, eventosProximos, LIMITE_PROXIMAS_FECHAS } from "../utils/agenda";
import {
  contarNoDisponiblesPorFecha,
  indisponibilidadPropia,
  lineasNoDisponibles,
  requiereAvisoConfirmacion,
  resumirNoDisponibles,
} from "../utils/disponibilidad";
import { fechaDeHoy } from "../utils/fechas";

// Inicio (calendario + próximas 5), todas las fechas futuras, el historial o
// Gestionar banda (solo admin). Son vistas de la misma pantalla, no pestañas
// ni rutas: el botón Atrás de Android las recorre con useAtrasAndroid.
type Vista = "inicio" | "todas" | "historial" | "gestionar";

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
    indisponibilidades,
    usuarioActualId,
    cargando: cargandoDisponibilidad,
    procesando: procesandoDisponibilidad,
    errorPersistencia: errorPersistenciaDisponibilidad,
    marcarNoDisponible,
    marcarDisponible,
  } = useDisponibilidadContext();

  const {
    integrantes,
    nombresPorUsuario,
    cargando: cargandoIntegrantes,
    errorPersistencia: errorPersistenciaIntegrantes,
  } = useIntegrantesContext();

  const [vista, setVista] = useState<Vista>("inicio");
  // Desde dónde se abrió el historial: Volver (y Atrás) regresa allí
  const [origenHistorial, setOrigenHistorial] = useState<"inicio" | "todas">("todas");
  // La fecha elegida (fecha) también es la del formulario; el panel solo se
  // abre al tocar un día, así que al entrar la vista está limpia
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [formularioAbierto, setFormularioAbierto] = useState(false);

  const hoy = fechaDeHoy();
  const proximos = eventosProximos(eventos, hoy);
  const pasados = eventosPasados(eventos, hoy);
  const noDisponiblesPorFecha = contarNoDisponiblesPorFecha(indisponibilidades);
  const diaElegido = panelAbierto && fecha !== "" ? fecha : "";

  function cerrarPanel() {
    setPanelAbierto(false);
    setFormularioAbierto(false);
    setFecha("");
  }

  function seleccionarDia(dia: string) {
    // El calendario no tiene modo deshabilitado: se ignora mientras se guarda
    if (procesando || procesandoDisponibilidad) {
      return;
    }

    setFecha(dia);

    // Con el formulario abierto, tocar otro día solo cambia la fecha del evento
    if (!formularioAbierto) {
      setPanelAbierto(true);
    }
  }

  async function guardarDisponibilidad(noDisponible: boolean) {
    const guardado = noDisponible
      ? await marcarNoDisponible(fecha)
      : await marcarDisponible(fecha);

    // Si falla, el panel sigue abierto y el error se ve arriba
    if (guardado) {
      cerrarPanel();
    }
  }

  // Cancelar el formulario descarta lo escrito y vuelve al panel del mismo día
  function cancelarFormulario() {
    const dia = fecha;

    cancelarEdicion();
    setFecha(dia);
    setFormularioAbierto(false);
  }

  // Editar desde cualquier lista: el formulario se abre en el panel de su día
  function editar(evento: Evento) {
    prepararEdicion(evento);
    setVista("inicio");
    setPanelAbierto(true);
    setFormularioAbierto(true);
  }

  function abrirHistorial(origen: "inicio" | "todas") {
    setOrigenHistorial(origen);
    setVista("historial");
  }

  // Atrás de Android, del nivel más interno al más externo:
  // historial → todas (o inicio) → inicio; formulario → panel → inicio limpio.
  // En el inicio limpio no se intercepta. Mientras se guarda, Atrás no hace nada.
  function accionAtras(): (() => void) | null {
    if (vista === "historial") {
      return () => setVista(origenHistorial);
    }

    if (vista === "todas" || vista === "gestionar") {
      return () => setVista("inicio");
    }

    if (!panelAbierto) {
      return null;
    }

    if (procesando || procesandoDisponibilidad) {
      return () => {};
    }

    return formularioAbierto ? cancelarFormulario : cerrarPanel;
  }

  useAtrasAndroid(accionAtras());

  async function guardarYCerrar() {
    if (await guardarEvento()) {
      cerrarPanel();
    }
  }

  // La disponibilidad solo advierte: el admin puede confirmar igualmente
  function guardarConAviso() {
    const resumen = resumirNoDisponibles(
      indisponibilidades,
      fecha,
      usuarioActualId,
      nombresPorUsuario
    );
    const eventoOriginal =
      eventos.find((evento) => evento.id === eventoEditandoId) ?? null;

    if (
      !requiereAvisoConfirmacion({
        estado,
        fecha,
        eventoOriginal,
        noDisponibles: resumen.total,
      })
    ) {
      void guardarYCerrar();
      return;
    }

    const integrantes =
      resumen.total === 1
        ? "Hay 1 integrante que ha marcado esta fecha como no disponible"
        : `Hay ${resumen.total} integrantes que han marcado esta fecha como no disponible`;

    // Cancelar no guarda nada y deja el formulario tal como estaba
    Alert.alert(
      "Integrantes no disponibles",
      [
        `${integrantes}:`,
        lineasNoDisponibles(resumen).join("\n"),
        "¿Quieres confirmar la fecha igualmente?",
      ].join("\n\n"),
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Confirmar igualmente", onPress: () => void guardarYCerrar() },
      ]
    );
  }

  if (cargandoEventos || cargandoTecnicos || cargandoDisponibilidad || cargandoIntegrantes) {
    return <CargandoInterior texto="Cargando datos..." />;
  }

  // Las mismas tarjetas (con su detalle y permisos) en todas las listas
  function lista(eventosLista: Evento[]) {
    return (
      <ListaEventos
        eventos={eventosLista}
        tecnicos={tecnicos}
        procesando={procesando}
        puedeEditar={esAdmin}
        onEliminar={eliminarEvento}
        onEditar={editar}
      />
    );
  }

  const errores = [
    errorPersistenciaEventos,
    errorPersistenciaTecnicos,
    errorPersistenciaDisponibilidad,
    errorPersistenciaIntegrantes,
  ].filter((mensaje) => mensaje !== "");

  // Solo un admin gestiona la banda (la base vuelve a comprobarlo al invitar)
  if (vista === "gestionar" && esAdmin && bandaActual !== null) {
    return (
      <PantallaInterior>
        <BotonCerrarSesion />

        <CabeceraPantalla titulo="Gestionar banda" subtitulo={bandaActual.nombre} />

        <BotonSecundario titulo="Volver al calendario" onPress={() => setVista("inicio")} />

        {errores.map((mensaje) => (
          <Mensaje key={mensaje} tipo="error" texto={mensaje} />
        ))}

        <GestionarBanda
          // Otra banda, otra pantalla: nada de la anterior se queda a medias
          key={bandaActual.id}
          bandaId={bandaActual.id}
          bandaNombre={bandaActual.nombre}
          integrantes={integrantes}
        />
      </PantallaInterior>
    );
  }

  if (vista === "todas" || vista === "historial") {
    const esHistorial = vista === "historial";
    const eventosVista = esHistorial ? pasados : proximos;
    const volverAlCalendario = !esHistorial || origenHistorial === "inicio";

    return (
      <PantallaInterior>
        <BotonCerrarSesion />

        <CabeceraPantalla
          titulo={esHistorial ? "Historial" : "Todas las fechas"}
          subtitulo={bandaActual?.nombre}
        />

        <BotonSecundario
          titulo={volverAlCalendario ? "Volver al calendario" : "Volver a todas las fechas"}
          onPress={() => setVista(volverAlCalendario ? "inicio" : "todas")}
        />

        {errores.map((mensaje) => (
          <Mensaje key={mensaje} tipo="error" texto={mensaje} />
        ))}

        {eventosVista.length === 0 ? (
          <EstadoVacio
            titulo={esHistorial ? "Sin fechas pasadas" : "No hay próximas fechas"}
            detalle={
              esHistorial
                ? "Aquí aparecerán las fechas que ya han pasado."
                : "Los conciertos, ensayos y bodas de la banda aparecerán aquí."
            }
          />
        ) : (
          lista(eventosVista)
        )}

        {!esHistorial && pasados.length > 0 && (
          <BotonSecundario titulo="Consultar historial" onPress={() => abrirHistorial("todas")} />
        )}
      </PantallaInterior>
    );
  }

  const eventosDelDia =
    diaElegido === "" ? [] : eventos.filter((evento) => evento.fecha === diaElegido);
  const resumenDia =
    diaElegido === ""
      ? null
      : resumirNoDisponibles(indisponibilidades, diaElegido, usuarioActualId, nombresPorUsuario);

  return (
    <PantallaInterior>
      {/* Respeta la barra de estado (SafeAreaView propio) y queda arriba a la derecha */}
      <BotonCerrarSesion />

      <CabeceraPantalla titulo="Calendario" subtitulo={bandaActual?.nombre} />

      {/* Acceso discreto: no compite con el calendario ni con Crear evento */}
      {esAdmin && (
        <BotonSecundario titulo="Gestionar banda" onPress={() => setVista("gestionar")} />
      )}

      {errores.map((mensaje) => (
        <Mensaje key={mensaje} tipo="error" texto={mensaje} />
      ))}

      <CalendarioEventos
        fecha={fecha}
        fechasConEventos={eventos.map((evento) => evento.fecha)}
        noDisponiblesPorFecha={noDisponiblesPorFecha}
        onSeleccionarFecha={seleccionarDia}
      />

      {diaElegido !== "" && (
        <PanelDia
          fecha={diaElegido}
          formulario={
            esAdmin && formularioAbierto ? (
              <FormularioEvento
                tipo={tipo}
                estado={estado}
                fecha={fecha}
                hora={hora}
                lugar={lugar}
                notas={notas}
                tecnicos={tecnicos}
                tecnicoIds={tecnicoIds}
                error={error}
                editando={eventoEditandoId !== null}
                procesando={procesando}
                onCambiarTipo={setTipo}
                onCambiarEstado={setEstado}
                onCambiarHora={setHora}
                onCambiarLugar={setLugar}
                onCambiarNotas={setNotas}
                onAlternarTecnico={alternarTecnico}
                onGuardar={guardarConAviso}
                onCancelar={cancelarFormulario}
              />
            ) : null
          }
          eventos={eventosDelDia.length > 0 ? lista(eventosDelDia) : null}
          noDisponibles={
            resumenDia !== null && resumenDia.total > 0 ? (
              <AvisoNoDisponibles resumen={resumenDia} />
            ) : null
          }
          disponibilidad={
            <TuDisponibilidad
              // Nuevo borrador al cambiar de día
              key={diaElegido}
              noDisponibleGuardado={
                indisponibilidadPropia(indisponibilidades, usuarioActualId, diaElegido) !== null
              }
              procesando={procesandoDisponibilidad}
              onGuardar={(noDisponible) => void guardarDisponibilidad(noDisponible)}
              onCancelar={cerrarPanel}
            />
          }
          crearEvento={
            esAdmin ? (
              // Con el formulario ya desplegado debajo, el botón queda inactivo
              <BotonPrincipal
                titulo="+ Crear evento"
                onPress={() => setFormularioAbierto(true)}
                disabled={procesando || formularioAbierto}
              />
            ) : null
          }
        />
      )}

      <Seccion titulo="Próximas fechas">
        {proximos.length === 0 ? (
          <EstadoVacio
            titulo="No hay próximas fechas"
            detalle="Los conciertos, ensayos y bodas de la banda aparecerán aquí."
          />
        ) : (
          lista(proximos.slice(0, LIMITE_PROXIMAS_FECHAS))
        )}

        {/* Con fechas futuras: la agenda completa (desde ahí, el historial).
            Sin futuras pero con pasadas: directamente el historial, sin rodeos */}
        {proximos.length > 0 ? (
          <BotonSecundario titulo="Ver todas las fechas" onPress={() => setVista("todas")} />
        ) : (
          pasados.length > 0 && (
            <BotonSecundario titulo="Consultar historial" onPress={() => abrirHistorial("inicio")} />
          )
        )}
      </Seccion>
    </PantallaInterior>
  );
}
