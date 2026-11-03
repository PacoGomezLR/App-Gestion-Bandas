import type { Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { procesarEnlaceAuth, RUTA_CALLBACK_AUTH } from "../lib/auth-deep-link";
import { supabase } from "../lib/supabase";
import { guardarNombreVisiblePropio } from "../services/supabase/perfiles";
import type { PerfilUsuario } from "../types/usuario";
import { ERROR_NOMBRE_VISIBLE, normalizarNombreVisible } from "../utils/nombreVisible";

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
  // Solo crea la cuenta (con su nombre visible): sin banda ni rol
  crearCuenta: (nombre: string, email: string, password: string) => Promise<ResultadoCrearCuenta>;
  // Una sola vez, para cuentas antiguas sin nombre visible
  completarNombreVisible: (nombre: string) => Promise<boolean>;
  cerrarSesion: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// La consulta a Supabase no está tipada: se comprueba la forma antes de usarla
function esPerfilUsuario(valor: unknown): valor is PerfilUsuario {
  if (typeof valor !== "object" || valor === null) {
    return false;
  }

  const { id, email, nombreVisible } = valor as Record<string, unknown>;

  return (
    typeof id === "string" &&
    typeof email === "string" &&
    (nombreVisible === null || typeof nombreVisible === "string")
  );
}

// Fila de perfiles (snake_case) → PerfilUsuario
function convertirPerfil(fila: unknown): PerfilUsuario | null {
  if (typeof fila !== "object" || fila === null) {
    return null;
  }

  const { id, email, nombre_visible } = fila as Record<string, unknown>;
  const perfil = { id, email, nombreVisible: nombre_visible ?? null };

  return esPerfilUsuario(perfil) ? perfil : null;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  // Id del usuario cuyo perfil ya se ha intentado cargar (con éxito o no)
  const [perfilResueltoId, setPerfilResueltoId] = useState<string | null>(null);
  const [error, setError] = useState("");
  // Un mismo enlace puede llegar como URL inicial y como evento: solo se procesa una vez
  const enlacesProcesados = useRef(new Set<string>());

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

  // Enlace de confirmación del correo: con la app cerrada (URL inicial) o ya abierta (evento)
  useEffect(() => {
    let activo = true;

    async function procesarEnlace(url: string | null) {
      if (url === null || enlacesProcesados.current.has(url)) {
        return;
      }

      enlacesProcesados.current.add(url);

      // Sin navegación manual: la sesión llega por onAuthStateChange y AppAuthGate decide
      const resultado = await procesarEnlaceAuth(url, supabase.auth);

      if (activo && resultado === "error") {
        setError("No se ha podido confirmar la cuenta");
      }
    }

    Linking.getInitialURL()
      .then(procesarEnlace)
      .catch(() => {
        // Sin URL inicial legible no hay nada que confirmar
      });

    const suscripcion = Linking.addEventListener("url", ({ url }) => {
      void procesarEnlace(url);
    });

    return () => {
      activo = false;
      suscripcion.remove();
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
          .select("id, email, nombre_visible")
          .eq("id", id)
          .single();

        if (!activo) {
          return;
        }

        const perfilCargado = errorConsulta ? null : convertirPerfil(data);

        if (perfilCargado === null) {
          setPerfil(null);
          setError("No se ha podido cargar el perfil");
        } else {
          // Solo id, email y nombre: el rol vive en cada banda, no en el perfil
          setPerfil(perfilCargado);
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
    async (nombre: string, email: string, password: string): Promise<ResultadoCrearCuenta> => {
      setError("");

      const nombreVisible = normalizarNombreVisible(nombre);

      if (nombreVisible === null) {
        setError(ERROR_NOMBRE_VISIBLE);
        return "error";
      }

      try {
        // No se comprueba antes si el correo existe: eso permitiría enumerar cuentas
        const { data, error: errorRegistro } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            // mibanda://auth/callback en una build; exp://.../--/auth/callback en Expo Go
            emailRedirectTo: Linking.createURL(RUTA_CALLBACK_AUTH),
            // El trigger de perfiles (005) copia solo esta clave a nombre_visible
            data: { nombre_visible: nombreVisible },
          },
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

  const completarNombreVisible = useCallback(
    async (nombre: string) => {
      const nombreVisible = normalizarNombreVisible(nombre);

      if (nombreVisible === null) {
        setError(ERROR_NOMBRE_VISIBLE);
        return false;
      }

      if (usuarioId === null) {
        return false;
      }

      setError("");

      try {
        // Siempre el perfil propio: no se puede pasar el id de otra persona
        await guardarNombreVisiblePropio(usuarioId, nombreVisible);
        setPerfil((actual) =>
          actual !== null && actual.id === usuarioId ? { ...actual, nombreVisible } : actual
        );
        return true;
      } catch {
        setError("No se ha podido guardar tu nombre");
        return false;
      }
    },
    [usuarioId]
  );

  const cerrarSesion = useCallback(async () => {
    setError("");

    try {
      const { error: errorSalida } = await supabase.auth.signOut({ scope: "local" });

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
        completarNombreVisible,
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
