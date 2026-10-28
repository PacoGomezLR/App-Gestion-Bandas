import "react-native-url-polyfill/auto";
import "expo-sqlite/localStorage/install";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { obtenerConfiguracionSupabase } from "../config/supabase";

// Acceso directo a process.env.EXPO_PUBLIC_*: Expo solo sustituye este patrón al compilar
const configuracion = obtenerConfiguracionSupabase(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

// La sesión se guarda en el localStorage de expo-sqlite; no hay almacenamiento propio de tokens.
// Las invitaciones se implementarán mediante una función de servidor, nunca desde la app.
export const supabase: SupabaseClient = createClient(
  configuracion.url,
  configuracion.publishableKey,
  {
    auth: {
      storage: localStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
