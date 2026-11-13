import type { Session } from "@supabase/supabase-js";
import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";
import { useAuthContext } from "../../context/AuthContext";
import { useBandaContext } from "../../context/BandaContext";
import type { Banda } from "../../types/banda";
import type { PerfilUsuario } from "../../types/usuario";
import { AppAuthGate } from "../AppAuthGate";

// constants/theme importa global.css, que Jest no puede interpretar
jest.mock("../../global.css", () => ({}));

// Solo se simulan los hooks: los contextos reales cargarían el cliente Supabase
jest.mock("../../context/AuthContext", () => ({
  useAuthContext: jest.fn(),
}));

jest.mock("../../context/BandaContext", () => {
  const { Text } = require("react-native");

  return {
    useBandaContext: jest.fn(),
    BandaProvider: ({ children }: { children: React.ReactNode }) => (
      <>
        <Text>Proveedor de banda montado</Text>
        {children}
      </>
    ),
  };
});

jest.mock("../PantallaAcceso", () => {
  const { Text } = require("react-native");

  return {
    PantallaAcceso: () => <Text>Pantalla de acceso</Text>,
  };
});

jest.mock("../PantallaInvitacion", () => {
  const { Text } = require("react-native");

  return {
    PantallaInvitacion: () => <Text>Pantalla de invitación</Text>,
  };
});

jest.mock("../CompletarPerfil", () => {
  const { Text } = require("react-native");

  return {
    CompletarPerfil: () => <Text>Completa tu perfil</Text>,
  };
});

jest.mock("../NuevaContrasena", () => {
  const { Text } = require("react-native");
  return {
    NuevaContrasena: () => <Text>Pantalla de nueva contraseña</Text>,
  };
});

jest.mock("../CrearBanda", () => {
  const { Text } = require("react-native");

  return {
    CrearBanda: () => <Text>Formulario de crear banda</Text>,
  };
});

// Invitación pendiente controlada por cada test (por defecto, ninguna)
let mockTokenPendiente: string | null = null;
jest.mock("../../context/InvitacionPendienteContext", () => ({
  useInvitacionPendiente: () => ({
    tokenPendiente: mockTokenPendiente,
    descartarInvitacion: jest.fn(),
  }),
}));

const useAuthContextMock = jest.mocked(useAuthContext);
const useBandaContextMock = jest.mocked(useBandaContext);

const sesion: Session = {
  access_token: "token",
  refresh_token: "refresco",
  expires_in: 3600,
  token_type: "bearer",
  user: {
    id: "paco",
    email: "paco@email.com",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00Z",
  },
};

const cathaline: Banda = {
  id: "b1",
  nombre: "Cathaline",
  creadaPor: "paco",
  creadaEn: "2026-01-01T10:00:00Z",
};

const perfilConNombre: PerfilUsuario = {
  id: "paco",
  email: "paco@email.com",
  nombreVisible: "Paco Gómez",
};

function simularAuth(
  cargando: boolean,
  session: Session | null,
  perfil: PerfilUsuario | null = session === null ? null : perfilConNombre,
  recuperandoContrasena = false
) {
  useAuthContextMock.mockReturnValue({
    session,
    usuario: session?.user ?? null,
    perfil,
    cargando,
    error: "",
    iniciarSesion: jest.fn(),
    correoSinVerificar: null,
    reenviarVerificacion: jest.fn(),
    recuperandoContrasena,
    solicitarRecuperacion: jest.fn(),
    actualizarContrasena: jest.fn(),
    finalizarRecuperacion: jest.fn(),
    crearCuenta: jest.fn(),
    completarNombreVisible: jest.fn(),
    cerrarSesion: jest.fn(),
  });
}

function simularBanda(
  cargando: boolean,
  bandaActual: Banda | null,
  errorCarga = "",
  recargarBandas = jest.fn(async () => {})
) {
  useBandaContextMock.mockReturnValue({
    bandas: bandaActual ? [bandaActual] : [],
    bandaActual,
    pertenenciaActual: null,
    cargando,
    errorCarga,
    error: "",
    esAdmin: false,
    crearBanda: jest.fn(),
    seleccionarBanda: jest.fn(),
    recargarBandas,
  });
}

// Representa los providers de datos y las pestañas de la app
const montajeApp = jest.fn(() => <Text>Aplicación</Text>);

function App() {
  return montajeApp();
}

