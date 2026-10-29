import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useMiembros } from "../hooks/useMiembros";
import { esErrorEnUso } from "../services/supabase/errores";
import { crearRepositorioMiembrosSupabase } from "../services/supabase/personas";
import type { Miembro } from "../types/miembro";
import { useBandaContext } from "./BandaContext";
import { useEventosContext } from "./EventosContext";

type UseMiembrosValue = ReturnType<typeof useMiembros>;

type MiembrosContextValue =
  Omit<UseMiembrosValue, "eliminarMiembro"> & {
    eliminarMiembro: (id: string) => Promise<boolean>;
    errorEliminacion: string;
    cargando: boolean;
    errorPersistencia: string;
  };

const MiembrosContext =
  createContext<MiembrosContextValue | null>(null);

// Supabase es la fuente de verdad: los músicos son siempre los de la banda actual
export function MiembrosProvider({
  children,
}: PropsWithChildren) {
  const { bandaActual, esAdmin } = useBandaContext();
  const bandaId = bandaActual?.id ?? null;
  const [cargando, setCargando] = useState(true);
  const [errorPersistencia, setErrorPersistencia] = useState("");
  const [errorEliminacion, setErrorEliminacion] =
    useState("");

  const repositorio = useMemo(
    () => (bandaId === null ? null : crearRepositorioMiembrosSupabase(bandaId)),
    [bandaId]
  );

  // Segunda barrera tras ocultar los controles: sin ser admin no se llama al repositorio
  const persistirMiembro = useCallback(
    async (miembro: Miembro, esNuevo: boolean) => {
      if (repositorio === null || !esAdmin) {
        setErrorPersistencia("No se ha podido guardar el músico");
        return null;
      }

      try {
        const guardado = esNuevo
          ? await repositorio.crear(miembro.nombre)
          : await repositorio.actualizar(miembro);
        setErrorPersistencia("");
        return guardado;
      } catch {
        setErrorPersistencia("No se ha podido guardar el músico");
        return null;
      }
    },
    [repositorio, esAdmin]
  );

  const eliminarMiembroPersistido = useCallback(
    async (id: string) => {
      if (repositorio === null || !esAdmin) {
        setErrorPersistencia("No se ha podido eliminar el músico");
        return false;
      }

      try {
        await repositorio.eliminar(id);
        setErrorPersistencia("");
        return true;
      } catch (error) {
        // Otro dispositivo lo asignó entre la comprobación y el borrado: lo frena la clave foránea
        if (esErrorEnUso(error)) {
          setErrorEliminacion(
            "No se puede eliminar este músico porque está asignado a algún evento"
          );
        } else {
          setErrorPersistencia("No se ha podido eliminar el músico");
        }

        return false;
      }
    },
    [repositorio, esAdmin]
  );

  const miembrosState = useMiembros({
    datosIniciales: [],
    persistirMiembro,
    eliminarMiembroPersistido,
  });

  const {
    eventos,
    cargando: cargandoEventos,
  } = useEventosContext();

  const { reemplazarMiembros } = miembrosState;

  // Al cambiar de banda se descartan los músicos anteriores antes de cargar los nuevos
  useEffect(() => {
    let activo = true;

    reemplazarMiembros([]);
    setErrorPersistencia("");
    setErrorEliminacion("");

    if (repositorio === null) {
      setCargando(false);
      return;
    }

    setCargando(true);

    async function cargarMiembros(repositorioBanda: NonNullable<typeof repositorio>) {
      try {
        const miembrosGuardados = await repositorioBanda.listar();

        // Una respuesta de una banda anterior no sobrescribe la actual
        if (!activo) {
          return;
        }

        reemplazarMiembros(miembrosGuardados);
      } catch {
        if (activo) {
          setErrorPersistencia("No se han podido cargar los músicos");
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    void cargarMiembros(repositorio);

    return () => {
      activo = false;
    };
  }, [repositorio, reemplazarMiembros]);

  async function eliminarMiembro(id: string): Promise<boolean> {
    // Sin los eventos cargados no se puede saber si el músico está asignado
    if (cargandoEventos) {
      return false;
    }

    const miembro = miembrosState.miembros.find(
      (miembro) => miembro.id === id
    );

    const eventosAsignados = eventos.filter((evento) =>
      evento.miembroIds.includes(id)
    );

    // La regla se comprueba antes de tocar la base; la clave foránea queda como segunda barrera
    if (eventosAsignados.length > 0) {
      const cantidad = eventosAsignados.length;

      setErrorEliminacion(
        `No se puede eliminar a ${
          miembro?.nombre ?? "este músico"
        } porque está asignado a ${cantidad} ${
          cantidad === 1 ? "evento" : "eventos"
        }`
      );

      return false;
    }

    const eliminado = await miembrosState.eliminarMiembro(id);

    if (eliminado) {
      setErrorEliminacion("");
    }

    return eliminado;
  }

  return (
    <MiembrosContext.Provider
      value={{
        ...miembrosState,
        eliminarMiembro,
        errorEliminacion,
        cargando,
        errorPersistencia,
      }}
    >
      {children}
    </MiembrosContext.Provider>
  );
}

export function useMiembrosContext() {
  const context = useContext(MiembrosContext);

  if (context === null) {
    throw new Error(
      "useMiembrosContext debe usarse dentro de MiembrosProvider"
    );
  }

  return context;
}
