import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { crearRepositorioIntegrantesSupabase } from "../services/supabase/integrantes";
import type { IntegranteBanda } from "../types/banda";
import { useBandaContext } from "./BandaContext";

interface IntegrantesContextValue {
  // Los usuarios de la banda actual, solo con id y nombre visible
  integrantes: IntegranteBanda[];
  // usuarioId → nombre visible (solo quien ya lo tiene): resuelve sin más consultas
  nombresPorUsuario: Record<string, string>;
  cargando: boolean;
  errorPersistencia: string;
}

const IntegrantesContext = createContext<IntegrantesContextValue | null>(null);

// Los integrantes son los usuarios de banda_usuarios: aquí solo se conocen sus
// nombres visibles, en una única llamada por banda (RPC listar_integrantes_banda).
// Solo lectura: el nombre se pone al registrarse (o una vez, en CompletarPerfil).
export function IntegrantesProvider({ children }: PropsWithChildren) {
  const { bandaActual } = useBandaContext();
  const bandaId = bandaActual?.id ?? null;

  const [integrantes, setIntegrantes] = useState<IntegranteBanda[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorPersistencia, setErrorPersistencia] = useState("");

  const repositorio = useMemo(
    () => (bandaId === null ? null : crearRepositorioIntegrantesSupabase(bandaId)),
    [bandaId]
  );

  // Al cambiar de banda se descartan los nombres anteriores antes de cargar los nuevos
  useEffect(() => {
    let activo = true;

    setIntegrantes([]);
    setErrorPersistencia("");

    if (repositorio === null) {
      setCargando(false);
      return;
    }

    setCargando(true);

    async function cargar(repositorioBanda: NonNullable<typeof repositorio>) {
      try {
        const lista = await repositorioBanda.listar();

        // Una respuesta de una banda anterior no sobrescribe la actual
        if (activo) {
          setIntegrantes(lista);
        }
      } catch {
        if (activo) {
          setErrorPersistencia("No se han podido cargar los nombres de la banda");
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

  const nombresPorUsuario = useMemo(
    () =>
      integrantes.reduce<Record<string, string>>((nombres, { usuarioId, nombreVisible }) => {
        if (nombreVisible !== null) {
          nombres[usuarioId] = nombreVisible;
        }

        return nombres;
      }, {}),
    [integrantes]
  );

  return (
    <IntegrantesContext.Provider
      value={{ integrantes, nombresPorUsuario, cargando, errorPersistencia }}
    >
      {children}
    </IntegrantesContext.Provider>
  );
}

export function useIntegrantesContext() {
  const context = useContext(IntegrantesContext);

  if (context === null) {
    throw new Error("useIntegrantesContext debe usarse dentro de IntegrantesProvider");
  }

  return context;
}
