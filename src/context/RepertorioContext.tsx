import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ErrorRepositorio } from "../services/supabase/errores";
import {
  crearRepositorioCancionesSupabase,
  type RepositorioCanciones,
} from "../services/supabase/canciones";
import type { Cancion, EstadoCancion } from "../types/cancion";
import { cancionesDe } from "../utils/canciones";
import { useBandaContext } from "./BandaContext";

interface RepertorioContextValue {
  canciones: Cancion[];
  // Los dos apartados salen de la misma colección: no hay dos listas que sincronizar
  repertorio: Cancion[];
  nuevas: Cancion[];
  cargando: boolean;
  // Fallo al cargar: las listas vacías no significan que no haya canciones
  error: string;
  // Fallo de la última escritura: no afecta a lo ya cargado
  errorOperacion: string;
  procesando: boolean;
  crearCancion: (nombre: string, estado: EstadoCancion) => Promise<boolean>;
  editarCancion: (id: string, nombre: string) => Promise<boolean>;
  eliminarCancion: (id: string) => Promise<boolean>;
  pasarARepertorio: (id: string) => Promise<boolean>;
  recargar: () => Promise<void>;
  limpiarErrorOperacion: () => void;
}

const RepertorioContext = createContext<RepertorioContextValue | null>(null);

function mensajeDeFallo(fallo: unknown, mensajeGeneral: string): string {
  if (fallo instanceof ErrorRepositorio && fallo.motivo === "sin_permiso") {
    return "Solo un administrador de la banda puede cambiar el repertorio";
  }

  return mensajeGeneral;
}

// Las canciones de la banda actual, en una sola consulta. Las lee cualquier
// miembro; escribir solo lo intenta un admin, y la RLS del servidor lo comprueba.
export function RepertorioProvider({ children }: PropsWithChildren) {
  const { bandaActual, esAdmin } = useBandaContext();
  const bandaId = bandaActual?.id ?? null;

  const [canciones, setCanciones] = useState<Cancion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [errorOperacion, setErrorOperacion] = useState("");
  const [procesando, setProcesando] = useState(false);
  // La ref bloquea de inmediato; el estado solo sirve para que la interfaz se actualice
  const operacionEnCursoRef = useRef(false);
  // Solo vale la respuesta de la última carga pedida
  const cargaActualRef = useRef(0);

  const repositorio = useMemo(
    () => (bandaId === null ? null : crearRepositorioCancionesSupabase(bandaId)),
    [bandaId]
  );

  const recargar = useCallback(async () => {
    cargaActualRef.current += 1;
    const carga = cargaActualRef.current;

    setError("");

    if (repositorio === null) {
      setCanciones([]);
      setCargando(false);
      return;
    }

    setCargando(true);

    try {
      const lista = await repositorio.listar();

      if (carga === cargaActualRef.current) {
        setCanciones(lista);
      }
    } catch {
      if (carga === cargaActualRef.current) {
        setCanciones([]);
        setError("No se han podido cargar las canciones");
      }
    } finally {
      if (carga === cargaActualRef.current) {
        setCargando(false);
      }
    }
  }, [repositorio]);

  // Al cambiar de banda se descartan las canciones anteriores antes de cargar las nuevas
  useEffect(() => {
    setCanciones([]);
    setErrorOperacion("");
    void recargar();

    return () => {
      cargaActualRef.current += 1;
    };
  }, [recargar]);

  // Primero se persiste; el estado local solo cambia si la base lo confirma.
  // Segunda barrera tras ocultar los controles: sin ser admin no se llama al repositorio
  async function ejecutar(
    mensajeGeneral: string,
    operacion: (repositorioBanda: RepositorioCanciones) => Promise<void>
  ): Promise<boolean> {
    if (operacionEnCursoRef.current) {
      return false;
    }

    if (repositorio === null || !esAdmin) {
      setErrorOperacion(mensajeGeneral);
      return false;
    }

    operacionEnCursoRef.current = true;
    setProcesando(true);
    setErrorOperacion("");

    try {
      await operacion(repositorio);
      return true;
    } catch (fallo) {
      setErrorOperacion(mensajeDeFallo(fallo, mensajeGeneral));
      return false;
    } finally {
      operacionEnCursoRef.current = false;
      setProcesando(false);
    }
  }

  function sustituir(cancion: Cancion) {
    setCanciones((actuales) =>
      actuales.map((actual) => (actual.id === cancion.id ? cancion : actual))
    );
  }

  function crearCancion(nombre: string, estado: EstadoCancion) {
    return ejecutar("No se ha podido guardar la canción", async (repositorioBanda) => {
      const creada = await repositorioBanda.crear(nombre, estado);

      setCanciones((actuales) => [...actuales, creada]);
    });
  }

  function editarCancion(id: string, nombre: string) {
    return ejecutar("No se han podido guardar los cambios", async (repositorioBanda) => {
      sustituir(await repositorioBanda.editarNombre(id, nombre));
    });
  }

  function pasarARepertorio(id: string) {
    return ejecutar("No se ha podido pasar la canción al repertorio", async (repositorioBanda) => {
      sustituir(await repositorioBanda.pasarARepertorio(id));
    });
  }

  function eliminarCancion(id: string) {
    return ejecutar("No se ha podido eliminar la canción", async (repositorioBanda) => {
      await repositorioBanda.eliminar(id);

      setCanciones((actuales) => actuales.filter((cancion) => cancion.id !== id));
    });
  }

  const limpiarErrorOperacion = useCallback(() => setErrorOperacion(""), []);

  const apartados = useMemo(
    () => ({ repertorio: cancionesDe(canciones, "repertorio"), nuevas: cancionesDe(canciones, "nueva") }),
    [canciones]
  );

  return (
    <RepertorioContext.Provider
      value={{
        canciones,
        ...apartados,
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
      }}
    >
      {children}
    </RepertorioContext.Provider>
  );
}

export function useRepertorioContext() {
  const context = useContext(RepertorioContext);

  if (context === null) {
    throw new Error("useRepertorioContext debe usarse dentro de RepertorioProvider");
  }

  return context;
}
