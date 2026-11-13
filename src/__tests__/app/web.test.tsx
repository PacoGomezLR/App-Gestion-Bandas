import { render, renderHook, screen } from "@testing-library/react-native";
import { act } from "react";

import CallbackAuth from "../../app/auth/callback";
import { redirectSystemPath } from "../../app/+native-intent";
import InvitacionWeb from "../../app/invitacion.web";
import { useInvitacionAndroidWeb as usarEnApp } from "../../hooks/useInvitacionAndroidWeb";
import { useInvitacionAndroidWeb as usarEnWeb } from "../../hooks/useInvitacionAndroidWeb.web";
import type { PlataformaWeb } from "../../utils/plataformaWeb";

// La app real también en web: sin variantes que la sustituyan, con la
// configuración de Supabase de todas las plataformas, con la ruta del enlace de
// confirmación y con la invitación separada por plataforma.

// constants/theme importa global.css, que Jest no puede interpretar
jest.mock("../../global.css", () => ({}));

let mockRuta = "/";

// Redirect se pinta como texto: así se ve adónde mandaría sin un router real
jest.mock("expo-router", () => {
  const { Text: TextoRN } = jest.requireActual<typeof import("react-native")>("react-native");

  return {
    Redirect: ({ href }: { href: string }) => <TextoRN>{`Redirigido a ${href}`}</TextoRN>,
    usePathname: () => mockRuta,
    useLocalSearchParams: () => ({ token: "0123456789abcdef".repeat(4) }),
  };
});

let mockPlataforma: PlataformaWeb = "android";

jest.mock("../../utils/plataformaWeb", () => ({
  plataformaDelNavegador: () => mockPlataforma,
}));

jest.mock("expo-linking", () => ({ openURL: jest.fn(async () => {}) }));

const fs = jest.requireActual<{
  existsSync: (ruta: string) => boolean;
  readFileSync: (ruta: string, codificacion: "utf8") => string;
}>("fs");

beforeEach(() => {
  mockRuta = "/";
  mockPlataforma = "android";
});

describe("app real en web", () => {
  test.each([
    "src/app/_layout.web.tsx",
    "src/app/index.web.tsx",
    "src/app/banda.web.tsx",
    "src/app/repertorio.web.tsx",
    "src/config/entornoSupabase.web.ts",
  ])("ya no existe %s: la web usa la versión universal", (ruta) => {
    expect(fs.existsSync(ruta)).toBe(false);
  });

  test("Supabase usa en web las mismas variables públicas, sin valores en el código", () => {
    const entorno = fs.readFileSync("src/config/entornoSupabase.ts", "utf8");

    expect(entorno).toContain("process.env.EXPO_PUBLIC_SUPABASE_URL");
    expect(entorno).toContain("process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    expect(entorno).not.toMatch(/https:\/\/|sb_publishable_|eyJ/);
  });

  test("sin localStorage (export estático en Node) el cliente no falla", () => {
    const codigo = fs.readFileSync("src/lib/supabase.ts", "utf8");

    expect(codigo).toContain('typeof localStorage === "undefined" ? undefined : localStorage');
    expect(codigo).toContain("storage: almacenamientoSesion");
  });

  test("el layout universal monta la app salvo la página Android de invitación", () => {
    const layout = fs.readFileSync("src/app/_layout.tsx", "utf8");

    expect(layout).toContain("useInvitacionAndroidWeb()");
    expect(layout).toContain("<AppAuthGate>");
    expect(layout).toContain("<InvitacionPendienteProvider>");
  });
});

describe("auth/callback", () => {
  test("vuelve al inicio (AuthContext ya ha leído la URL inicial)", async () => {
    await render(<CallbackAuth />);

    expect(screen.getByText("Redirigido a /")).toBeTruthy();
  });

  test("en la app +native-intent sigue mandando el enlace al inicio sin buscar la ruta", () => {
    if (redirectSystemPath === undefined) {
      throw new Error("+native-intent debe exportar redirectSystemPath");
    }

    expect(redirectSystemPath({ path: "mibanda://auth/callback#a=b", initial: true })).toBe("/");
    expect(redirectSystemPath({ path: "mibanda://auth/callback#a=b", initial: false })).toBeNull();
  });
});

describe("useInvitacionAndroidWeb", () => {
  test("en la app nativa siempre es false", async () => {
    mockRuta = "/invitacion";

    const { result } = await renderHook(() => usarEnApp());

    expect(result.current).toBe(false);
  });

  test.each<[PlataformaWeb, string, boolean]>([
    ["android", "/invitacion", true],
    ["android", "/invitacion/", true],
    ["android", "/", false],
    ["android", "/banda", false],
    ["ios", "/invitacion", false],
    ["otra", "/invitacion", false],
  ])("web: %s en %s → %s", async (plataforma, ruta, esperado) => {
    mockPlataforma = plataforma;
    mockRuta = ruta;

    const { result } = await renderHook(() => usarEnWeb());
    await act(async () => {});

    expect(result.current).toBe(esperado);
  });
});

describe("invitacion.web", () => {
  test("Android: la página con «Abrir MI Banda» de siempre", async () => {
    await render(<InvitacionWeb />);

    expect(await screen.findByRole("button", { name: "Abrir MI Banda" })).toBeTruthy();
    expect(screen.queryByText(/Redirigido/)).toBeNull();
  });

  test.each<PlataformaWeb>(["ios", "otra"])(
    "%s: la app web ya ha tratado la invitación y se vuelve al inicio",
    async (plataforma) => {
      mockPlataforma = plataforma;

      await render(<InvitacionWeb />);

      expect(screen.getByText("Redirigido a /")).toBeTruthy();
      expect(screen.queryByText("Abrir MI Banda")).toBeNull();
    }
  );

  test("la invitación sigue llegando por InvitacionPendienteContext, sin guardar el token", () => {
    const codigo = fs.readFileSync("src/app/invitacion.web.tsx", "utf8");

    expect(codigo).not.toMatch(/localStorage|sessionStorage|setItem|console\./);
    expect(codigo).not.toMatch(/from\s+["'][^"']*(supabase|AuthContext|services\/)/);
  });
});
