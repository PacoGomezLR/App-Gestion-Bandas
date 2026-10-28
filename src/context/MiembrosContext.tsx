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

type MiembrosContextValue = ReturnType<typeof useMiembros> & {
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

  return (
    <MiembrosContext.Provider
      value={{
        ...miembrosState,
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
