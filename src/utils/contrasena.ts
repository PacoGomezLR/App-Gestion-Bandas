// Mínimo de Supabase Auth por defecto (el registro no añade otra regla). Si el
// proyecto exige más, Supabase lo rechaza con weak_password y se avisa igual
export const LONGITUD_MINIMA_CONTRASENA = 6;

// Nueva contraseña (recuperación): el mensaje del primer problema, o null si vale
export function validarNuevaContrasena(nueva: string, repetida: string): string | null {
  if (nueva === "" || repetida === "") {
    return "Escribe la nueva contraseña dos veces";
  }

  if (nueva.length < LONGITUD_MINIMA_CONTRASENA) {
    return `La contraseña debe tener al menos ${LONGITUD_MINIMA_CONTRASENA} caracteres`;
  }

  if (nueva !== repetida) {
    return "Las contraseñas no coinciden";
  }

  return null;
}
