export interface ConfiguracionSupabase {
  url: string;
  publishableKey: string;
}

// Solo URL y clave publishable: nunca una secret/service_role key en la app
export function obtenerConfiguracionSupabase(
  url: string | undefined,
  publishableKey: string | undefined
): ConfiguracionSupabase {
  const urlLimpia = url?.trim() ?? "";
  const claveLimpia = publishableKey?.trim() ?? "";

  if (urlLimpia === "" || claveLimpia === "") {
    throw new Error(
      "Supabase no está configurado: define EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env"
    );
  }

  return { url: urlLimpia, publishableKey: claveLimpia };
}
