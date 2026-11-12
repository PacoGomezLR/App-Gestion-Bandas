/**
 * Identidad visual de MI Banda: un único tema oscuro, sin modo claro.
 * Toda la app toma sus colores de aquí (a través de useTheme): ninguna pantalla
 * debe escribir un color propio.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colores = {
  // Superficies, de la más profunda a la más elevada. La profundidad sale del
  // contraste entre ellas y de los bordes, no de sombras
  background: '#0B0D0F',
  // Superficie: tarjetas, listas y campos
  backgroundElement: '#14181C',
  // Superficie elevada: pulsado, elegido y fondos de apoyo
  backgroundSelected: '#1A2025',
  // Bordes de tarjetas y campos, y separadores de listas
  border: '#2A3238',
  // Borde más marcado: tarjetas que deben despegarse del fondo (eventos)
  borderStrong: '#353F46',

  text: '#F4F6F7',
  textSecondary: '#9DA7AE',
  // Placeholders y datos muy secundarios. Algo más claro que #6F7A82, que
  // sobre una superficie no llegaba a 4,5:1
  textMuted: '#7E8990',
  // Solo días de otros meses en el calendario (no son contenido, AA no aplica)
  textDisabled: '#4B565E',

  // Azul petróleo. Rellenos (botón principal, día elegido), foco, bordes e
  // indicadores. Un poco más oscuro que #2F8A9A para que el texto claro encima
  // pase de 4,5:1
  primary: '#27798A',
  // Acento sobre fondo oscuro: textos, enlaces e iconos activos o elegidos
  primaryPressed: '#3DA4B5',
  // Fondo de lo elegido, sin una masa de color
  primarySoft: '#17353B',
  onPrimary: '#F4F6F7',

  // Algo más claro que #D65A57: así pasa de 4,5:1 también sobre la superficie
  // elevada (Eliminar evento dentro de la tarjeta)
  error: '#DA625F',
  errorBackground: '#251413',
  info: '#6CC0CE',
  infoBackground: '#17353B',
  // Estados de evento: color + texto, nunca solo color
  success: '#4FA36C',
  successBackground: '#142A1B',
  warning: '#D39A43',
  warningBackground: '#33270F',
  // Algún integrante no disponible: naranja propio, distinto del estado Pendiente
  conflict: '#E58A5C',
  conflictBackground: '#35200F',
} as const;

export type ColoresTema = typeof Colores;
export type ThemeColor = keyof ColoresTema;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
