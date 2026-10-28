import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase";
import type { Banda, PertenenciaBanda } from "../types/banda";
import type { RolUsuario } from "../types/usuario";
import { useAuthContext } from "./AuthContext";

interface BandaContextValue {
  bandas: Banda[];
  bandaActual: Banda | null;
  pertenenciaActual: PertenenciaBanda | null;
  cargando: boolean;
  // Fallo al cargar las bandas: no se ofrece crear otra para no duplicarla
  errorCarga: string;
  error: string;
  // Admin de la banda actual, no global. Dato interno: no se muestra
  esAdmin: boolean;
  crearBanda: (nombre: string) => Promise<boolean>;
  seleccionarBanda: (id: string) => void;
  recargarBandas: () => Promise<void>;
}

interface DatosBandas {
  bandas: Banda[];
  pertenencias: PertenenciaBanda[];
}

const BandaContext = createContext<BandaContextValue | null>(null);

const ROLES_USUARIO: Record<RolUsuario, true> = {
  admin: true,
  usuario: true,
};

// Pertenencias del usuario con su banda embebida (relación banda_id → bandas)
const CONSULTA_PERTENENCIAS =
  "banda_id, usuario_id, rol, created_at, bandas (id, nombre, creada_por, created_at)";

function esRolUsuario(valor: unknown): valor is RolUsuario {
  return (
    typeof valor === "string" &&
    Object.prototype.hasOwnProperty.call(ROLES_USUARIO, valor)
  );
}

function convertirBanda(valor: unknown): Banda | null {
  if (typeof valor !== "object" || valor === null) {
    return null;
  }

  const { id, nombre, creada_por, created_at } = valor as Record<string, unknown>;

  if (
    typeof id !== "string" ||
    typeof nombre !== "string" ||
    typeof creada_por !== "string" ||
    typeof created_at !== "string"
  ) {
    return null;
  }

  return { id, nombre, creadaPor: creada_por, creadaEn: created_at };
}

// La respuesta de Supabase no está tipada: cualquier fila incorrecta invalida la carga
export function convertirFilasPertenencias(filas: unknown): DatosBandas {
  if (!Array.isArray(filas)) {
    throw new Error("Respuesta de bandas no válida");
  }

  const datos = filas.map((fila: unknown) => {
    if (typeof fila !== "object" || fila === null) {
      throw new Error("Pertenencia no válida");
    }

    const { banda_id, usuario_id, rol, created_at, bandas } =
      fila as Record<string, unknown>;
    const banda = convertirBanda(bandas);

    if (
      typeof banda_id !== "string" ||
      typeof usuario_id !== "string" ||
      typeof created_at !== "string" ||
      !esRolUsuario(rol) ||
      banda === null ||
      banda.id !== banda_id
    ) {
      throw new Error("Pertenencia no válida");
    }

    const pertenencia: PertenenciaBanda = {
      bandaId: banda_id,
      usuarioId: usuario_id,
      rol,
      creadaEn: created_at,
    };

    return { banda, pertenencia };
  });

  // Orden determinista: la pertenencia más antigua primero
  datos.sort(
    (a, b) =>
      a.pertenencia.creadaEn.localeCompare(b.pertenencia.creadaEn) ||
      a.banda.id.localeCompare(b.banda.id)
  );

  return {
    bandas: datos.map(({ banda }) => banda),
    pertenencias: datos.map(({ pertenencia }) => pertenencia),
  };
}

async function consultarBandas(usuarioId: string): Promise<DatosBandas> {
  const { data, error } = await supabase
    .from("banda_usuarios")
    .select(CONSULTA_PERTENENCIAS)
    .eq("usuario_id", usuarioId);

  if (error) {
    throw new Error(error.message);
  }

  return convertirFilasPertenencias(data);
}

export function BandaProvider({ children }: PropsWithChildren) {
  const { usuario } = useAuthContext();
  const usuarioId = usuario?.id ?? null;

  const [bandas, setBandas] = useState<Banda[]>([]);
  const [pertenencias, setPertenencias] = useState<PertenenciaBanda[]>([]);
  const [bandaSeleccionadaId, setBandaSeleccionadaId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [error, setError] = useState("");

  const aplicarDatos = useCallback((datos: DatosBandas) => {
    setBandas(datos.bandas);
    setPertenencias(datos.pertenencias);
    setErrorCarga("");
  }, []);

  useEffect(() => {
    if (usuarioId === null) {
      setBandas([]);
      setPertenencias([]);
      setCargando(false);
      return;
    }

    let activo = true;
    setCargando(true);

    consultarBandas(usuarioId)
      .then((datos) => {
        if (activo) {
          aplicarDatos(datos);
        }
      })
      .catch(() => {
        if (activo) {
          setErrorCarga("No se han podido cargar las bandas");
        }
      })
      .finally(() => {
        if (activo) {
          setCargando(false);
        }
      });

    return () => {
      activo = false;
    };
  }, [usuarioId, aplicarDatos]);

  const recargarBandas = useCallback(async () => {
    if (usuarioId === null) {
      return;
    }

    setCargando(true);

    try {
      aplicarDatos(await consultarBandas(usuarioId));
    } catch {
      setErrorCarga("No se han podido cargar las bandas");
    } finally {
      setCargando(false);
    }
  }, [usuarioId, aplicarDatos]);

  const crearBanda = useCallback(
    async (nombre: string) => {
      const nombreLimpio = nombre.trim();

      if (nombreLimpio === "") {
        setError("Escribe el nombre de la banda");
        return false;
      }

      if (usuarioId === null) {
        setError("Inicia sesión para crear una banda");
        return false;
      }

      setError("");

      try {
        // Solo la banda: el trigger de la base añade al creador como admin
        const { error: errorInsercion } = await supabase
          .from("bandas")
          .insert({ nombre: nombreLimpio, creada_por: usuarioId });

        if (errorInsercion) {
          setError("No se ha podido crear la banda");
          return false;
        }
      } catch {
        setError("No se ha podido crear la banda");
        return false;
      }

      try {
        aplicarDatos(await consultarBandas(usuarioId));
      } catch {
        // La banda existe: no se devuelve false para no invitar a crearla otra vez
        setErrorCarga("No se han podido cargar las bandas");
      }

      return true;
    },
    [usuarioId, aplicarDatos]
  );

  const seleccionarBanda = useCallback(
    (id: string) => {
      if (bandas.some((banda) => banda.id === id)) {
        setBandaSeleccionadaId(id);
      }
    },
    [bandas]
  );

  // Sin selección válida se usa la primera banda (aún no hay selector visual)
  const bandaActual =
    bandas.find((banda) => banda.id === bandaSeleccionadaId) ?? bandas[0] ?? null;

  const pertenenciaActual =
    pertenencias.find((pertenencia) => pertenencia.bandaId === bandaActual?.id) ?? null;

  return (
    <BandaContext.Provider
      value={{
        bandas,
        bandaActual,
        pertenenciaActual,
        cargando,
        errorCarga,
        error,
        esAdmin: pertenenciaActual?.rol === "admin",
        crearBanda,
        seleccionarBanda,
        recargarBandas,
      }}
    >
      {children}
    </BandaContext.Provider>
  );
}

export function useBandaContext() {
  const context = useContext(BandaContext);

  if (!context) {
    throw new Error("useBandaContext debe usarse dentro de BandaProvider");
  }

  return context;
}
