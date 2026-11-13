import { useState } from "react";

import { useTecnicosContext } from "../context/TecnicosContext";
import { useAtrasAndroid } from "../hooks/useAtrasAndroid";
import type { Tecnico } from "../types/tecnico";
import { confirmar } from "../utils/dialogo";
import { BotonCerrarSesion } from "./BotonCerrarSesion";
import { FormularioTecnico } from "./FormularioTecnico";
import { ListaTecnicos } from "./ListaTecnicos";
import { BotonPrincipal, Mensaje } from "./PantallaBase";
import {
  BotonDestructivo,
  BotonSecundario,
  CabeceraPantalla,
  EstadoVacio,
  PantallaInterior,
} from "./PantallaInterior";

interface PantallaTecnicosProps {
  // Las pestañas siguen montadas: Atrás solo se intercepta en la que se ve
  enFoco: boolean;
  puedeGestionar: boolean;
  onVolver: () => void;
}

// Lista → (admin) detalle → edición, o lista → (admin) alta. Son vistas de la
// misma pantalla, como en el Calendario. Ocultar acciones es solo presentación:
// TecnicosContext y la base vuelven a comprobar el permiso.
type Modo = "lista" | "nuevo" | "detalle" | "editar";

export function PantallaTecnicos({ enFoco, puedeGestionar, onVolver }: PantallaTecnicosProps) {
  const {
    tecnicos,
    nombre,
    error,
    procesando,
    setNombre,
    guardarTecnico,
    prepararEdicion,
    cancelarEdicion,
    eliminarTecnico,
    errorEliminacion,
    errorPersistencia,
  } = useTecnicosContext();

  const [modo, setModo] = useState<Modo>("lista");
  const [tecnicoId, setTecnicoId] = useState<string | null>(null);
  // errorEliminacion se queda en el contexto: aquí solo se ve tras el intento fallido
  const [eliminacionFallida, setEliminacionFallida] = useState(false);

  const tecnico = tecnicos.find(({ id }) => id === tecnicoId) ?? null;
  const necesitaTecnico = modo === "detalle" || modo === "editar";
  // Sin permiso, o si el técnico ya no existe, solo queda la lista
  const modoVisible: Modo = !puedeGestionar || (necesitaTecnico && tecnico === null) ? "lista" : modo;
  const modoAlCerrarFormulario: Modo = modoVisible === "editar" ? "detalle" : "lista";

  function abrirAlta() {
    cancelarEdicion();
    setModo("nuevo");
  }

  function abrirDetalle({ id }: Tecnico) {
    setTecnicoId(id);
    setEliminacionFallida(false);
    setModo("detalle");
  }

  function abrirEdicion(elegido: Tecnico) {
    prepararEdicion(elegido);
    setModo("editar");
  }

  function cerrarFormulario() {
    cancelarEdicion();
    setModo(modoAlCerrarFormulario);
  }

  async function guardar() {
    if (await guardarTecnico()) {
      setModo(modoAlCerrarFormulario);
    }
  }

  async function eliminar(id: string) {
    if (await eliminarTecnico(id)) {
      setModo("lista");
    } else {
      setEliminacionFallida(true);
    }
  }

  function confirmarEliminacion({ id, nombre: nombreTecnico }: Tecnico) {
    confirmar({
      titulo: "Eliminar técnico",
      mensaje: `¿Seguro que quieres eliminar a ${nombreTecnico}?`,
      textoCancelar: "Cancelar",
      textoConfirmar: "Eliminar",
      destructivo: true,
      onConfirmar: () => void eliminar(id),
    });
  }

  // Atrás de Android, del nivel más interno al más externo:
  // edición → detalle → lista → Banda; alta → lista. Mientras se guarda, no hace nada.
  function accionAtras(): () => void {
    if (procesando) {
      return () => {};
    }

    if (modoVisible === "nuevo" || modoVisible === "editar") {
      return cerrarFormulario;
    }

    return modoVisible === "detalle" ? () => setModo("lista") : onVolver;
  }

  useAtrasAndroid(enFoco ? accionAtras() : null);

  const errorGeneral = errorPersistencia !== "" && (
    <Mensaje tipo="error" texto={errorPersistencia} />
  );

  if (modoVisible === "nuevo" || modoVisible === "editar") {
    return (
      <PantallaInterior keyboardShouldPersistTaps="handled">
        <BotonCerrarSesion />
        <CabeceraPantalla titulo="Técnicos" />
        {errorGeneral}
        <FormularioTecnico
          nombre={nombre}
          error={error}
          editando={modoVisible === "editar"}
          procesando={procesando}
          onCambiarNombre={setNombre}
          onGuardar={() => void guardar()}
          onCancelar={cerrarFormulario}
        />
      </PantallaInterior>
    );
  }

  if (modoVisible === "detalle" && tecnico !== null) {
    return (
      <PantallaInterior>
        <BotonCerrarSesion />
        <CabeceraPantalla titulo={tecnico.nombre} subtitulo="Técnico de la banda" />
        <BotonSecundario
          titulo="Volver a técnicos"
          onPress={() => setModo("lista")}
          disabled={procesando}
        />
        {errorGeneral}
        {eliminacionFallida && errorEliminacion !== "" && (
          <Mensaje tipo="error" texto={errorEliminacion} />
        )}
        <BotonPrincipal
          titulo="Editar técnico"
          onPress={() => abrirEdicion(tecnico)}
          disabled={procesando}
        />
        <BotonDestructivo
          titulo="Eliminar técnico"
          onPress={() => confirmarEliminacion(tecnico)}
          disabled={procesando}
        />
      </PantallaInterior>
    );
  }

  return (
    <PantallaInterior>
      <BotonCerrarSesion />
      <CabeceraPantalla titulo="Técnicos" subtitulo="Personas de apoyo técnico de la banda." />
      <BotonSecundario titulo="Volver a Banda" onPress={onVolver} />
      {errorGeneral}
      {puedeGestionar && <BotonPrincipal titulo="+ Añadir técnico" onPress={abrirAlta} />}

      {tecnicos.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no hay técnicos"
          detalle={
            puedeGestionar
              ? "Añade a las personas que ayudan a la banda en los conciertos."
              : "Cuando se añadan técnicos a la banda, aparecerán aquí."
          }
        />
      ) : (
        <ListaTecnicos
          tecnicos={tecnicos}
          procesando={procesando}
          puedeGestionar={puedeGestionar}
          onElegir={abrirDetalle}
        />
      )}
    </PantallaInterior>
  );
}
