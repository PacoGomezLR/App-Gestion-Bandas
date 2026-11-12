import { useIsFocused } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

import { AvisoNoDisponibles } from "../components/AvisoNoDisponibles";
import { BotonCerrarSesion } from "../components/BotonCerrarSesion";
import { CalendarioEventos } from "../components/CalendarioEventos";
import { DestinoDesplazamiento } from "../components/DestinoDesplazamiento";
import { FormularioEvento } from "../components/FormularioEvento";
import { CabeceraConLogo } from "../components/LogoBanda";
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
import { useLogoBandaContext } from "../context/LogoBandaContext";
import { useTecnicosContext } from "../context/TecnicosContext";
import { useAtrasAndroid } from "../hooks/useAtrasAndroid";
import { useDesplazamiento } from "../hooks/useDesplazamiento";
import type { Evento } from "../types/evento";
import { eventosPasados, eventosProximos, LIMITE_PROXIMAS_FECHAS } from "../utils/agenda";
import { avisarCambiosSinGuardar } from "../utils/confirmaciones";
import {
  contarNoDisponiblesPorFecha,
  indisponibilidadPropia,
  lineasNoDisponibles,
  requiereAvisoConfirmacion,
  resumirNoDisponibles,
} from "../utils/disponibilidad";
import { fechaDeHoy } from "../utils/fechas";

