import "react-native-url-polyfill/auto";
import "expo-sqlite/localStorage/install";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { CLAVE_PUBLICABLE_SUPABASE, URL_SUPABASE } from "../config/entornoSupabase";
import { obtenerConfiguracionSupabase } from "../config/supabase";

const configuracion = obtenerConfiguracionSupabase(URL_SUPABASE, CLAVE_PUBLICABLE_SUPABASE);

// App: el localStorage de expo-sqlite (instalado arriba). Navegador: el suyo.
// Export web estático (Node, sin navegador): no existe y supabase-js usa memoria
// solo durante ese render; ahí no hay sesión que guardar.
const almacenamientoSesion = typeof localStorage === "undefined" ? undefined : localStorage;

// La sesión se guarda en el localStorage de expo-sqlite; no hay almacenamiento propio de tokens.
// Las invitaciones van por RPC de la base (006): la app nunca escribe esas tablas.
export const supabase: SupabaseClient = createClient(
  configuracion.url,
  configuracion.publishableKey,
  {
    auth: {
      storage: almacenamientoSesion,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
