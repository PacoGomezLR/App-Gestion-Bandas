import { supabase } from "../../lib/supabase";
import { ajustarEscalaLogo, ESCALA_LOGO } from "../../utils/escalaLogo";
import { extensionDeLogo, type MimeLogo } from "../../utils/formatoLogo";
import { convertirErrorSupabase, ErrorRepositorio } from "./errores";

// Logo de una banda: el archivo en Storage (bucket logos-bandas, carpeta de la
// banda), su ruta en bandas.logo_path (012) y su escala de visualización en
// bandas.logo_scale (013). La lectura es aparte de la carga de bandas: si falta
// alguna columna, la app sigue igual (sin logo, o con escala 1).

export const BUCKET_LOGOS = "logos-bandas";

export interface DatosLogo {
  // null = la banda no tiene logo
  ruta: string | null;
  escala: number;
}

export interface ArchivoLogo {
  bytes: ArrayBuffer;
  mime: MimeLogo;
}

export interface CambioLogo {
  // Solo si se ha elegido otra imagen: cambiar únicamente el tamaño no la vuelve a subir
  imagen?: ArchivoLogo;
  escala: number;
}

export interface RepositorioLogoBanda {
  obtener: () => Promise<DatosLogo>;
  urlPublica: (ruta: string) => string;
  // Guarda imagen (si la hay) y escala de una vez; devuelve cómo ha quedado
  guardar: (cambio: CambioLogo, rutaAnterior: string | null) => Promise<DatosLogo>;
  quitar: (rutaAnterior: string | null) => Promise<void>;
}

type PasoLogo = "leer" | "subir" | "guardar";

// Solo en desarrollo: el motivo técnico en Metro (el usuario ve un mensaje
// amable). Únicamente campos de diagnóstico: nunca la URL, tokens ni la imagen
function registrarErrorTecnico(paso: PasoLogo, error: unknown) {
  if (!__DEV__) {
    return;
  }

  const { name, message, code, statusCode, error: tipo } = (error ?? {}) as Record<string, unknown>;

  console.error(`[Logo de la banda] Falla al ${paso}:`, { name, message, code, statusCode, error: tipo });
}

// Un nombre nuevo en cada cambio: ninguna caché enseña el logo anterior. La
// extensión, la de su formato real
function rutaNueva(bandaId: string, mime: MimeLogo): string {
  return `${bandaId}/logo-${Date.now()}.${extensionDeLogo(mime)}`;
}

// Borrar el archivo viejo es limpieza: si falla, el logo ya ha cambiado
async function borrarArchivo(ruta: string | null) {
  if (ruta === null) {
    return;
  }

  try {
    await supabase.storage.from(BUCKET_LOGOS).remove([ruta]);
  } catch {
    // Sin consecuencias para la banda: solo queda un archivo huérfano
  }
}

function convertirDatos(fila: unknown): DatosLogo {
  const { logo_path: ruta, logo_scale: escala } = (fila ?? {}) as Record<string, unknown>;

  return {
    ruta: typeof ruta === "string" && ruta !== "" ? ruta : null,
    // numeric llega como número o como texto; sin columna (antes de la 013), 1
    escala: escala === undefined || escala === null ? ESCALA_LOGO.defecto : ajustarEscalaLogo(Number(escala)),
  };
}

// ¿Falta la columna de la escala? (la 013 todavía no se ha ejecutado)
function faltaColumnaEscala(error: { code?: string; message?: string }): boolean {
  return error.code === "42703" && (error.message ?? "").includes("logo_scale");
}

export function crearRepositorioLogoBandaSupabase(bandaId: string): RepositorioLogoBanda {
  // Una sola escritura con todo: la banda nunca queda a medias (ruta nueva con
  // escala vieja o al revés)
  async function escribir(cambios: { logo_path?: string | null; logo_scale: number }) {
    const { data, error } = await supabase
      .from("bandas")
      .update(cambios)
      .eq("id", bandaId)
      .select("logo_path, logo_scale");

    if (error) {
      registrarErrorTecnico("guardar", error);
      throw convertirErrorSupabase(error);
    }

    // Una escritura que la RLS descarta no da error: no devuelve filas
    if (!Array.isArray(data) || data.length === 0) {
      registrarErrorTecnico("guardar", { message: "La RLS no ha devuelto la banda (¿no es admin?)" });
      throw new ErrorRepositorio("sin_permiso");
    }

    return convertirDatos(data[0]);
  }

  return {
    async obtener() {
      const { data, error } = await supabase
        .from("bandas")
        .select("logo_path, logo_scale")
        .eq("id", bandaId)
        .maybeSingle();

      if (!error) {
        return convertirDatos(data);
      }

      // Con la 012 pero sin la 013: el logo se sigue viendo, a tamaño normal
      if (faltaColumnaEscala(error)) {
        registrarErrorTecnico("leer", error);

        const sinEscala = await supabase
          .from("bandas")
          .select("logo_path")
          .eq("id", bandaId)
          .maybeSingle();

        if (!sinEscala.error) {
          return convertirDatos(sinEscala.data);
        }

        registrarErrorTecnico("leer", sinEscala.error);
        throw convertirErrorSupabase(sinEscala.error);
      }

      registrarErrorTecnico("leer", error);
      throw convertirErrorSupabase(error);
    },

    urlPublica(ruta: string) {
      return supabase.storage.from(BUCKET_LOGOS).getPublicUrl(ruta).data.publicUrl;
    },

    async guardar({ imagen, escala }: CambioLogo, rutaAnterior: string | null) {
      const escalaGuardada = ajustarEscalaLogo(escala);

      // Solo el tamaño: ni se sube ni se borra ningún archivo
      if (imagen === undefined) {
        return escribir({ logo_scale: escalaGuardada });
      }

      const ruta = rutaNueva(bandaId, imagen.mime);
      // Los bytes tal cual, con su tipo: un PNG transparente llega como PNG
      const { error: errorSubida } = await supabase.storage
        .from(BUCKET_LOGOS)
        .upload(ruta, imagen.bytes, { contentType: imagen.mime, upsert: false });

      // Sin bucket, sin permiso, demasiado grande o sin red: para el usuario es
      // lo mismo; el motivo exacto queda en Metro
      if (errorSubida) {
        registrarErrorTecnico("subir", errorSubida);
        throw new ErrorRepositorio("desconocido");
      }

      let guardado: DatosLogo;

      try {
        guardado = await escribir({ logo_path: ruta, logo_scale: escalaGuardada });
      } catch (error) {
        // La banda sigue con su logo y su escala de antes: el archivo nuevo sobra
        await borrarArchivo(ruta);
        throw error;
      }

      await borrarArchivo(rutaAnterior);

      return guardado;
    },

    async quitar(rutaAnterior: string | null) {
      // Sin logo, la escala vuelve a la normal para el próximo
      await escribir({ logo_path: null, logo_scale: ESCALA_LOGO.defecto });
      await borrarArchivo(rutaAnterior);
    },
  };
}
