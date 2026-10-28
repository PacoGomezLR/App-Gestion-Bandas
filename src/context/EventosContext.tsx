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
  eliminarEvento as eliminarEventoEnBase,
  guardarEvento as guardarEventoEnBase,
  listarEventos,
} from "../database/repositories/eventosRepository";
import { useEventos } from "../hooks/useEventos";
import type { Evento } from "../types/evento";

type EventosContextValue = ReturnType<typeof useEventos> & {
  cargando: boolean;
  errorPersistencia: string;
};

const EventosContext =
  createContext<EventosContextValue | null>(null);

export function EventosProvider({
  children,
}: PropsWithChildren) {
  const [cargando, setCargando] = useState(true);
  const [errorPersistencia, setErrorPersistencia] = useState("");

  const persistirEvento = useCallback(async (evento: Evento) => {
    try {
      await guardarEventoEnBase(evento);
      setErrorPersistencia("");
      return true;
    } catch {
      setErrorPersistencia("No se ha podido guardar el evento");
      return false;
    }
  }, []);

  const eliminarEventoPersistido = useCallback(async (id: string) => {
    try {
      await eliminarEventoEnBase(id);
      setErrorPersistencia("");
      return true;
    } catch {
      setErrorPersistencia("No se ha podido eliminar el evento");
      return false;
    }
  }, []);

  const eventosState = useEventos({
    datosIniciales: [],
    persistirEvento,
    eliminarEventoPersistido,
  });

  const { reemplazarEventos } = eventosState;

  useEffect(() => {
    let activo = true;

    async function cargarEventos() {
      try {
        await inicializarBaseDeDatos();
        const eventosGuardados = await listarEventos();

        if (!activo) {
          return;
        }

        reemplazarEventos(eventosGuardados);
        setErrorPersistencia("");
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

    void cargarEventos();

    return () => {
      activo = false;
    };
  }, [reemplazarEventos]);

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
