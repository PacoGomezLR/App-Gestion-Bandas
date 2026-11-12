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

import { leerBytesArchivo } from "../services/archivos";
import { ErrorRepositorio } from "../services/supabase/errores";
import { crearRepositorioLogoBandaSupabase, type DatosLogo } from "../services/supabase/logoBanda";
import { ESCALA_LOGO } from "../utils/escalaLogo";
import { type ImagenElegida, mimeDeLogo } from "../utils/formatoLogo";
import { useBandaContext } from "./BandaContext";

// 2 MB, igual que el límite del bucket: se avisa antes de subir
export const TAMANO_MAXIMO_LOGO = 2 * 1024 * 1024;

const SIN_LOGO: DatosLogo = { ruta: null, escala: ESCALA_LOGO.defecto };

// Un problema de la imagen elegida: su mensaje es el que ve el usuario
class ErrorImagenLogo extends Error {}

export interface CambioLogoPendiente {
  // Solo si se ha elegido otra imagen
  imagen?: ImagenElegida;
  escala: number;
}

interface LogoBandaContextValue {
  // URL pública del logo o null si la banda no tiene (o no se ha podido leer)
  url: string | null;
  // Escala guardada para toda la banda
  escala: number;
  procesando: boolean;
  errorOperacion: string;
  guardarLogo: (cambio: CambioLogoPendiente) => Promise<boolean>;
  quitarLogo: () => Promise<boolean>;
  limpiarErrorOperacion: () => void;
}

const LogoBandaContext = createContext<LogoBandaContextValue | null>(null);

// Logo de la banda actual: lo pinta el Calendario y lo gestiona el admin en Banda.
// Leerlo nunca rompe nada: si falla (por ejemplo, sin la migración 012), no hay logo
export function LogoBandaProvider({ children }: PropsWithChildren) {
  const { bandaActual, esAdmin } = useBandaContext();
  const bandaId = bandaActual?.id ?? null;
  const repositorio = useMemo(
    () => (bandaId === null ? null : crearRepositorioLogoBandaSupabase(bandaId)),
    [bandaId]
  );

  const [datos, setDatos] = useState<DatosLogo>(SIN_LOGO);
  const [procesando, setProcesando] = useState(false);
  const [errorOperacion, setErrorOperacion] = useState("");
  const operacionEnCursoRef = useRef(false);

  useEffect(() => {
    // Otra banda: nada del logo anterior se queda a la vista
    setDatos(SIN_LOGO);
    setErrorOperacion("");

    if (repositorio === null) {
      return;
    }

    let vigente = true;

    repositorio
      .obtener()
      .then((leidos) => {
        if (vigente) {
          setDatos(leidos);
        }
      })
      .catch(() => {
        // Sin logo: es un adorno, no un dato del que dependa nada
      });

    return () => {
      vigente = false;
    };
  }, [repositorio]);

  const ejecutar = useCallback(
    async (operacion: () => Promise<DatosLogo>, mensaje: string) => {
      // Segunda barrera: la pantalla ya no ofrece la acción y la base la rechaza.
      // La ref bloquea un segundo toque antes de que la interfaz se actualice
      if (repositorio === null || !esAdmin || operacionEnCursoRef.current) {
        return false;
      }

      operacionEnCursoRef.current = true;
      setProcesando(true);
      setErrorOperacion("");

      try {
        setDatos(await operacion());
        return true;
      } catch (error) {
        if (error instanceof ErrorImagenLogo) {
          setErrorOperacion(error.message);
          return false;
        }

        // Los fallos de Supabase ya los registra el repositorio; el resto (por
        // ejemplo, leer el archivo) se registra aquí. Solo en desarrollo
        if (__DEV__ && !(error instanceof ErrorRepositorio)) {
          const { name, message } = error instanceof Error ? error : { name: "", message: String(error) };
          console.error("[Logo de la banda] Falla al preparar la imagen:", { name, message });
        }

        // Si falla, el logo y la escala de antes siguen tal cual
        setErrorOperacion(mensaje);
        return false;
      } finally {
        operacionEnCursoRef.current = false;
        setProcesando(false);
      }
    },
    [repositorio, esAdmin]
  );

  // Solo aquí se toca Supabase: elegir una imagen o mover el tamaño es un borrador
  const guardarLogo = useCallback(
    ({ imagen, escala }: CambioLogoPendiente) =>
      ejecutar(async () => {
        if (repositorio === null) {
          return SIN_LOGO;
        }

        if (imagen === undefined) {
          return repositorio.guardar({ escala }, datos.ruta);
        }

        const mime = mimeDeLogo(imagen);

        if (mime === null) {
          throw new ErrorImagenLogo("Formato no admitido: elige una imagen PNG, JPG o WebP");
        }

        // El archivo original, tal cual: un PNG transparente se sube como PNG
        const bytes = await leerBytesArchivo(imagen.uri);

        if (bytes.byteLength > TAMANO_MAXIMO_LOGO) {
          throw new ErrorImagenLogo("La imagen es demasiado grande: el máximo son 2 MB");
        }

        return repositorio.guardar({ imagen: { bytes, mime }, escala }, datos.ruta);
      }, "No se ha podido guardar el logo"),
    [ejecutar, repositorio, datos.ruta]
  );

  const quitarLogo = useCallback(
    () =>
      ejecutar(async () => {
        await repositorio?.quitar(datos.ruta);
        return SIN_LOGO;
      }, "No se ha podido quitar el logo"),
    [ejecutar, repositorio, datos.ruta]
  );

  const limpiarErrorOperacion = useCallback(() => setErrorOperacion(""), []);

  const url = datos.ruta === null || repositorio === null ? null : repositorio.urlPublica(datos.ruta);

  return (
    <LogoBandaContext.Provider
      value={{
        url,
        escala: datos.escala,
        procesando,
        errorOperacion,
        guardarLogo,
        quitarLogo,
        limpiarErrorOperacion,
      }}
    >
      {children}
    </LogoBandaContext.Provider>
  );
}

export function useLogoBandaContext() {
  const context = useContext(LogoBandaContext);

  if (!context) {
    throw new Error("useLogoBandaContext debe usarse dentro de LogoBandaProvider");
  }

  return context;
}
