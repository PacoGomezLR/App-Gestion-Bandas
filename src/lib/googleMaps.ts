import { Linking } from "react-native";

import { esEnlaceGoogleMapsValido } from "../utils/googleMaps";

// Abre el enlace guardado tal cual: Android o iOS deciden si va a la app de
// Google Maps o al navegador. Devuelve false si no se ha podido abrir
export async function abrirEnlaceGoogleMaps(url: string): Promise<boolean> {
  // Segunda barrera: nunca se abre algo que no sea un enlace de Google Maps
  if (url.trim() === "" || !esEnlaceGoogleMapsValido(url)) {
    return false;
  }

  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
