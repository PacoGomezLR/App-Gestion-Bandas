import { supabase } from "../../lib/supabase";
import { convertirErrorSupabase, ErrorRepositorio } from "./errores";

// Solo para cuentas creadas antes de pedir el nombre en el registro.
// La RLS de 004 solo deja actualizar el perfil propio (id = auth.uid()) y el
// permiso de columna solo nombre_visible: también un admin está limitado al suyo.
export async function guardarNombreVisiblePropio(
  usuarioId: string,
  nombre: string
): Promise<void> {
  const { data, error } = await supabase
    .from("perfiles")
    .update({ nombre_visible: nombre })
    .eq("id", usuarioId)
    .select("nombre_visible");

  if (error) {
    throw convertirErrorSupabase(error);
  }

  // Una escritura que la RLS descarta no da error: simplemente no devuelve filas
  if (!Array.isArray(data) || data.length === 0) {
    throw new ErrorRepositorio("sin_permiso");
  }
}
