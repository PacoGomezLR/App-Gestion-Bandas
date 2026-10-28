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
  eliminarTecnico as eliminarTecnicoEnBase,
  guardarTecnico as guardarTecnicoEnBase,
  listarTecnicos,
} from "../database/repositories/tecnicosRepository";
import { useTecnicos } from "../hooks/useTecnicos";
import type { Tecnico } from "../types/tecnico";
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

export function TecnicosProvider({
  children,
}: PropsWithChildren) {
  const [cargando, setCargando] = useState(true);
  const [errorPersistencia, setErrorPersistencia] = useState("");

  const persistirTecnico = useCallback(async (tecnico: Tecnico) => {
    try {
      await guardarTecnicoEnBase(tecnico);
      setErrorPersistencia("");
      return true;
    } catch {
      setErrorPersistencia("No se ha podido guardar el técnico");
      return false;
    }
  }, []);

  const eliminarTecnicoPersistido = useCallback(async (id: string) => {
    try {
      await eliminarTecnicoEnBase(id);
      setErrorPersistencia("");
      return true;
    } catch {
      setErrorPersistencia("No se ha podido eliminar el técnico");
      return false;
    }
  }, []);

  const tecnicosState = useTecnicos({
    datosIniciales: [],
    persistirTecnico,
    eliminarTecnicoPersistido,
  });
  const { eventos } = useEventosContext();

  const [errorEliminacion, setErrorEliminacion] =
    useState("");

  const { reemplazarTecnicos } = tecnicosState;

  useEffect(() => {
    let activo = true;

    async function cargarTecnicos() {
      try {
        await inicializarBaseDeDatos();
        const tecnicosGuardados = await listarTecnicos();

        if (!activo) {
          return;
        }

        reemplazarTecnicos(tecnicosGuardados);
        setErrorPersistencia("");
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

    void cargarTecnicos();

    return () => {
      activo = false;
    };
  }, [reemplazarTecnicos]);

  async function eliminarTecnico(id: string): Promise<boolean> {
    const tecnico = tecnicosState.tecnicos.find(
      (tecnico) => tecnico.id === id
    );

    const eventosAsignados = eventos.filter((evento) =>
      evento.tecnicoIds.includes(id)
    );

    // La regla se comprueba antes de tocar la base; la FK RESTRICT queda como segunda barrera
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
