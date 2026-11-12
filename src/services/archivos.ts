import { File } from "expo-file-system";

// Los bytes originales de un archivo local (file:// del selector de imágenes),
// sin decodificar ni recomprimir. Igual en Android e iOS
export async function leerBytesArchivo(uri: string): Promise<ArrayBuffer> {
  return new File(uri).arrayBuffer();
}
