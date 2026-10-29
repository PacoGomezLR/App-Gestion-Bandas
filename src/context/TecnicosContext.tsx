import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useTecnicos } from "../hooks/useTecnicos";
import { esErrorEnUso } from "../services/supabase/errores";
import { crearRepositorioTecnicosSupabase } from "../services/supabase/personas";
import type { Tecnico } from "../types/tecnico";
import { useBandaContext } from "./BandaContext";
import { useEventosContext } from "./EventosContext";

type UseTecnicosValue = ReturnType<typeof useTecnicos>;

type TecnicosContextValue =
  Omit<UseTecnicosValue, "eliminarTecnico"> & {
    eliminarTecnico: (id: string) => Promise<boolean>;
    errorEliminacion: string;
    cargando: boolean;
    errorPersistencia: string;
  };

const TecnicosContext =
  createContext<TecnicosContextValue | null>(null);

// Supabase es la fuente de verdad: los técnicos son siempre los de la banda actual
export function TecnicosProvider({
  children,
}: PropsWithChildren) {
  const { bandaActual, esAdmin } = useBandaContext();
  const bandaId = bandaActual?.id ?? null;
  const [cargando, setCargando] = useState(true);
  const [errorPersistencia, setErrorPersistencia] = useState("");
  const [errorEliminacion, setErrorEliminacion] =
    useState("");

  const repositorio = useMemo(
    () => (bandaId === null ? null : crearRepositorioTecnicosSupabase(bandaId)),
    [bandaId]
  );

  // Segunda barrera tras ocultar los controles: sin ser admin no se llama al repositorio
  const persistirTecnico = useCallback(
    async (tecnico: Tecnico, esNuevo: boolean) => {
      if (repositorio === null || !esAdmin) {
        setErrorPersistencia("No se ha podido guardar el técnico");
        return null;
      }

      try {
        const guardado = esNuevo
          ? await repositorio.crear(tecnico.nombre)
          : await repositorio.actualizar(tecnico);
        setErrorPersistencia("");
        return guardado;
      } catch {
        setErrorPersistencia("No se ha podido guardar el técnico");
        return null;
      }
    },
    [repositorio, esAdmin]
  );

  const eliminarTecnicoPersistido = useCallback(
    async (id: string) => {
      if (repositorio === null || !esAdmin) {
        setErrorPersistencia("No se ha podido eliminar el técnico");
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
            "No se puede eliminar este técnico porque está asignado a algún evento"
          );
        } else {
          setErrorPersistencia("No se ha podido eliminar el técnico");
        }

        return false;
      }
    },
    [repositorio, esAdmin]
  );

  const tecnicosState = useTecnicos({
    datosIniciales: [],
    persistirTecnico,
    eliminarTecnicoPersistido,
  });

  const {
    eventos,
    cargando: cargandoEventos,
  } = useEventosContext();

  const { reemplazarTecnicos } = tecnicosState;

  // Al cambiar de banda se descartan los técnicos anteriores antes de cargar los nuevos
  useEffect(() => {
    let activo = true;

    reemplazarTecnicos([]);
    setErrorPersistencia("");
    setErrorEliminacion("");

    if (repositorio === null) {
      setCargando(false);
      return;
    }

    setCargando(true);

    async function cargarTecnicos(repositorioBanda: NonNullable<typeof repositorio>) {
      try {
        const tecnicosGuardados = await repositorioBanda.listar();

        // Una respuesta de una banda anterior no sobrescribe la actual
        if (!activo) {
          return;
        }

        reemplazarTecnicos(tecnicosGuardados);
      } catch {
        if (activo) {
          setErrorPersistencia("No se han podido cargar los técnicos");
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    void cargarTecnicos(repositorio);

    return () => {
      activo = false;
    };
  }, [repositorio, reemplazarTecnicos]);

  async function eliminarTecnico(id: string): Promise<boolean> {
    // Sin los eventos cargados no se puede saber si el técnico está asignado
    if (cargandoEventos) {
      return false;
    }

    const tecnico = tecnicosState.tecnicos.find(
      (tecnico) => tecnico.id === id
    );

    const eventosAsignados = eventos.filter((evento) =>
      evento.tecnicoIds.includes(id)
    );

    // La regla se comprueba antes de tocar la base; la clave foránea queda como segunda barrera
    if (eventosAsignados.length > 0) {
      const cantidad = eventosAsignados.length;

      setErrorEliminacion(
        `No se puede eliminar a ${
          tecnico?.nombre ?? "este técnico"
        } porque está asignado a ${cantidad} ${
          cantidad === 1 ? "evento" : "eventos"
        }`
      );

      return false;
    }

    const eliminado = await tecnicosState.eliminarTecnico(id);

    if (eliminado) {
      setErrorEliminacion("");
    }

    return eliminado;
  }

  return (
    <TecnicosContext.Provider
      value={{
        ...tecnicosState,
        eliminarTecnico,
        errorEliminacion,
        cargando,
        errorPersistencia,
      }}
    >
      {children}
    </TecnicosContext.Provider>
  );
}

export function useTecnicosContext() {
  const context = useContext(TecnicosContext);

  if (context === null) {
    throw new Error(
      "useTecnicosContext debe usarse dentro de TecnicosProvider"
    );
  }

  return context;
}
