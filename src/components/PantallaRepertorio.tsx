import { useState } from "react";

import { useBandaContext } from "../context/BandaContext";
import { useRepertorioContext } from "../context/RepertorioContext";
import { useAtrasAndroid } from "../hooks/useAtrasAndroid";
import type { Cancion, EstadoCancion } from "../types/cancion";
import { etiquetaApartado } from "../utils/canciones";
import { confirmar } from "../utils/dialogo";
import { BotonAtras } from "./BotonAtras";
import { BotonCerrarSesion } from "./BotonCerrarSesion";
import { FormularioCancion } from "./FormularioCancion";
import { BotonPrincipal, Mensaje } from "./PantallaBase";
import {
  BotonDestructivo,
  BotonSecundario,
  CabeceraPantalla,
  CargandoInterior,
  EstadoVacio,
  FilaNavegable,
  FilaTexto,
  GrupoFilas,
  PantallaInterior,
} from "./PantallaInterior";
import { SelectorApartado } from "./SelectorApartado";

interface PantallaRepertorioProps {
  // Las pestañas siguen montadas: Atrás solo se intercepta en la que se ve
  enFoco: boolean;
}

// Lista → (admin) detalle → edición, o lista → (admin) alta. Son vistas de la
// misma pantalla, como en Técnicos. Ocultar acciones es solo presentación:
// RepertorioContext y la base vuelven a comprobar el permiso.
type Modo = "lista" | "nuevo" | "detalle" | "editar";

const VACIO: Record<EstadoCancion, { titulo: string; detalleAdmin: string }> = {
  repertorio: {
    titulo: "Todavía no hay canciones en el repertorio.",
    detalleAdmin: "Añade la primera canción para empezar.",
  },
  nueva: {
    titulo: "No hay canciones nuevas.",
    detalleAdmin: "Añade aquí las canciones que queréis incorporar al repertorio.",
  },
};