async function renderizarGate() {
  return render(
    <AppAuthGate>
      <App />
    </AppAuthGate>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockTokenPendiente = null;
});

describe("AppAuthGate", () => {
  test("mientras carga la sesión muestra Cargando y no monta nada más", async () => {
    simularAuth(true, null);

    const { getByText, queryByText } = await renderizarGate();

    expect(getByText("MI Banda")).toBeTruthy();
    expect(getByText("Cargando...")).toBeTruthy();
    expect(queryByText("Pantalla de acceso")).toBeNull();
    expect(queryByText("Proveedor de banda montado")).toBeNull();
    expect(montajeApp).not.toHaveBeenCalled();
  });

  test("sin sesión muestra el acceso y no monta bandas ni datos", async () => {
    simularAuth(false, null);

    const { getByText, queryByText } = await renderizarGate();

    expect(getByText("Pantalla de acceso")).toBeTruthy();
    expect(queryByText("Proveedor de banda montado")).toBeNull();
    expect(montajeApp).not.toHaveBeenCalled();
  });

  test("con sesión, mientras cargan las bandas muestra Cargando", async () => {
    simularAuth(false, sesion);
    simularBanda(true, null);

    const { getByText, queryByText } = await renderizarGate();

    expect(getByText("Proveedor de banda montado")).toBeTruthy();
    expect(getByText("MI Banda")).toBeTruthy();
    expect(getByText("Cargando...")).toBeTruthy();
    expect(queryByText("Formulario de crear banda")).toBeNull();
    expect(montajeApp).not.toHaveBeenCalled();
  });

  test("con sesión y sin bandas muestra CrearBanda y no monta los datos", async () => {
    simularAuth(false, sesion);
    simularBanda(false, null);

    const { getByText } = await renderizarGate();

    expect(getByText("Formulario de crear banda")).toBeTruthy();
    expect(montajeApp).not.toHaveBeenCalled();
  });

  test("si falla la carga de bandas no ofrece crear otra y permite reintentar", async () => {
    const recargarBandas = jest.fn(async () => {});
    simularAuth(false, sesion);
    simularBanda(false, null, "No se han podido cargar las bandas", recargarBandas);

    const { getByRole, getByText, queryByText } = await renderizarGate();

    expect(getByText("MI Banda")).toBeTruthy();
    expect(getByText("No se han podido cargar las bandas")).toBeTruthy();
    expect(queryByText("Formulario de crear banda")).toBeNull();

    await fireEvent.press(getByRole("button", { name: "Reintentar" }));

    expect(recargarBandas).toHaveBeenCalledTimes(1);
    expect(montajeApp).not.toHaveBeenCalled();
  });

  test("con sesión y Cathaline monta la aplicación normal", async () => {
    simularAuth(false, sesion);
    simularBanda(false, cathaline);

    const { getByText, queryByText } = await renderizarGate();

    expect(getByText("Aplicación")).toBeTruthy();
    expect(queryByText("Pantalla de acceso")).toBeNull();
    expect(queryByText("Formulario de crear banda")).toBeNull();
    expect(queryByText("Cargando...")).toBeNull();
  });

  test("una cuenta antigua sin nombre visible lo completa antes de entrar", async () => {
    simularAuth(false, sesion, { ...perfilConNombre, nombreVisible: null });
    simularBanda(false, cathaline);

    const { getByText, queryByText } = await renderizarGate();

    expect(getByText("Completa tu perfil")).toBeTruthy();
    // Ni bandas ni datos hasta tener nombre
    expect(queryByText("Proveedor de banda montado")).toBeNull();
    expect(queryByText("Aplicación")).toBeNull();
    expect(montajeApp).not.toHaveBeenCalled();
  });

  test("con nombre visible no vuelve a pedirlo y entra normalmente", async () => {
    simularAuth(false, sesion, perfilConNombre);
    simularBanda(false, cathaline);

    const { getByText, queryByText } = await renderizarGate();

    expect(queryByText("Completa tu perfil")).toBeNull();
    expect(getByText("Aplicación")).toBeTruthy();
  });

  test("tras guardar el nombre (el perfil ya lo tiene) entra en la app", async () => {
    simularAuth(false, sesion, { ...perfilConNombre, nombreVisible: null });
    simularBanda(false, cathaline);

    const { getByText, queryByText, rerender } = await renderizarGate();
    expect(getByText("Completa tu perfil")).toBeTruthy();

    simularAuth(false, sesion, perfilConNombre);
    await rerender(
      <AppAuthGate>
        <App />
      </AppAuthGate>
    );

    expect(queryByText("Completa tu perfil")).toBeNull();
    expect(getByText("Aplicación")).toBeTruthy();
  });

  describe("invitación pendiente", () => {
    test("sin sesión muestra el acceso (la invitación se recuerda para después)", async () => {
      mockTokenPendiente = "a".repeat(64);
      simularAuth(false, null);

      const { getByText, queryByText } = await renderizarGate();

      expect(getByText("Pantalla de acceso")).toBeTruthy();
      expect(queryByText("Pantalla de invitación")).toBeNull();
    });

    test("con sesión, tras entrar o confirmar el correo, continúa con la invitación", async () => {
      mockTokenPendiente = "a".repeat(64);
      simularAuth(false, sesion);
      simularBanda(false, cathaline);

      const { getByText, queryByText } = await renderizarGate();

      expect(getByText("Pantalla de invitación")).toBeTruthy();
      // No se monta la app hasta resolver la invitación
      expect(queryByText("Aplicación")).toBeNull();
    });

    test("una persona sin bandas ve la invitación en lugar de Crear banda", async () => {
      mockTokenPendiente = "a".repeat(64);
      simularAuth(false, sesion);
      simularBanda(false, null);

      const { getByText, queryByText } = await renderizarGate();

      expect(getByText("Pantalla de invitación")).toBeTruthy();
      expect(queryByText("Formulario de crear banda")).toBeNull();
    });

    test("una cuenta antigua sin nombre lo completa antes de ver la invitación", async () => {
      mockTokenPendiente = "a".repeat(64);
      simularAuth(false, sesion, { ...perfilConNombre, nombreVisible: null });
      simularBanda(false, cathaline);

      const { getByText, queryByText } = await renderizarGate();

      expect(getByText("Completa tu perfil")).toBeTruthy();
      expect(queryByText("Pantalla de invitación")).toBeNull();
    });

    test("sin invitación pendiente entra normalmente", async () => {
      simularAuth(false, sesion);
      simularBanda(false, cathaline);

      const { getByText, queryByText } = await renderizarGate();

      expect(getByText("Aplicación")).toBeTruthy();
      expect(queryByText("Pantalla de invitación")).toBeNull();
    });
  });
});

