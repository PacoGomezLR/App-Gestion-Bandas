import { useMemo, useState } from "react";
import { Text } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { useBandaContext } from "../context/BandaContext";
import { useEventosContext } from "../context/EventosContext";
import { useFinanzasContext } from "../context/FinanzasContext";
import { useAtrasAndroid } from "../hooks/useAtrasAndroid";
import type { DatosMovimiento, MovimientoFinanciero } from "../types/finanzas";
import { formatearCentimos } from "../utils/dinero";
import { confirmar } from "../utils/dialogo";
import { etiquetaEvento } from "../utils/finanzas";
import { BotonCerrarSesion } from "./BotonCerrarSesion";
import { DetalleMovimiento } from "./DetalleMovimiento";
import { FilaDato } from "./FilaDato";
import { crearEstilosFinanzas } from "./Finanzas.styles";
import { FormularioMovimiento } from "./FormularioMovimiento";
import { InformesFinanzas } from "./InformesFinanzas";
import { HistorialMovimientos, ListaMovimientos } from "./ListaMovimientos";
import { BotonPrincipal, Mensaje } from "./PantallaBase";
import {
  BotonDestructivo,
  BotonSecundario,
  CabeceraPantalla,
  CargandoInterior,
  EstadoVacio,
  FilaNavegable,
  GrupoFilas,
  PantallaInterior,
  Seccion,
  Tarjeta,
} from "./PantallaInterior";

const ULTIMOS_MOVIMIENTOS = 5;

interface PantallaFinanzasProps {
  // Las pestañas siguen montadas: Atrás solo se intercepta en la que se ve
  enFoco: boolean;
  onVolver: () => void;
}

// Son vistas de la misma pantalla, como en Técnicos y en el Calendario:
// resumen → movimientos → detalle → edición, resumen → alta, resumen → informes
type Modo = "resumen" | "movimientos" | "informes" | "detalle" | "nuevo" | "editar";

// Desde dónde se abrió el detalle: a ese sitio se vuelve
type OrigenDetalle = "resumen" | "movimientos";

