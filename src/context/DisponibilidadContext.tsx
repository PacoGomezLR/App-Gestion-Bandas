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

import { crearRepositorioDisponibilidadSupabase } from "../services/supabase/disponibilidad";
import type { IndisponibilidadUsuario } from "../types/disponibilidad";
import { indisponibilidadPropia } from "../utils/disponibilidad";
import { useBandaContext } from "./BandaContext";

interface DisponibilidadContextValue {
  // De todos los integrantes de la banda actual
  indisponibilidades: IndisponibilidadUsuario[];
  // El usuario actual dentro de la banda (auth.uid())
  usuarioActualId: string | null;
  cargando: boolean;
  procesando: boolean;
  errorPersistencia: string;
  // Solo actúan sobre los días del usuario actual
  marcarNoDisponible: (fecha: string) => Promise<boolean>;
  marcarDisponible: (fecha: string) => Promise<boolean>;
}

const DisponibilidadContext = createContext<DisponibilidadContextValue | null>(null);

// Supabase es la fuente de verdad: siempre la disponibilidad de la banda actual.
// No depende del rol: admin y usuario gestionan igual sus propios días.
export function DisponibilidadProvider({ children }: PropsWithChildren) {
  const { bandaActual, pertenenciaActual } = useBandaContext();
  const bandaId = bandaActual?.id ?? null;
  // La pertenencia de la banda actual es la del usuario con sesión
  const usuarioActualId =
    pertenenciaActual !== null && pertenenciaActual.bandaId === bandaId
      ? pertenenciaActual.usuarioId
      : null;

  const [indisponibilidades, setIndisponibilidades] = useState<IndisponibilidadUsuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [errorPersistencia, setErrorPersistencia] = useState("");
  // La ref bloquea de inmediato; el estado solo sirve para que la interfaz se actualice
  const operacionEnCursoRef = useRef(false);

  const repositorio = useMemo(
    () =>
      bandaId === null || usuarioActualId === null
        ? null
        : crearRepositorioDisponibilidadSupabase(bandaId, usuarioActualId),
    [bandaId, usuarioActualId]
  );

  // Al cambiar de banda se descarta la disponibilidad anterior antes de cargar la nueva
  useEffect(() => {
    let activo = true;

    setIndisponibilidades([]);
    setErrorPersistencia("");

    if (repositorio === null) {
      setCargando(false);
      return;
    }

    setCargando(true);

    async function cargar(repositorioBanda: NonNullable<typeof repositorio>) {
      try {
        const guardadas = await repositorioBanda.listar();

        // Una respuesta de una banda anterior no sobrescribe la actual
        if (activo) {
          setIndisponibilidades(guardadas);
        }
      } catch {
        if (activo) {
          setErrorPersistencia("No se ha podido cargar la disponibilidad");
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    void cargar(repositorio);

    return () => {
      activo = false;
    };
  }, [repositorio]);

  const ejecutar = useCallback(async (operacion: () => Promise<void>, mensajeError: string) => {
    if (operacionEnCursoRef.current) {
      return false;
    }

    operacionEnCursoRef.current = true;
    setProcesando(true);

    try {
      await operacion();
      setErrorPersistencia("");
      return true;
    } catch {
      setErrorPersistencia(mensajeError);
      return false;
    } finally {
      operacionEnCursoRef.current = false;
      setProcesando(false);
    }
  }, []);

  const marcarNoDisponible = useCallback(
    async (fecha: string) => {
      if (repositorio === null) {
        return false;
      }

      // Ya marcado: no se crea un duplicado (la base también lo impide)
      if (indisponibilidadPropia(indisponibilidades, usuarioActualId, fecha) !== null) {
        return true;
      }

      return ejecutar(async () => {
        const creada = await repositorio.marcarNoDisponible(fecha);
        setIndisponibilidades((actuales) => [...actuales, creada]);
      }, "No se ha podido marcar el día");
    },
    [repositorio, indisponibilidades, usuarioActualId, ejecutar]
  );

  const marcarDisponible = useCallback(
    async (fecha: string) => {
      // Solo la propia: las de otros integrantes no se pueden tocar
      const propia = indisponibilidadPropia(indisponibilidades, usuarioActualId, fecha);

      if (repositorio === null || propia === null) {
        return false;
      }

      return ejecutar(async () => {
        await repositorio.desmarcar(propia.id);
        setIndisponibilidades((actuales) =>
          actuales.filter((indisponibilidad) => indisponibilidad.id !== propia.id)
        );
      }, "No se ha podido desmarcar el día");
    },
    [repositorio, indisponibilidades, usuarioActualId, ejecutar]
  );

  return (
    <DisponibilidadContext.Provider
      value={{
        indisponibilidades,
        usuarioActualId,
        cargando,
        procesando,
        errorPersistencia,
        marcarNoDisponible,
        marcarDisponible,
      }}
    >
      {children}
    </DisponibilidadContext.Provider>
  );
}

export function useDisponibilidadContext() {
  const context = useContext(DisponibilidadContext);

  if (context === null) {
    throw new Error(
      "useDisponibilidadContext debe usarse dentro de DisponibilidadProvider"
    );
  }

  return context;
}
