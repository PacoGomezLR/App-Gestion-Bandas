// Las mismas reglas que la check de perfiles.nombre_visible (004) y que el
// trigger de registro (005): recortado y entre 2 y 80 caracteres.
export const LONGITUD_MINIMA_NOMBRE = 2;
export const LONGITUD_MAXIMA_NOMBRE = 80;

export const ERROR_NOMBRE_VISIBLE = `Escribe tu nombre (entre ${LONGITUD_MINIMA_NOMBRE} y ${LONGITUD_MAXIMA_NOMBRE} caracteres)`;

// El nombre listo para guardar, o null si no es válido
export function normalizarNombreVisible(nombre: string): string | null {
  const limpio = nombre.trim();

  return limpio.length >= LONGITUD_MINIMA_NOMBRE && limpio.length <= LONGITUD_MAXIMA_NOMBRE
    ? limpio
    : null;
}
