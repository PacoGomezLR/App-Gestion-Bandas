import { act, fireEvent, screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import type { PropsWithChildren } from "react";

import { useAuthContext } from "../../context/AuthContext";
import { useBandaContext } from "../../context/BandaContext";
import Layout from "../../app/_layout";
import BandaScreen from "../../app/banda";
import Index from "../../app/index";

// El root real de Expo Router con las pantallas reales: comprueba que arrancar
// la app y abrir Finanzas monta un solo contenedor de navegación. El aviso de
// Expo Router se dispara al montarse un segundo contenedor.
const AVISO_SEGUNDO_CONTENEDOR = /multiple navigation containers/;

jest.mock("../../global.css", () => ({}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));
jest.mock("expo-linking", () => ({
  ...jest.requireActual<object>("expo-linking"),
  createURL: (ruta: string) => `mibanda://${ruta}`,
}));

// Solo sesión y banda son simuladas; los demás proveedores y el _layout son los reales
jest.mock("../../context/AuthContext", () => ({
  AuthProvider: ({ children }: PropsWithChildren) => children,
  useAuthContext: jest.fn(),
}));
jest.mock("../../context/BandaContext", () => ({
  BandaProvider: ({ children }: PropsWithChildren) => children,
  useBandaContext: jest.fn(),
}));

jest.mock("../../components/animated-icon", () => ({ AnimatedSplashOverlay: () => null }));

// La barra nativa no existe en Jest: en su lugar, el navegador más simple del router
jest.mock("../../components/app-tabs", () => {
  const { Slot } = jest.requireActual<typeof import("expo-router")>("expo-router");

  return { __esModule: true, default: () => <Slot /> };
});

jest.mock("../../components/BotonCerrarSesion", () => {
  const { Text: Texto } = jest.requireActual<typeof import("react-native")>("react-native");

  return { BotonCerrarSesion: () => <Texto>Cerrar sesión</Texto> };
});

jest.mock("../../services/supabase/eventos", () => ({
  crearRepositorioEventosSupabase: () => ({ listar: async () => [] }),
}));
jest.mock("../../services/supabase/personas", () => ({
  crearRepositorioTecnicosSupabase: () => ({ listar: async () => [] }),
}));
jest.mock("../../services/supabase/integrantes", () => ({
  crearRepositorioIntegrantesSupabase: () => ({ listar: async () => [] }),
}));
jest.mock("../../services/supabase/disponibilidad", () => ({
  crearRepositorioDisponibilidadSupabase: () => ({ listar: async () => [] }),
}));
jest.mock("../../services/supabase/finanzas", () => ({
  crearRepositorioFinanzasSupabase: () => ({ listar: async () => [] }),
}));

const mockUseAuthContext = jest.mocked(useAuthContext);
const mockUseBandaContext = jest.mocked(useBandaContext);

function avisosDeContenedor(espia: jest.SpyInstance): unknown[][] {
  return espia.mock.calls.filter(([mensaje]) => AVISO_SEGUNDO_CONTENEDOR.test(String(mensaje)));
}

beforeEach(() => {
  mockUseAuthContext.mockReturnValue({
    cargando: false,
    session: { user: { id: "u1" } },
    perfil: { nombreVisible: "Paco" },
    usuario: { id: "u1" },
  } as unknown as ReturnType<typeof useAuthContext>);

  mockUseBandaContext.mockReturnValue({
    bandaActual: { id: "b1", nombre: "IndiesPensables" },
    pertenenciaActual: { bandaId: "b1", usuarioId: "u1", rol: "admin", creadaEn: "2026-01-01" },
    esAdmin: true,
  } as unknown as ReturnType<typeof useBandaContext>);
});

afterEach(() => {
  jest.restoreAllMocks();
});

const APP = { _layout: Layout, index: Index, banda: BandaScreen };

describe("un solo árbol de navegación", () => {
  test("arrancar la app y abrir Finanzas monta un solo contenedor", async () => {
    const espia = jest.spyOn(console, "error").mockImplementation(() => {});

    await renderRouter(APP, { initialUrl: "/banda" });

    await fireEvent.press(await screen.findByRole("button", { name: "Finanzas" }));

    expect(await screen.findByText("Bote actual")).toBeTruthy();
    expect(avisosDeContenedor(espia)).toEqual([]);
  });

  // Android relanza la Activity en el mismo proceso: la raíz nueva se monta
  // antes de que se desmonte la vieja, y Expo Router avisa de dos contenedores
  test("tras un relanzamiento de Android la raíz nueva sigue pintando la app", async () => {
    const espia = jest.spyOn(console, "error").mockImplementation(() => {});

    const vieja = await renderRouter(APP, { initialUrl: "/banda" });
    await screen.findByRole("button", { name: "Finanzas" });

    const nueva = await renderRouter(APP, { initialUrl: "/banda" });

    expect(avisosDeContenedor(espia).length).toBeGreaterThan(0);

    await vieja.unmount();
    await act(async () => {});

    expect(nueva.toJSON()).not.toBeNull();
    expect(await nueva.findByRole("button", { name: "Finanzas" })).toBeTruthy();
  });
});
