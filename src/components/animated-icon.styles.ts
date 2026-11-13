import { StyleSheet } from 'react-native';

import { Colores } from '@/constants/theme';

// Igual que el splash nativo (app.json: expo-splash-screen imageWidth 120):
// splash-icon.png mide 984x574, así que a 120 de ancho son 70 de alto
export const TAMANO_LOGO_SPLASH = { width: 120, height: 70 } as const;

export const styles = StyleSheet.create({
  image: TAMANO_LOGO_SPLASH,
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    // Igual que el splash nativo y la app: sin destello de otro color al arrancar
    backgroundColor: Colores.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
});