describe("AppAuthGate en la recuperación de contraseña", () => {
  test("con la sesión del enlace muestra la nueva contraseña antes que la app", async () => {
    simularAuth(false, sesion, perfilConNombre, true);
    simularBanda(false, cathaline);

    const { getByText, queryByText } = await renderizarGate();

    expect(getByText("Pantalla de nueva contraseña")).toBeTruthy();
    expect(queryByText("Proveedor de banda montado")).toBeNull();
    expect(queryByText("Pantalla de acceso")).toBeNull();
    expect(montajeApp).not.toHaveBeenCalled();
  });

  test("mientras se establece la sesión del enlace muestra Cargando, nunca el acceso", async () => {
    simularAuth(false, null, null, true);

    const { getByText, queryByText } = await renderizarGate();

    expect(getByText("Cargando...")).toBeTruthy();
    expect(queryByText("Pantalla de acceso")).toBeNull();
    expect(queryByText("Pantalla de nueva contraseña")).toBeNull();
  });

  // La invitación no se toca: al terminar, el gate sigue con ella (como en
  // «con sesión, tras entrar o confirmar el correo, continúa con la invitación»)
  test("con una invitación pendiente, primero la contraseña", async () => {
    mockTokenPendiente = "a".repeat(64);
    simularAuth(false, sesion, perfilConNombre, true);
    simularBanda(false, cathaline);

    const { getByText, queryByText } = await renderizarGate();

    expect(getByText("Pantalla de nueva contraseña")).toBeTruthy();
    expect(queryByText("Pantalla de invitación")).toBeNull();
  });

  test("terminada la recuperación entra en la app como siempre", async () => {
    simularAuth(false, sesion, perfilConNombre, false);
    simularBanda(false, cathaline);

    const { getByText, queryByText } = await renderizarGate();

    expect(getByText("Aplicación")).toBeTruthy();
    expect(queryByText("Pantalla de nueva contraseña")).toBeNull();
  });
});
