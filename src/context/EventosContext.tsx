import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useEventos } from "../hooks/useEventos";
import { crearRepositorioEventosSupabase } from "../services/supabase/eventos";
import type { Evento } from "../types/evento";
import { useBandaContext } from "./BandaContext";

type EventosContextValue = ReturnType<typeof useEventos> & {
  cargando: boolean;
  errorPersistencia: string;
};

const EventosContext =
  createContext<EventosContextValue | null>(null);

// Supabase es la fuente de verdad: los eventos son siempre los de la banda actual.
// Si Supabase falla se muestra el error; nunca se recurre a los datos de SQLite.
export function EventosProvider({
  children,
}: PropsWithChildren) {
  const { bandaActual, esAdmin } = useBandaContext();
  const bandaId = bandaActual?.id ?? null;
  const [cargando, setCargando] = useState(true);
  const [errorPersistencia, setErrorPersistencia] = useState("");

  const repositorio = useMemo(
    () => (bandaId === null ? null : crearRepositorioEventosSupabase(bandaId)),
    [bandaId]
  );

  // Segunda barrera tras ocultar los controles: sin ser admin no se llama al
  // repositorio. La tercera es la RLS del servidor.
  const persistirEvento = useCallback(
    async (evento: Evento, esNuevo: boolean) => {
      if (repositorio === null || !esAdmin) {
        setErrorPersistencia("No se ha podido guardar el evento");
        return null;
      }

      try {
        const { id, ...datos } = evento;
        const guardado = esNuevo
          ? await repositorio.crear(datos)
          : await repositorio.actualizar({ ...datos, id });
        setErrorPersistencia("");
        return guardado;
      } catch {
        setErrorPersistencia("No se ha podido guardar el evento");
        return null;
      }
    },
    [repositorio, esAdmin]
  );

  const eliminarEventoPersistido = useCallback(
    async (id: string) => {
      if (repositorio === null || !esAdmin) {
        setErrorPersistencia("No se ha podido eliminar el evento");
        return false;
      }

      try {
        await repositorio.eliminar(id);
        setErrorPersistencia("");
        return true;
      } catch {
        setErrorPersistencia("No se ha podido eliminar el evento");
        return false;
      }
    },
    [repositorio, esAdmin]
  );

  const eventosState = useEventos({
    datosIniciales: [],
    persistirEvento,
    eliminarEventoPersistido,
  });

  const { reemplazarEventos } = eventosState;

  // Al cambiar de banda se descartan los eventos anteriores antes de cargar los nuevos
  useEffect(() => {
    let activo = true;

    reemplazarEventos([]);
    setErrorPersistencia("");

    if (repositorio === null) {
      setCargando(false);
      return;
    }

    setCargando(true);

    async function cargarEventos(repositorioBanda: NonNullable<typeof repositorio>) {
      try {
        const eventosGuardados = await repositorioBanda.listar();

        // Una respuesta de una banda anterior no sobrescribe la actual
        if (!activo) {
          return;
        }

        reemplazarEventos(eventosGuardados);
      } catch {
        if (activo) {
          setErrorPersistencia("No se han podido cargar los eventos");
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    void cargarEventos(repositorio);

    return () => {
      activo = false;
    };
  }, [repositorio, reemplazarEventos]);

  return (
    <EventosContext.Provider
      value={{
        ...eventosState,
        cargando,
        errorPersistencia,
      }}
    >
      {children}
    </EventosContext.Provider>
  );
}

export function useEventosContext() {
  const context = useContext(EventosContext);

  if (context === null) {
    throw new Error(
      "useEventosContext debe usarse dentro de EventosProvider"
    );
  }

  return context;
}
