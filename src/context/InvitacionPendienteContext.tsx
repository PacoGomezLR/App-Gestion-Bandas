import * as Linking from "expo-linking";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { extraerTokenInvitacion } from "../lib/invitacion-deep-link";

interface InvitacionPendienteContextValue {
  // Token del último enlace de invitación abierto, o null
  tokenPendiente: string | null;
  // Rechazar, terminar o descartar: la invitación deja de estar pendiente
  descartarInvitacion: () => void;
}

const InvitacionPendienteContext = createContext<InvitacionPendienteContextValue | null>(null);

// Recuerda la invitación abierta mientras la persona entra, crea su cuenta o
// confirma el correo (el enlace de confirmación vuelve a la misma app abierta).
// Solo en memoria: el token da acceso a una banda y nunca se guarda en disco.
// Si el sistema cierra la app antes de terminar, basta con abrir otra vez el enlace.
// Va fuera de AuthProvider: el enlace puede llegar antes de haber sesión.
export function InvitacionPendienteProvider({ children }: PropsWithChildren) {
  const [tokenPendiente, setTokenPendiente] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    function recibir(url: string | null) {
      const token = url === null ? null : extraerTokenInvitacion(url);

      // Los demás enlaces (por ejemplo auth/callback) no son cosa de este contexto
      if (activo && token !== null) {
        setTokenPendiente(token);
      }
    }

    // Con la app cerrada (URL inicial) o ya abierta (evento)
    Linking.getInitialURL()
      .then(recibir)
      .catch(() => {
        // Sin URL inicial legible no hay invitación
      });

    const suscripcion = Linking.addEventListener("url", ({ url }) => recibir(url));

    return () => {
      activo = false;
      suscripcion.remove();
    };
  }, []);

  const descartarInvitacion = useCallback(() => setTokenPendiente(null), []);

  return (
    <InvitacionPendienteContext.Provider value={{ tokenPendiente, descartarInvitacion }}>
      {children}
    </InvitacionPendienteContext.Provider>
  );
}

export function useInvitacionPendiente() {
  const context = useContext(InvitacionPendienteContext);

  if (context === null) {
    throw new Error("useInvitacionPendiente debe usarse dentro de InvitacionPendienteProvider");
  }

  return context;
}
