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
import { esErrorEnUso } from "../services/supabase/errores";
import { crearRepositorioEventoFinanzasSupabase } from "../services/supabase/eventoFinanzas";
import { crearRepositorioEventosSupabase } from "../services/supabase/eventos";
import type {
  CachesPorEvento,
  CambioCache,
  ErrorEliminacionEvento,
  Evento,
} from "../types/evento";
import { useBandaContext } from "./BandaContext";

type EventosContextValue = ReturnType<typeof useEventos> & {
  cargando: boolean;
  errorPersistencia: string;
  // Aparte de errorPersistencia: se muestra junto a ese evento, no en toda la app
  errorEliminacion: ErrorEliminacionEvento | null;
  // Vacío para quien no es admin: ni se pide ni llega a la app
  cachesEvento: CachesPorEvento;
  cargandoCaches: boolean;
  errorCaches: string;
};

const SIN_CACHES: CachesPorEvento = {};

function sinCache(caches: CachesPorEvento, id: string): CachesPorEvento {
  const { [id]: _quitado, ...resto } = caches;

  return resto;
}

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
  const [errorEliminacion, setErrorEliminacion] = useState<ErrorEliminacionEvento | null>(null);
  const [cachesEvento, setCachesEvento] = useState<CachesPorEvento>(SIN_CACHES);
  const [cargandoCaches, setCargandoCaches] = useState(false);
  const [errorCaches, setErrorCaches] = useState("");

  const repositorio = useMemo(
    () => (bandaId === null ? null : crearRepositorioEventosSupabase(bandaId)),
    [bandaId]
  );

  // Sin ser admin no hay repositorio: el caché ni se consulta
  const repositorioCaches = useMemo(
    () => (bandaId === null || !esAdmin ? null : crearRepositorioEventoFinanzasSupabase(bandaId)),
    [bandaId, esAdmin]
  );

  // Segunda barrera tras ocultar los controles: sin ser admin no se llama al
  // repositorio. La tercera es la RLS del servidor.
  const persistirEvento = useCallback(
    async (evento: Evento, esNuevo: boolean, cache?: CambioCache) => {
      if (repositorio === null || !esAdmin) {
        setErrorPersistencia("No se ha podido guardar el evento");
        return null;
      }

      try {
        const { id, ...datos } = evento;
        const cacheAnterior = esNuevo ? null : (cachesEvento[id] ?? null);
        // Lo que no cambia el caché sigue el camino de siempre
        const cambiaCache = cache !== undefined && cache !== cacheAnterior;
        let guardado: Evento;

        if (esNuevo) {
          guardado =
            typeof cache === "number"
              ? await repositorio.crearConCache(datos, cache)
              : await repositorio.crear(datos);
        } else {
          guardado = cambiaCache
            ? await repositorio.actualizarConCache({ ...datos, id }, cache)
            : await repositorio.actualizar({ ...datos, id });
        }

        if (cambiaCache) {
          setCachesEvento((actuales) =>
            cache === null
              ? sinCache(actuales, guardado.id)
              : { ...actuales, [guardado.id]: cache }
          );
        }

        setErrorPersistencia("");
        return guardado;
      } catch {
        setErrorPersistencia("No se ha podido guardar el evento");
        return null;
      }
    },
    [repositorio, esAdmin, cachesEvento]
  );

  const eliminarEventoPersistido = useCallback(
    async (id: string) => {
      if (repositorio === null || !esAdmin) {
        setErrorPersistencia("No se ha podido eliminar el evento");
        return false;
      }

      setErrorEliminacion(null);

      try {
        await repositorio.eliminar(id);
        // La base borra su caché con él
        setCachesEvento((actuales) => sinCache(actuales, id));
        setErrorPersistencia("");
        return true;
      } catch (error) {
        // Lo frena la clave foránea: sus técnicos se borran con él, así que solo
        // pueden ser movimientos financieros
        if (esErrorEnUso(error)) {
          setErrorPersistencia("");
          setErrorEliminacion({
            eventoId: id,
            mensaje: "No se puede eliminar este evento porque tiene movimientos financieros asociados.",
          });
        } else {
          setErrorPersistencia("No se ha podido eliminar el evento");
        }

        return false;
      }
    },
    [repositorio, esAdmin]
  );

  const eventosState = useEventos({
    datosIniciales: [],
    persistirEvento,
    eliminarEventoPersistido,
    cachesEvento,
  });

  const { reemplazarEventos } = eventosState;

  // Al cambiar de banda se descartan los eventos anteriores antes de cargar los nuevos
  useEffect(() => {
    let activo = true;

    reemplazarEventos([]);
    setErrorPersistencia("");
    setErrorEliminacion(null);

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

  // Una sola consulta para toda la banda, nunca una por evento. Si falla, los
  // eventos siguen funcionando: solo se pierde el bloque económico
  useEffect(() => {
    let activo = true;

    setCachesEvento(SIN_CACHES);
    setErrorCaches("");

    if (repositorioCaches === null) {
      setCargandoCaches(false);
      return;
    }

    setCargandoCaches(true);

    async function cargarCaches(repositorioBanda: NonNullable<typeof repositorioCaches>) {
      try {
        const caches = await repositorioBanda.listar();

        if (activo) {
          setCachesEvento(caches);
        }
      } catch {
        if (activo) {
          setErrorCaches("No se ha podido cargar el caché");
        }
      } finally {
        if (activo) {
          setCargandoCaches(false);
        }
      }
    }

    void cargarCaches(repositorioCaches);

    return () => {
      activo = false;
    };
  }, [repositorioCaches]);

  return (
    <EventosContext.Provider
      value={{
        ...eventosState,
        cargando,
        errorPersistencia,
        errorEliminacion,
        cachesEvento,
        cargandoCaches,
        errorCaches,
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
