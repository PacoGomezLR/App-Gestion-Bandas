import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { inicializarBaseDeDatos } from "../database/migrations";
import {
  eliminarMiembro as eliminarMiembroEnBase,
  guardarMiembro as guardarMiembroEnBase,
  listarMiembros,
} from "../database/repositories/miembrosRepository";
import { useMiembros } from "../hooks/useMiembros";
import type { Miembro } from "../types/miembro";
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

export function MiembrosProvider({
  children,
}: PropsWithChildren) {
  const [cargando, setCargando] = useState(true);
  const [errorPersistencia, setErrorPersistencia] = useState("");

  const persistirMiembro = useCallback(async (miembro: Miembro) => {
    try {
      await guardarMiembroEnBase(miembro);
      setErrorPersistencia("");
      return true;
    } catch {
      setErrorPersistencia("No se ha podido guardar el músico");
      return false;
    }
  }, []);

  const eliminarMiembroPersistido = useCallback(async (id: string) => {
    try {
      await eliminarMiembroEnBase(id);
      setErrorPersistencia("");
      return true;
    } catch {
      setErrorPersistencia("No se ha podido eliminar el músico");
      return false;
    }
  }, []);

  const miembrosState = useMiembros({
    datosIniciales: [],
    persistirMiembro,
    eliminarMiembroPersistido,
  });

  const {
    eventos,
    cargando: cargandoEventos,
  } = useEventosContext();

  const [errorEliminacion, setErrorEliminacion] =
    useState("");

  const { reemplazarMiembros } = miembrosState;

  useEffect(() => {
    let activo = true;

    async function cargarMiembros() {
      try {
        await inicializarBaseDeDatos();
        const miembrosGuardados = await listarMiembros();

        if (!activo) {
          return;
        }

        reemplazarMiembros(miembrosGuardados);
        setErrorPersistencia("");
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

    void cargarMiembros();

    return () => {
      activo = false;
    };
  }, [reemplazarMiembros]);

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

    // La regla se comprueba antes de tocar la base; la FK RESTRICT queda como segunda barrera
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
