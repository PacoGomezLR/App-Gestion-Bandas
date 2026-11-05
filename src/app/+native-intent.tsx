import type { NativeIntent } from "expo-router";

import { esEnlaceCallbackAuth } from "@/lib/auth-deep-link";
import { esRutaSistemaInvitacion } from "@/lib/invitacion-deep-link";

// Ni el enlace de confirmación ni el de invitación son pantallas: AuthContext
// procesa el primero, InvitacionPendienteContext guarda el segundo y AppAuthGate
// decide qué mostrar. Aquí solo se evita que el router busque rutas
// /auth/callback o /invitacion inexistentes (también con https://dominio/invitacion).
export const redirectSystemPath: NativeIntent["redirectSystemPath"] = ({ path, initial }) => {
  try {
    if (esEnlaceCallbackAuth(path) || esRutaSistemaInvitacion(path)) {
      // Al abrir la app se empieza en el inicio; con la app abierta no se cambia de pantalla
      return initial ? "/" : null;
    }

    return path;
  } catch {
    return "/";
  }
};
