import { useIsFocused } from "expo-router";
import { useState } from "react";

import { BotonCerrarSesion } from "../components/BotonCerrarSesion";
import { InvitarUsuario } from "../components/InvitarUsuario";
import { ListaIntegrantes } from "../components/ListaIntegrantes";
import { Mensaje } from "../components/PantallaBase";
import { PantallaFinanzas } from "../components/PantallaFinanzas";
import {
  BotonSecundario,
  CabeceraPantalla,
  CargandoInterior,
  FilaNavegable,
  GrupoFilas,
  PantallaInterior,
  Seccion,
} from "../components/PantallaInterior";
import { PantallaTecnicos } from "../components/PantallaTecnicos";
import { useBandaContext } from "../context/BandaContext";
import { useEventosContext } from "../context/EventosContext";
import { FinanzasProvider } from "../context/FinanzasContext";
import { useIntegrantesContext } from "../context/IntegrantesContext";
import { useTecnicosContext } from "../context/TecnicosContext";
import { useAtrasAndroid } from "../hooks/useAtrasAndroid";

// Índice de la banda y sus apartados. Son vistas de la misma pantalla, no rutas
// (igual que Todas las fechas o Historial en el Calendario): el botón Atrás de
// Android las recorre con useAtrasAndroid.
type Vista = "principal" | "integrantes" | "tecnicos" | "invitar" | "finanzas";

export default function BandaScreen() {
  // Sin rol visible: a quien no es admin simplemente no se le ofrecen las acciones
  const { esAdmin, bandaActual } = useBandaContext();
  const {
    integrantes,
    cargando: cargandoIntegrantes,
    errorPersistencia: errorIntegrantes,
  } = useIntegrantesContext();
  const {
    tecnicos,
    cargando: cargandoTecnicos,
    errorPersistencia: errorTecnicos,
  } = useTecnicosContext();
  // Sin los eventos no se sabe si un técnico está asignado y no se puede eliminar
  const { cargando: cargandoEventos } = useEventosContext();

  const enFoco = useIsFocused();
  const [vista, setVista] = useState<Vista>("principal");
  const soloAdmin = vista === "invitar" || vista === "finanzas";
  const vistaVisible: Vista = soloAdmin && !esAdmin ? "principal" : vista;

  function volver() {
    setVista("principal");
  }

  // Técnicos y Finanzas gestionan su propio Atrás. En el índice no se intercepta
  const interceptarAtras =
    enFoco && (vistaVisible === "integrantes" || vistaVisible === "invitar");
  useAtrasAndroid(interceptarAtras ? volver : null);

  if (cargandoIntegrantes || cargandoTecnicos || cargandoEventos) {
    return <CargandoInterior texto="Cargando datos..." />;
  }

  if (vistaVisible === "tecnicos") {
    return <PantallaTecnicos enFoco={enFoco} puedeGestionar={esAdmin} onVolver={volver} />;
  }

  // Solo un admin entra, y la base vuelve a comprobarlo en cada consulta
  if (vistaVisible === "finanzas" && bandaActual !== null) {
    return (
      // Otra banda, otras cuentas: nada de la anterior se queda a medias
      <FinanzasProvider key={bandaActual.id}>
        <PantallaFinanzas enFoco={enFoco} onVolver={volver} />
      </FinanzasProvider>
    );
  }

  if (vistaVisible === "integrantes") {
    return (
      <PantallaInterior>
        <BotonCerrarSesion />
        <CabeceraPantalla titulo="Integrantes" subtitulo={bandaActual?.nombre} />
        <BotonSecundario titulo="Volver a Banda" onPress={volver} />
        {errorIntegrantes !== "" && <Mensaje tipo="error" texto={errorIntegrantes} />}
        <ListaIntegrantes integrantes={integrantes} />
      </PantallaInterior>
    );
  }

  // Solo un admin invita (la base vuelve a comprobarlo al crear la invitación)
  if (vistaVisible === "invitar" && bandaActual !== null) {
    return (
      <PantallaInterior>
        <BotonCerrarSesion />
        <CabeceraPantalla titulo="Invitar usuario" subtitulo={bandaActual.nombre} />
        <BotonSecundario titulo="Volver a Banda" onPress={volver} />
        <InvitarUsuario
          // Otra banda, otra invitación: nada de la anterior se queda a medias
          key={bandaActual.id}
          bandaId={bandaActual.id}
          bandaNombre={bandaActual.nombre}
          onCerrar={volver}
        />
      </PantallaInterior>
    );
  }

  return (
    <PantallaInterior>
      <BotonCerrarSesion />
      <CabeceraPantalla titulo="Banda" subtitulo={bandaActual?.nombre} />

      {[errorIntegrantes, errorTecnicos]
        .filter((mensaje) => mensaje !== "")
        .map((mensaje) => (
          <Mensaje key={mensaje} tipo="error" texto={mensaje} />
        ))}

      <Seccion titulo="Equipo">
        <GrupoFilas>
          {/* Sin carga correcta no se enseña un 0 que parecería real */}
          <FilaNavegable
            titulo="Integrantes"
            valor={errorIntegrantes === "" ? integrantes.length : undefined}
            onPress={() => setVista("integrantes")}
          />
          <FilaNavegable
            titulo="Técnicos"
            valor={errorTecnicos === "" ? tecnicos.length : undefined}
            onPress={() => setVista("tecnicos")}
          />
        </GrupoFilas>
      </Seccion>

      {esAdmin && (
        <Seccion titulo="Administración">
          <GrupoFilas>
            <FilaNavegable titulo="Invitar usuario" onPress={() => setVista("invitar")} />
            <FilaNavegable titulo="Finanzas" onPress={() => setVista("finanzas")} />
          </GrupoFilas>
        </Seccion>
      )}
    </PantallaInterior>
  );
}