export function PantallaRepertorio({ enFoco }: PantallaRepertorioProps) {
  const { esAdmin, bandaActual } = useBandaContext();
  const {
    canciones,
    repertorio,
    nuevas,
    cargando,
    error,
    errorOperacion,
    procesando,
    crearCancion,
    editarCancion,
    eliminarCancion,
    pasarARepertorio,
    recargar,
    limpiarErrorOperacion,
  } = useRepertorioContext();

  const [apartado, setApartado] = useState<EstadoCancion>("repertorio");
  const [modo, setModo] = useState<Modo>("lista");
  const [cancionId, setCancionId] = useState<string | null>(null);

  const cancion = canciones.find(({ id }) => id === cancionId) ?? null;
  const necesitaCancion = modo === "detalle" || modo === "editar";
  // Sin permiso, o si la canción ya no existe, solo queda la lista
  const modoVisible: Modo =
    !esAdmin || (necesitaCancion && cancion === null) ? "lista" : modo;
  const lista = apartado === "repertorio" ? repertorio : nuevas;
  const nombreApartado = etiquetaApartado(apartado);

  function irA(destino: Modo) {
    limpiarErrorOperacion();
    setModo(destino);
  }

  function abrirDetalle({ id }: Cancion) {
    setCancionId(id);
    irA("detalle");
  }

  // La canción nace en el apartado que está abierto
  async function guardarNueva(nombre: string) {
    if (await crearCancion(nombre, apartado)) {
      setModo("lista");
    }
  }

  async function guardarEdicion(id: string, nombre: string) {
    if (await editarCancion(id, nombre)) {
      setModo("detalle");
    }
  }

  async function pasar(id: string) {
    // Desaparece de Canciones nuevas: se vuelve a esa lista
    if (await pasarARepertorio(id)) {
      setModo("lista");
    }
  }

  async function eliminar(id: string) {
    if (await eliminarCancion(id)) {
      setModo("lista");
    }
  }

  function confirmarEliminacion({ id, nombre }: Cancion) {
    confirmar({
      titulo: "¿Eliminar canción?",
      mensaje: `“${nombre}” se eliminará del repertorio.`,
      textoCancelar: "Cancelar",
      textoConfirmar: "Eliminar",
      destructivo: true,
      onConfirmar: () => void eliminar(id),
    });
  }

  // Atrás de Android, del nivel más interno al más externo: edición → detalle →
  // lista; alta → lista. En la lista no se intercepta. Mientras guarda, no hace nada
  function accionAtras(): (() => void) | null {
    if (modoVisible === "lista") {
      return null;
    }

    if (procesando) {
      return () => {};
    }

    return modoVisible === "editar" ? () => irA("detalle") : () => irA("lista");
  }

  useAtrasAndroid(enFoco ? accionAtras() : null);

  if (modoVisible === "nuevo" || (modoVisible === "editar" && cancion !== null)) {
    return (
      <PantallaInterior keyboardShouldPersistTaps="handled">
        <BotonCerrarSesion />
        <CabeceraPantalla titulo="Repertorio" subtitulo={nombreApartado} />
        <FormularioCancion
          nombreInicial={modoVisible === "editar" ? cancion?.nombre : undefined}
          errorGuardado={errorOperacion}
          procesando={procesando}
          onGuardar={(nombre) =>
            void (modoVisible === "editar" && cancion !== null
              ? guardarEdicion(cancion.id, nombre)
              : guardarNueva(nombre))
          }
          onCancelar={() => irA(modoVisible === "editar" ? "detalle" : "lista")}
        />
      </PantallaInterior>
    );
  }

  if (modoVisible === "detalle" && cancion !== null) {
    const esNueva = cancion.estado === "nueva";

    return (
      <PantallaInterior>
        <BotonCerrarSesion />
        <CabeceraPantalla titulo={cancion.nombre} subtitulo={etiquetaApartado(cancion.estado)} />
        <BotonSecundario
          titulo={`Volver a ${nombreApartado}`}
          onPress={() => irA("lista")}
          disabled={procesando}
        />
        {errorOperacion !== "" && <Mensaje tipo="error" texto={errorOperacion} />}

        {/* En Canciones nuevas la acción propia es incorporarla; en Repertorio, editarla */}
        {esNueva && (
          <BotonPrincipal
            titulo="Pasar a repertorio"
            onPress={() => void pasar(cancion.id)}
            disabled={procesando}
          />
        )}
        {esNueva ? (
          <BotonSecundario titulo="Editar" onPress={() => irA("editar")} disabled={procesando} />
        ) : (
          <BotonPrincipal titulo="Editar" onPress={() => irA("editar")} disabled={procesando} />
        )}
        <BotonDestructivo
          titulo="Eliminar canción"
          onPress={() => confirmarEliminacion(cancion)}
          disabled={procesando}
        />
      </PantallaInterior>
    );
  }

  return (
    <PantallaInterior>
      {/* Vista principal de la pestaña: «‹ Atrás» vuelve a la pantalla anterior del router */}
      <BotonCerrarSesion izquierda={<BotonAtras />} />
      <CabeceraPantalla titulo="Repertorio" subtitulo={bandaActual?.nombre} />

      <SelectorApartado
        apartado={apartado}
        // Los totales salen de lo ya cargado; sin carga correcta no se enseña un 0 engañoso
        totales={
          cargando || error !== "" ? null : { repertorio: repertorio.length, nueva: nuevas.length }
        }
        onCambiar={setApartado}
      />

      {cargando ? (
        <CargandoInterior texto="Cargando canciones..." />
      ) : error !== "" ? (
        <>
          <Mensaje tipo="error" texto={error} />
          <BotonPrincipal titulo="Reintentar" onPress={() => void recargar()} />
        </>
      ) : (
        <>
          {esAdmin && <BotonPrincipal titulo="+ Añadir canción" onPress={() => irA("nuevo")} />}

          {lista.length === 0 ? (
            <EstadoVacio
              titulo={VACIO[apartado].titulo}
              detalle={esAdmin ? VACIO[apartado].detalleAdmin : undefined}
            />
          ) : (
            <GrupoFilas>
              {lista.map((elemento) =>
                // Solo el admin tiene algo que hacer con una canción: para el resto es texto
                esAdmin ? (
                  <FilaNavegable
                    key={elemento.id}
                    titulo={elemento.nombre}
                    onPress={() => abrirDetalle(elemento)}
                  />
                ) : (
                  <FilaTexto key={elemento.id} titulo={elemento.nombre} />
                )
              )}
            </GrupoFilas>
          )}
        </>
      )}
    </PantallaInterior>
  );
}
