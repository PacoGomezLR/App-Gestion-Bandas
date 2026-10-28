import type { NativeIntent } from "expo-router";

import { esEnlaceCallbackAuth } from "@/lib/auth-deep-link";

// El enlace de confirmación no es una pantalla: AuthContext lo procesa y AppAuthGate decide.
// Aquí solo se evita que el router busque una ruta /auth/callback inexistente.
export const redirectSystemPath: NativeIntent["redirectSystemPath"] = ({ path, initial }) => {
  try {
    if (esEnlaceCallbackAuth(path)) {
      // Al abrir la app se empieza en el inicio; con la app abierta no se cambia de pantalla
      return initial ? "/" : null;
    }

    return path;
  } catch {
    return "/";
  }
};
