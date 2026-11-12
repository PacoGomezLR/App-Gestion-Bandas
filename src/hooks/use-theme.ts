import { Colores } from '@/constants/theme';

// MI Banda tiene un solo tema (oscuro): no depende del esquema del sistema
export function useTheme() {
  return Colores;
}