export function PantallaFinanzas({ enFoco, onVolver }: PantallaFinanzasProps) {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosFinanzas(tema), [tema]);
  const { bandaActual } = useBandaContext();
  const { eventos, errorPersistencia: errorEventos } = useEventosContext();
  const {
    movimientos,
    cargando,
    error,
    errorOperacion,
    procesando,
    crearMovimiento,
    editarMovimiento,
    eliminarMovimiento,
    recargar,
    limpiarErrorOperacion,
    boteActualCentimos,
    ingresosTotalesCentimos,
    gastosTotalesCentimos,
  } = useFinanzasContext();

  const [modo, setModo] = useState<Modo>("resumen");
  const [movimientoId, setMovimientoId] = useState<string | null>(null);
  const [origen, setOrigen] = useState<OrigenDetalle>("resumen");

  const etiquetasEventos = useMemo(
    () =>
      eventos.reduce<Record<string, string>>((etiquetas, evento) => {
        etiquetas[evento.id] = etiquetaEvento(evento);
        return etiquetas;
      }, {}),
    [eventos]
  );

  const movimiento = movimientos.find(({ id }) => id === movimientoId) ?? null;
  const necesitaMovimiento = modo === "detalle" || modo === "editar";
  // Si el movimiento ya no existe se vuelve al sitio del que se vino
  const modoVisible: Modo = necesitaMovimiento && movimiento === null ? origen : modo;

  function irA(destino: Modo) {
    limpiarErrorOperacion();
    setModo(destino);
  }

  function abrirDetalle(elegido: MovimientoFinanciero, desde: OrigenDetalle) {
    setMovimientoId(elegido.id);
    setOrigen(desde);
    irA("detalle");
  }

  async function guardarNuevo(datos: DatosMovimiento) {
    if (await crearMovimiento(datos)) {
      setModo("resumen");
    }
  }

  async function guardarEdicion(id: string, datos: DatosMovimiento) {
    if (await editarMovimiento(id, datos)) {
      setModo("detalle");
    }
  }

  async function eliminar(id: string) {
    if (await eliminarMovimiento(id)) {
      setModo(origen);
    }
  }

  function confirmarEliminacion(id: string) {
    confirmar({
      titulo: "¿Eliminar movimiento?",
      mensaje: "Esta acción modificará el bote y los informes.",
      textoCancelar: "Cancelar",
      textoConfirmar: "Eliminar",
      destructivo: true,
      onConfirmar: () => void eliminar(id),
    });
  }

  // Atrás de Android, del nivel más interno al más externo. Mientras se guarda, no hace nada
  function accionAtras(): () => void {
    if (procesando) {
      return () => {};
    }

    switch (modoVisible) {
      case "editar":
        return () => irA("detalle");
      case "detalle":
        return () => irA(origen);
      case "nuevo":
      case "movimientos":
      case "informes":
        return () => irA("resumen");
      case "resumen":
        return onVolver;
    }
  }

  useAtrasAndroid(enFoco ? accionAtras() : null);

  if (cargando) {
    return <CargandoInterior texto="Cargando movimientos..." />;
  }

  const volverAFinanzas = (
    <BotonSecundario titulo="Volver a Finanzas" onPress={() => irA("resumen")} />
  );

  if (modoVisible === "nuevo") {
    return (
      <PantallaInterior keyboardShouldPersistTaps="handled">
        <BotonCerrarSesion />
        <CabeceraPantalla titulo="Finanzas" />
        <FormularioMovimiento
          eventos={eventos}
          errorEventos={errorEventos}
          errorGuardado={errorOperacion}
          procesando={procesando}
          onGuardar={(datos) => void guardarNuevo(datos)}
          onCancelar={() => irA("resumen")}
        />
      </PantallaInterior>
    );
  }

  if (modoVisible === "editar" && movimiento !== null) {
    return (
      <PantallaInterior keyboardShouldPersistTaps="handled">
        <BotonCerrarSesion />
        <CabeceraPantalla titulo="Finanzas" />
        <FormularioMovimiento
          movimiento={movimiento}
          eventos={eventos}
          errorEventos={errorEventos}
          errorGuardado={errorOperacion}
          procesando={procesando}
          onGuardar={(datos) => void guardarEdicion(movimiento.id, datos)}
          onCancelar={() => irA("detalle")}
        />
      </PantallaInterior>
    );
  }

  if (modoVisible === "detalle" && movimiento !== null) {
    return (
      <PantallaInterior>
        <BotonCerrarSesion />
        <CabeceraPantalla titulo={movimiento.concepto} />
        <BotonSecundario
          titulo={origen === "movimientos" ? "Volver a movimientos" : "Volver a Finanzas"}
          onPress={() => irA(origen)}
          disabled={procesando}
        />
        {errorOperacion !== "" && <Mensaje tipo="error" texto={errorOperacion} />}
        <DetalleMovimiento
          movimiento={movimiento}
          evento={
            movimiento.eventoId === null ? null : (etiquetasEventos[movimiento.eventoId] ?? null)
          }
        />
        <BotonPrincipal
          titulo="Editar movimiento"
          onPress={() => irA("editar")}
          disabled={procesando}
        />
        <BotonDestructivo
          titulo="Eliminar movimiento"
          onPress={() => confirmarEliminacion(movimiento.id)}
          disabled={procesando}
        />
      </PantallaInterior>
    );
  }

  if (modoVisible === "movimientos") {
    return (
      <PantallaInterior>
        <BotonCerrarSesion />
        <CabeceraPantalla titulo="Movimientos" subtitulo={bandaActual?.nombre} />
        {volverAFinanzas}
        {movimientos.length === 0 ? (
          <EstadoVacio titulo="Todavía no hay movimientos" />
        ) : (
          <HistorialMovimientos
            movimientos={movimientos}
            onElegir={(elegido) => abrirDetalle(elegido, "movimientos")}
          />
        )}
      </PantallaInterior>
    );
  }

  if (modoVisible === "informes") {
    return (
      <PantallaInterior>
        <BotonCerrarSesion />
        <CabeceraPantalla titulo="Informes" subtitulo={bandaActual?.nombre} />
        {volverAFinanzas}
        <InformesFinanzas
          movimientos={movimientos}
          etiquetasEventos={etiquetasEventos}
          errorEventos={errorEventos}
        />
      </PantallaInterior>
    );
  }

  // Sin datos reales no se enseña ningún importe: 0,00 € parecería el saldo de verdad
  if (error !== "") {
    return (
      <PantallaInterior>
        <BotonCerrarSesion />
        <CabeceraPantalla titulo="Finanzas" subtitulo={bandaActual?.nombre} />
        <BotonSecundario titulo="Volver a Banda" onPress={onVolver} />
        <Mensaje tipo="error" texto={error} />
        <BotonPrincipal titulo="Reintentar" onPress={() => void recargar()} />
      </PantallaInterior>
    );
  }

  return (
    <PantallaInterior>
      <BotonCerrarSesion />
      <CabeceraPantalla titulo="Finanzas" subtitulo={bandaActual?.nombre} />
      <BotonSecundario titulo="Volver a Banda" onPress={onVolver} />

      <Tarjeta titulo="Bote actual">
        <Text
          adjustsFontSizeToFit
          numberOfLines={1}
          style={[estilos.importeBote, boteActualCentimos < 0 && estilos.negativo]}
        >
          {formatearCentimos(boteActualCentimos)}
        </Text>
        <FilaDato etiqueta="Ingresos totales" valor={formatearCentimos(ingresosTotalesCentimos)} />
        <FilaDato etiqueta="Gastos totales" valor={formatearCentimos(gastosTotalesCentimos)} />
      </Tarjeta>

      <BotonPrincipal titulo="+ Añadir movimiento" onPress={() => irA("nuevo")} />

      <GrupoFilas>
        <FilaNavegable titulo="Movimientos" onPress={() => irA("movimientos")} />
        <FilaNavegable titulo="Informes" onPress={() => irA("informes")} />
      </GrupoFilas>

      {movimientos.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no hay movimientos"
          detalle="Añade el primer ingreso o gasto para empezar a llevar las cuentas de la banda."
        />
      ) : (
        <Seccion titulo="Últimos movimientos">
          <ListaMovimientos
            movimientos={movimientos.slice(0, ULTIMOS_MOVIMIENTOS)}
            onElegir={(elegido) => abrirDetalle(elegido, "resumen")}
          />
        </Seccion>
      )}
    </PantallaInterior>
  );
}
