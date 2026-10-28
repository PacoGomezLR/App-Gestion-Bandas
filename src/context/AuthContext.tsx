import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase";
import type { PerfilUsuario } from "../types/usuario";

// Supabase puede iniciar la sesión al registrar o exigir antes confirmar el correo
export type ResultadoCrearCuenta =
  | "sesion_iniciada"
  | "confirmacion_requerida"
  | "error";

interface AuthContextValue {
  session: Session | null;
  usuario: User | null;
  perfil: PerfilUsuario | null;
  cargando: boolean;
  error: string;
  iniciarSesion: (email: string, password: string) => Promise<boolean>;
  // Solo crea la cuenta: sin banda ni rol
  crearCuenta: (email: string, password: string) => Promise<ResultadoCrearCuenta>;
  cerrarSesion: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// La consulta a Supabase no está tipada: se comprueba la forma antes de usarla
function esPerfilUsuario(valor: unknown): valor is PerfilUsuario {
  if (typeof valor !== "object" || valor === null) {
    return false;
  }

  const { id, email } = valor as Record<string, unknown>;

  return typeof id === "string" && typeof email === "string";
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  // Id del usuario cuyo perfil ya se ha intentado cargar (con éxito o no)
  const [perfilResueltoId, setPerfilResueltoId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const usuario = session?.user ?? null;
  const usuarioId = usuario?.id ?? null;

  useEffect(() => {
    let activo = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (activo) {
          setSession(data.session);
        }
      })
      .catch(() => {
        if (activo) {
          setError("No se ha podido recuperar la sesión");
        }
      })
      .finally(() => {
        if (activo) {
          setCargandoSesion(false);
        }
      });

    // Sin llamadas a Supabase dentro del callback: el perfil se carga en otro efecto
    const { data } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      if (activo) {
        setSession(nuevaSesion);
      }
    });

    return () => {
      activo = false;
      data.subscription.unsubscribe();
    };
  }, []);

  // Depende solo del id: refrescar el token no vuelve a pedir el perfil
  useEffect(() => {
    if (usuarioId === null) {
      setPerfil(null);
      setPerfilResueltoId(null);
      return;
    }

    let activo = true;
    const id = usuarioId;

    async function cargarPerfil() {
      try {
        const { data, error: errorConsulta } = await supabase
          .from("perfiles")
          .select("id, email")
          .eq("id", id)
          .single();

        if (!activo) {
          return;
        }

        if (errorConsulta || !esPerfilUsuario(data)) {
          setPerfil(null);
          setError("No se ha podido cargar el perfil");
        } else {
          // Solo id y email: el rol vive en cada banda, no en el perfil
          setPerfil({ id: data.id, email: data.email });
        }
      } catch {
        if (activo) {
          setPerfil(null);
          setError("No se ha podido cargar el perfil");
        }
      } finally {
        if (activo) {
          setPerfilResueltoId(id);
        }
      }
    }

    cargarPerfil();

    return () => {
      activo = false;
    };
  }, [usuarioId]);

  const iniciarSesion = useCallback(async (email: string, password: string) => {
    setError("");

    try {
      const { error: errorAcceso } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (errorAcceso) {
        setError(
          errorAcceso.code === "invalid_credentials"
            ? "Correo o contraseña incorrectos"
            : "No se ha podido iniciar sesión"
        );
        return false;
      }

      // La sesión llega por onAuthStateChange
      return true;
    } catch {
      setError("No se ha podido iniciar sesión");
      return false;
    }
  }, []);

  const crearCuenta = useCallback(
    async (email: string, password: string): Promise<ResultadoCrearCuenta> => {
      setError("");

      try {
        // No se comprueba antes si el correo existe: eso permitiría enumerar cuentas
        const { data, error: errorRegistro } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
        });

        if (errorRegistro) {
          setError("No se ha podido crear la cuenta");
          return "error";
        }

        // La sesión llega por onAuthStateChange
        if (data.session) {
          return "sesion_iniciada";
        }

        if (data.user) {
          return "confirmacion_requerida";
        }

        setError("No se ha podido crear la cuenta");
        return "error";
      } catch {
        setError("No se ha podido crear la cuenta");
        return "error";
      }
    },
    []
  );

  const cerrarSesion = useCallback(async () => {
    setError("");

    try {
      const { error: errorSalida } = await supabase.auth.signOut();

      if (errorSalida) {
        setError("No se ha podido cerrar sesión");
      }
    } catch {
      setError("No se ha podido cerrar sesión");
    }
  }, []);

  const cargando =
    cargandoSesion ||
    (usuarioId !== null && perfilResueltoId !== usuarioId);

  // Nunca se usa el perfil de una sesión anterior mientras llega el nuevo
  const perfilActual = perfil !== null && perfil.id === usuarioId ? perfil : null;

  return (
    <AuthContext.Provider
      value={{
        session,
        usuario,
        perfil: perfilActual,
        cargando,
        error,
        iniciarSesion,
        crearCuenta,
        cerrarSesion,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthContext debe usarse dentro de AuthProvider");
  }

  return context;
}
