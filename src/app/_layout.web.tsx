import { Slot } from "expo-router";

// Web: solo la página de respaldo de las invitaciones. Sin AuthProvider, sin
// Supabase y sin la app: la app es Android (ver _layout.tsx).
export default function LayoutWeb() {
  return <Slot />;
}
