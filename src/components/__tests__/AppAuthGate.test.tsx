import type { Session } from "@supabase/supabase-js";
import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";
import { useAuthContext } from "../../context/AuthContext";
import { useBandaContext } from "../../context/BandaContext";
import type { Banda } from "../../types/banda";
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

jest.mock("../CrearBanda", () => {
  const { Text } = require("react-native");

  return {
    CrearBanda: () => <Text>Formulario de crear banda</Text>,
  };
});

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

function simularAuth(cargando: boolean, session: Session | null) {
  useAuthContextMock.mockReturnValue({
    session,
    usuario: session?.user ?? null,
    perfil: null,
    cargando,
    error: "",
    iniciarSesion: jest.fn(),
    crearCuenta: jest.fn(),
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
});