// Inicio (calendario + próximas 5), todas las fechas futuras o el historial.
// Son vistas de la misma pantalla, no pestañas ni rutas: el botón Atrás de
// Android las recorre con useAtrasAndroid.
type Vista = "inicio" | "todas" | "historial";

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
    googleMapsUrl,
    notas,
    tecnicoIds,
    cache,
    error,
    eventoEditandoId,
    campoConError,
    hayCambios,
    setTipo,
    setEstado,
    setFecha,
    setHora,
    setLugar,
    setGoogleMapsUrl,
    setNotas,
    setCache,
    alternarTecnico,
    guardarEvento,
    eliminarEvento,
    prepararEdicion,
    cancelarEdicion,
    procesando,
    cargando: cargandoEventos,
    errorPersistencia: errorPersistenciaEventos,
    errorEliminacion,
    cachesEvento,
    cargandoCaches,
    errorCaches,
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
    nombresPorUsuario,
    cargando: cargandoIntegrantes,
    errorPersistencia: errorPersistenciaIntegrantes,
  } = useIntegrantesContext();

  const { url: logoUrl, escala: escalaLogo } = useLogoBandaContext();

  // Lleva al usuario al siguiente paso (Crear evento, el primer campo, un error)
  const desplazamiento = useDesplazamiento();
  // Cada Guardar que no se ha podido completar: lleva al campo con el error
  const [guardadosFallidos, setGuardadosFallidos] = useState(0);
  const guardadosFallidosAtendidos = useRef(0);

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

      // El siguiente paso del admin: crear un evento ese día
      if (esAdmin) {
        desplazamiento.llevarA("crear-evento");
      }
    }
  }

  // Al abrir el formulario, al primer dato que hay que rellenar
  function abrirFormulario() {
    setFormularioAbierto(true);
    desplazamiento.llevarA("evento.tipo");
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
    desplazamiento.llevarA("evento.tipo");
  }

  // Toda salida del formulario pasa por aquí. Sin cambios reales sale sin
  // preguntar; con cambios: Guardar (y, si se guarda, trasGuardar), Descartar
  // (sale sin guardar) o Cancelar (se queda en el formulario)
  function confirmarSalida(salir: () => void, trasGuardar?: () => void) {
    if (!formularioAbierto || !hayCambios) {
      salir();
      return;
    }

    avisarCambiosSinGuardar({
      onGuardar: () => guardarConAviso(trasGuardar),
      onDescartar: salir,
    });
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

    if (vista === "todas") {
      return () => setVista("inicio");
    }

    if (!panelAbierto) {
      return null;
    }

    if (procesando || procesandoDisponibilidad) {
      return () => {};
    }

    return formularioAbierto ? () => confirmarSalida(cancelarFormulario) : cerrarPanel;
  }

  // Las pestañas siguen montadas: Atrás solo se intercepta en la que se ve
  const enFoco = useIsFocused();
  useAtrasAndroid(enFoco ? accionAtras() : null);

  // trasGuardar: lo que el usuario quería hacer al salir (por ejemplo, editar otro evento)
  async function guardarYCerrar(trasGuardar?: () => void) {
    if (await guardarEvento()) {
      cerrarPanel();
      trasGuardar?.();
    } else {
      setGuardadosFallidos((total) => total + 1);
    }
  }

  // Tras un Guardar fallido (y solo entonces: nunca mientras se escribe), al
  // campo con el error; si es un campo de texto, con el foco. Si el error no es
  // de un campo (por ejemplo, al guardar en la base), al mensaje
  useEffect(() => {
    if (guardadosFallidos === guardadosFallidosAtendidos.current) {
      return;
    }

    guardadosFallidosAtendidos.current = guardadosFallidos;

    if (campoConError !== null) {
      desplazamiento.llevarA(`evento.${campoConError}`, { enfocar: true });
    } else if (error !== "" || errorPersistenciaEventos !== "") {
      desplazamiento.llevarA("evento.error");
    }
  }, [guardadosFallidos, campoConError, error, errorPersistenciaEventos, desplazamiento]);

  // La disponibilidad solo advierte: el admin puede confirmar igualmente
  function guardarConAviso(trasGuardar?: () => void) {
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
      void guardarYCerrar(trasGuardar);
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
        { text: "Confirmar igualmente", onPress: () => void guardarYCerrar(trasGuardar) },
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
        errorEliminacion={errorEliminacion}
        datosEconomicos={
          esAdmin ? { caches: cachesEvento, cargando: cargandoCaches, error: errorCaches } : null
        }
        onEliminar={eliminarEvento}
        // Con otro evento a medio escribir, antes se pregunta qué hacer con él
        onEditar={(evento) => confirmarSalida(() => editar(evento), () => editar(evento))}
      />
    );
  }

  const errores = [
    errorPersistenciaEventos,
    errorPersistenciaTecnicos,
    errorPersistenciaDisponibilidad,
    errorPersistenciaIntegrantes,
  ].filter((mensaje) => mensaje !== "");

  if (vista === "todas" || vista === "historial") {
    const esHistorial = vista === "historial";
    const eventosVista = esHistorial ? pasados : proximos;
    const volverAlCalendario = !esHistorial || origenHistorial === "inicio";

    return (
      <PantallaInterior desplazamiento={desplazamiento}>
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
    <PantallaInterior keyboardShouldPersistTaps="handled" desplazamiento={desplazamiento}>
      {/* Respeta la barra de estado (SafeAreaView propio) y queda arriba a la derecha */}
      <BotonCerrarSesion />

      {/* La portada: con logo, a la izquierda del título */}
      <CabeceraConLogo
        titulo="Calendario"
        nombreBanda={bandaActual?.nombre}
        logoUrl={logoUrl}
        escala={escalaLogo}
      />

      {errores.map((mensaje) => (
        <Mensaje key={mensaje} tipo="error" texto={mensaje} />
      ))}

      <CalendarioEventos
        fecha={fecha}
        fechasConEventos={eventos.map((evento) => evento.fecha)}
        noDisponiblesPorFecha={noDisponiblesPorFecha}
        // Solo un admin crea eventos: al resto no se le explica una acción que no tiene
        ayuda={esAdmin ? "Para crear un evento, pulsa un día del calendario." : undefined}
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
                googleMapsUrl={googleMapsUrl}
                notas={notas}
                tecnicos={tecnicos}
                tecnicoIds={tecnicoIds}
                datosEconomicos={{
                  cache,
                  errorCarga: errorCaches,
                  cargando: cargandoCaches,
                  onCambiarCache: setCache,
                }}
                // Junto a Guardar: si la base lo rechaza, arriba podría no verse
                error={error !== "" ? error : errorPersistenciaEventos}
                editando={eventoEditandoId !== null}
                procesando={procesando}
                onCambiarTipo={setTipo}
                onCambiarEstado={setEstado}
                onCambiarHora={setHora}
                onCambiarLugar={setLugar}
                onCambiarGoogleMapsUrl={setGoogleMapsUrl}
                onCambiarNotas={setNotas}
                onAlternarTecnico={alternarTecnico}
                onGuardar={() => guardarConAviso()}
                onCancelar={() => confirmarSalida(cancelarFormulario)}
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
              // Guardar la disponibilidad o cerrar cierra también el panel: si hay un
              // evento a medio escribir, antes se pregunta qué hacer con él
              onGuardar={(noDisponible) =>
                confirmarSalida(
                  () => void guardarDisponibilidad(noDisponible),
                  () => void guardarDisponibilidad(noDisponible)
                )
              }
              onCancelar={() => confirmarSalida(cerrarPanel)}
            />
          }
          crearEvento={
            esAdmin ? (
              // Con el formulario ya desplegado debajo, el botón queda inactivo
              <DestinoDesplazamiento clave="crear-evento">
                <BotonPrincipal
                  titulo="+ Crear evento"
                  onPress={abrirFormulario}
                  disabled={procesando || formularioAbierto}
                />
              </DestinoDesplazamiento>
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
