// Web (Safari, también instalada en la pantalla de inicio): expo-file-system no
// funciona en el navegador. expo-image-picker devuelve una URI blob: del archivo
// elegido y el navegador la lee con fetch. Mismos bytes originales, sin
// decodificar ni recomprimir: un PNG transparente llega igual.
// Si no se puede leer, lanza un Error: quien llama no sube nada y deja el logo
// y el borrador como estaban (ver LogoBandaContext). La URI no se registra.
export async function leerBytesArchivo(uri: string): Promise<ArrayBuffer> {
  const respuesta = await fetch(uri);

  if (!respuesta.ok) {
    throw new Error(`No se ha podido leer el archivo (HTTP ${respuesta.status})`);
  }

  return respuesta.arrayBuffer();
}
