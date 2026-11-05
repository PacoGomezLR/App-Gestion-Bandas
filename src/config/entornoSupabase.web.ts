// Web: solo la página de respaldo de las invitaciones, que no usa Supabase.
// Sin estos valores el export web no incluye la URL ni la clave del proyecto
// (Expo Router empaqueta también las rutas de la app aunque en web no se usen).
export const URL_SUPABASE: string | undefined = undefined;
export const CLAVE_PUBLICABLE_SUPABASE: string | undefined = undefined;
