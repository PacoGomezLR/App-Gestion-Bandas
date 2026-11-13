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

import {
  esEnlaceCaducado,
  esEnlaceRecuperacion,
  procesarEnlaceAuth,
  RUTA_CALLBACK_AUTH,
} from "../lib/auth-deep-link";
import { limpiarUrlAuth } from "../lib/limpiarUrlAuth";
import { supabase } from "../lib/supabase";
import { guardarNombreVisiblePropio } from "../services/supabase/perfiles";
import type { PerfilUsuario } from "../types/usuario";
import { ERROR_NOMBRE_VISIBLE, normalizarNombreVisible } from "../utils/nombreVisible";

// Supabase puede iniciar la sesión al registrar o exigir antes confirmar el correo
export type ResultadoCrearCuenta =
  | "sesion_iniciada"
  | "confirmacion_requerida"
  | "error";

export type ResultadoReenvio = "enviado" | "error";

// Mensajes de acceso para personas: nunca el texto técnico de Supabase
export const ERROR_CORREO_SIN_VERIFICAR =
  "Tu correo todavía no está verificado. Revisa tu bandeja de entrada y pulsa el enlace de confirmación.";
export const ERROR_LIMITE_CORREOS =
  "Has solicitado demasiados correos. Espera unos minutos antes de intentarlo de nuevo.";
export const ERROR_ENLACE_CADUCADO =
  "El enlace ha caducado o ya se ha usado. Solicita uno nuevo.";
export const ERROR_ENLACE_RECUPERACION =
  "No se ha podido abrir el enlace para restablecer la contraseña. Solicita uno nuevo.";

export type ResultadoNuevaContrasena = "actualizada" | "error";

// Códigos de Supabase Auth para «demasiados envíos o peticiones»
const CODIGOS_LIMITE = new Set(["over_email_send_rate_limit", "over_request_rate_limit"]);

// Adonde vuelve el enlace de los correos de Supabase (registro, reenvío y
// recuperación de contraseña):
// mibanda://auth/callback en una build, exp://.../--/auth/callback en Expo Go y
// https://dominio/auth/callback en web
function urlCallbackAuth(): string {
  return Linking.createURL(RUTA_CALLBACK_AUTH);
}

function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

