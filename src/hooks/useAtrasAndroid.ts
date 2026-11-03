import { useEffect, useRef } from "react";
import { BackHandler, Platform } from "react-native";

// Botón o gesto Atrás de Android para estados internos de una pantalla
// (vistas, paneles) que no son rutas de Expo Router.
//   accion = null → no se intercepta: Android / Expo hacen lo de siempre
//   accion = fn   → se ejecuta y Atrás no sigue (no sale de la app)
// En iOS y web no hace nada: allí solo existen los botones visibles.
export function useAtrasAndroid(accion: (() => void) | null) {
  // Siempre la última acción, sin volver a suscribirse en cada render
  const accionRef = useRef(accion);
  accionRef.current = accion;

  const interceptar = accion !== null;

  useEffect(() => {
    if (Platform.OS !== "android" || !interceptar) {
      return;
    }

    const suscripcion = BackHandler.addEventListener("hardwareBackPress", () => {
      const accionActual = accionRef.current;

      if (accionActual === null) {
        return false;
      }

      accionActual();
      return true;
    });

    return () => suscripcion.remove();
  }, [interceptar]);
}
