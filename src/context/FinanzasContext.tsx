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

import { ErrorRepositorio, esErrorEnUso } from "../services/supabase/errores";
import {
  crearRepositorioFinanzasSupabase,
  type RepositorioFinanzas,
} from "../services/supabase/finanzas";
import type { DatosMovimiento, MovimientoFinanciero } from "../types/finanzas";
import {
  calcularBote,
  calcularGastos,
  calcularIngresos,
  ordenarMovimientos,
} from "../utils/finanzas";
import { useBandaContext } from "./BandaContext";

interface FinanzasContextValue {
  movimientos: MovimientoFinanciero[];
  cargando: boolean;
  // Fallo al cargar: con él, los totales no son reales y no se deben mostrar
  error: string;
  // Fallo de la última escritura: no afecta a lo ya cargado
  errorOperacion: string;
  procesando: boolean;
  crearMovimiento: (datos: DatosMovimiento) => Promise<boolean>;
  editarMovimiento: (id: string, datos: DatosMovimiento) => Promise<boolean>;
  eliminarMovimiento: (id: string) => Promise<boolean>;
  recargar: () => Promise<void>;
  limpiarErrorOperacion: () => void;
  // Derivados de movimientos: no hay un estado aparte que se pueda desincronizar
  boteActualCentimos: number;
  ingresosTotalesCentimos: number;
  gastosTotalesCentimos: number;
}

const FinanzasContext = createContext<FinanzasContextValue | null>(null);

function mensajeDeFallo(fallo: unknown, mensajeGeneral: string): string {
  // La clave foránea rechazó el evento: otro dispositivo lo ha borrado
  if (esErrorEnUso(fallo)) {
    return "El evento relacionado ya no existe";
  }

  if (fallo instanceof ErrorRepositorio && fallo.motivo === "sin_permiso") {
    return "Solo un administrador de la banda puede gestionar las finanzas";
  }

  return mensajeGeneral;
}

// Se monta solo mientras Finanzas está abierta, y sin ser admin no hay
// repositorio: ni se consulta ni queda nada en memoria. Al entrar siempre se
// leen los datos actuales. La última barrera es la RLS del servidor.
export function FinanzasProvider({ children }: PropsWithChildren) {
  const { bandaActual, esAdmin } = useBandaContext();
  const bandaId = bandaActual?.id ?? null;

  const [movimientos, setMovimientos] = useState<MovimientoFinanciero[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [errorOperacion, setErrorOperacion] = useState("");
  const [procesando, setProcesando] = useState(false);
  // La ref bloquea de inmediato; el estado solo sirve para que la interfaz se actualice
  const operacionEnCursoRef = useRef(false);
  // Solo vale la respuesta de la última carga pedida
  const cargaActualRef = useRef(0);

  const repositorio = useMemo(
    () => (bandaId === null || !esAdmin ? null : crearRepositorioFinanzasSupabase(bandaId)),
    [bandaId, esAdmin]
  );

  const recargar = useCallback(async () => {
    cargaActualRef.current += 1;
    const carga = cargaActualRef.current;

    setError("");

    if (repositorio === null) {
      setMovimientos([]);
      setCargando(false);
      return;
    }

    setCargando(true);

    try {
      const lista = await repositorio.listar();

      if (carga === cargaActualRef.current) {
        setMovimientos(ordenarMovimientos(lista));
      }
    } catch {
      if (carga === cargaActualRef.current) {
        setMovimientos([]);
        setError("No se han podido cargar los movimientos");
      }
    } finally {
      if (carga === cargaActualRef.current) {
        setCargando(false);
      }
    }
  }, [repositorio]);

  // Al cambiar de banda se descartan los movimientos anteriores antes de cargar los nuevos
  useEffect(() => {
    setMovimientos([]);
    setErrorOperacion("");
    void recargar();

    return () => {
      cargaActualRef.current += 1;
    };
  }, [recargar]);

  // Primero se persiste; el estado local solo cambia si la base lo confirma
  async function ejecutar(
    mensajeGeneral: string,
    operacion: (repositorioBanda: RepositorioFinanzas) => Promise<void>
  ): Promise<boolean> {
    if (operacionEnCursoRef.current) {
      return false;
    }

    if (repositorio === null) {
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

  function crearMovimiento(datos: DatosMovimiento) {
    return ejecutar("No se ha podido guardar el movimiento", async (repositorioBanda) => {
      const creado = await repositorioBanda.crear(datos);

      setMovimientos((actuales) => ordenarMovimientos([...actuales, creado]));
    });
  }

  function editarMovimiento(id: string, datos: DatosMovimiento) {
    return ejecutar("No se han podido guardar los cambios", async (repositorioBanda) => {
      const editado = await repositorioBanda.actualizar(id, datos);

      setMovimientos((actuales) =>
        ordenarMovimientos(
          actuales.map((movimiento) => (movimiento.id === id ? editado : movimiento))
        )
      );
    });
  }

  function eliminarMovimiento(id: string) {
    return ejecutar("No se ha podido eliminar el movimiento", async (repositorioBanda) => {
      await repositorioBanda.eliminar(id);

      setMovimientos((actuales) => actuales.filter((movimiento) => movimiento.id !== id));
    });
  }

  const limpiarErrorOperacion = useCallback(() => setErrorOperacion(""), []);

  const totales = useMemo(
    () => ({
      boteActualCentimos: calcularBote(movimientos),
      ingresosTotalesCentimos: calcularIngresos(movimientos),
      gastosTotalesCentimos: calcularGastos(movimientos),
    }),
    [movimientos]
  );

  return (
    <FinanzasContext.Provider
      value={{
        movimientos,
        cargando,
        error,
        errorOperacion,
        procesando,
        crearMovimiento,
        editarMovimiento,
        eliminarMovimiento,
        recargar,
        limpiarErrorOperacion,
        ...totales,
      }}
    >
      {children}
    </FinanzasContext.Provider>
  );
}

export function useFinanzasContext() {
  const context = useContext(FinanzasContext);

  if (context === null) {
    throw new Error("useFinanzasContext debe usarse dentro de FinanzasProvider");
  }

  return context;
}