interface AuthContextValue {
  session: Session | null;
  usuario: User | null;
  perfil: PerfilUsuario | null;
  cargando: boolean;
  error: string;
  // Correo (normalizado) de una cuenta creada que aún no ha confirmado su correo:
  // tras registrarse o al intentar entrar con ella. Nunca la contraseña
  correoSinVerificar: string | null;
  iniciarSesion: (email: string, password: string) => Promise<boolean>;
  // Vuelve a enviar el correo de confirmación a correoSinVerificar
  reenviarVerificacion: () => Promise<ResultadoReenvio>;
  // Solo crea la cuenta (con su nombre visible): sin banda ni rol
  crearCuenta: (nombre: string, email: string, password: string) => Promise<ResultadoCrearCuenta>;
  // Una sola vez, para cuentas antiguas sin nombre visible
  completarNombreVisible: (nombre: string) => Promise<boolean>;
  cerrarSesion: () => Promise<void>;
  // Recuperación de contraseña: la sesión viene de un enlace «restablecer
  // contraseña» y hay que elegir una nueva antes de seguir
  recuperandoContrasena: boolean;
  // Pide el correo de recuperación (no dice si la cuenta existe)
  solicitarRecuperacion: (email: string) => Promise<ResultadoReenvio>;
  // Guarda la nueva contraseña de la sesión de recuperación
  actualizarContrasena: (password: string) => Promise<ResultadoNuevaContrasena>;
  // Sale del modo recuperación (tras guardar o al cancelar)
  finalizarRecuperacion: () => void;
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
  const [correoSinVerificar, setCorreoSinVerificar] = useState<string | null>(null);
  const [recuperandoContrasena, setRecuperandoContrasena] = useState(false);
  // Impide dos reenvíos a la vez (un doble toque llega antes de repintar)
  const reenviandoRef = useRef(false);
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
    const { data } = supabase.auth.onAuthStateChange((evento, nuevaSesion) => {
      if (!activo) {
        return;
      }

      setSession(nuevaSesion);

      // PKCE (exchangeCodeForSession) sí avisa con PASSWORD_RECOVERY; el flujo
      // implícito actual se detecta por el enlace (type=recovery)
      if (evento === "PASSWORD_RECOVERY") {
        setRecuperandoContrasena(true);
      }

      if (evento === "SIGNED_OUT") {
        setRecuperandoContrasena(false);
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

      const recuperacion = esEnlaceRecuperacion(url);

      // Antes de establecer la sesión: así la app no llega a mostrarse con ella
      if (recuperacion) {
        setRecuperandoContrasena(true);
      }

      // Sin navegación manual: la sesión llega por onAuthStateChange y AppAuthGate decide
      const resultado = await procesarEnlaceAuth(url, supabase.auth);

      // Web: los tokens del enlace no se quedan en la barra de direcciones
      if (resultado !== "ignorado") {
        limpiarUrlAuth();
      }

      if (!activo) {
        return;
      }

      if (resultado === "recuperacion") {
        setRecuperandoContrasena(true);
      }

      if (resultado === "error") {
        setRecuperandoContrasena(false);
        setError(
          esEnlaceCaducado(url)
            ? ERROR_ENLACE_CADUCADO
            : recuperacion
              ? ERROR_ENLACE_RECUPERACION
              : "No se ha podido confirmar la cuenta"
        );
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
    setCorreoSinVerificar(null);

    try {
      const emailNormalizado = normalizarEmail(email);
      const { error: errorAcceso } = await supabase.auth.signInWithPassword({
        email: emailNormalizado,
        password,
      });

      if (errorAcceso) {
        // Por código, no por el texto en inglés. La cuenta existe y la contraseña
        // es correcta, pero falta confirmar el correo: no es un acceso incorrecto
        if (errorAcceso.code === "email_not_confirmed") {
          setCorreoSinVerificar(emailNormalizado);
          setError(ERROR_CORREO_SIN_VERIFICAR);
          return false;
        }

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

      setCorreoSinVerificar(null);

      try {
        const emailNormalizado = normalizarEmail(email);
        // No se comprueba antes si el correo existe: eso permitiría enumerar cuentas
        const { data, error: errorRegistro } = await supabase.auth.signUp({
          email: emailNormalizado,
          password,
          options: {
            emailRedirectTo: urlCallbackAuth(),
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
          setCorreoSinVerificar(emailNormalizado);
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

  const reenviarVerificacion = useCallback(async (): Promise<ResultadoReenvio> => {
    if (correoSinVerificar === null || reenviandoRef.current) {
      return "error";
    }

    reenviandoRef.current = true;
    setError("");

    try {
      const { error: errorReenvio } = await supabase.auth.resend({
        type: "signup",
        email: correoSinVerificar,
        options: { emailRedirectTo: urlCallbackAuth() },
      });

      if (errorReenvio) {
        setError(
          CODIGOS_LIMITE.has(errorReenvio.code ?? "") || errorReenvio.status === 429
            ? ERROR_LIMITE_CORREOS
            : "No se ha podido reenviar el correo de verificación"
        );
        return "error";
      }

      return "enviado";
    } catch {
      setError("No se ha podido reenviar el correo de verificación");
      return "error";
    } finally {
      reenviandoRef.current = false;
    }
  }, [correoSinVerificar]);

  const solicitarRecuperacion = useCallback(async (email: string): Promise<ResultadoReenvio> => {
    setError("");

    try {
      const { error: errorSolicitud } = await supabase.auth.resetPasswordForEmail(
        normalizarEmail(email),
        { redirectTo: urlCallbackAuth() }
      );

      if (errorSolicitud) {
        setError(
          CODIGOS_LIMITE.has(errorSolicitud.code ?? "") || errorSolicitud.status === 429
            ? ERROR_LIMITE_CORREOS
            : "No se ha podido enviar el correo de recuperación"
        );
        return "error";
      }

      return "enviado";
    } catch {
      setError("No se ha podido enviar el correo de recuperación");
      return "error";
    }
  }, []);

  const actualizarContrasena = useCallback(
    async (password: string): Promise<ResultadoNuevaContrasena> => {
      setError("");

      try {
        const { error: errorCambio } = await supabase.auth.updateUser({ password });

        if (errorCambio) {
          const codigo = errorCambio.code ?? "";

          setError(
            codigo === "same_password"
              ? "La nueva contraseña debe ser distinta de la anterior"
              : codigo === "weak_password"
                ? "La contraseña no es lo bastante segura. Prueba con una más larga"
                : codigo === "session_not_found" || errorCambio.name === "AuthSessionMissingError"
                  ? ERROR_ENLACE_RECUPERACION
                  : "No se ha podido cambiar la contraseña"
          );
          return "error";
        }

        return "actualizada";
      } catch {
        setError("No se ha podido cambiar la contraseña");
        return "error";
      }
    },
    []
  );

  const finalizarRecuperacion = useCallback(() => {
    setRecuperandoContrasena(false);
    setError("");
  }, []);

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
        correoSinVerificar,
        iniciarSesion,
        reenviarVerificacion,
        crearCuenta,
        completarNombreVisible,
        cerrarSesion,
        recuperandoContrasena,
        solicitarRecuperacion,
        actualizarContrasena,
        finalizarRecuperacion,
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
