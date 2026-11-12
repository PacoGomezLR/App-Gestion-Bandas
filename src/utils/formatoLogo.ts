// Formatos que admite el bucket logos-bandas (migración 012), con la extensión
// que se usa al guardarlos. El archivo se sube tal cual: un PNG sigue siendo PNG
// (con su transparencia), nunca se convierte a JPEG
export const EXTENSIONES_LOGO = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;

export type MimeLogo = keyof typeof EXTENSIONES_LOGO;

const MIME_POR_EXTENSION: Record<string, MimeLogo> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

// Lo que devuelve el selector de imágenes y nos interesa
export interface ImagenElegida {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
}

function extension(nombre: string | null | undefined): string | null {
  const coincidencia = /\.([a-z0-9]+)(?:[?#].*)?$/i.exec(nombre ?? "");

  return coincidencia === null ? null : coincidencia[1].toLowerCase();
}

// El MIME real que da el sistema; si no lo da, el de la extensión del archivo.
// null = formato que el bucket no admite (HEIC, GIF…)
export function mimeDeLogo(imagen: ImagenElegida): MimeLogo | null {
  const mime = imagen.mimeType?.trim().toLowerCase();

  if (mime) {
    const normalizado = mime === "image/jpg" ? "image/jpeg" : mime;

    return normalizado in EXTENSIONES_LOGO ? (normalizado as MimeLogo) : null;
  }

  const ext = extension(imagen.fileName) ?? extension(imagen.uri);

  return ext === null ? null : (MIME_POR_EXTENSION[ext] ?? null);
}

export function extensionDeLogo(mime: MimeLogo): string {
  return EXTENSIONES_LOGO[mime];
}
