import { DarkTheme, type Theme } from 'expo-router';

import { Colores } from '@/constants/theme';

// Tema de los contenedores de navegación: el mismo fondo que las pantallas, para
// que ninguna transición ni carga deje ver el blanco por defecto
export const TemaNavegacion: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colores.primaryPressed,
    background: Colores.background,
    card: Colores.background,
    text: Colores.text,
    border: Colores.border,
    notification: Colores.error,
  },
};
