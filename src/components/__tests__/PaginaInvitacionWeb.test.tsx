import { fireEvent, render, screen } from "@testing-library/react-native";

import type { PlataformaWeb } from "../../utils/plataformaWeb";
import { PaginaInvitacionWeb } from "../PaginaInvitacionWeb";

// constants/theme importa global.css, que Jest no puede interpretar
jest.mock("../../global.css", () => ({}));

const mockOpenURL = jest.fn(async (_url: string) => {});

jest.mock("expo-linking", () => ({
  openURL: (url: string) => mockOpenURL(url),
}));

let mockPlataforma: PlataformaWeb = "android";

jest.mock("../../utils/plataformaWeb", () => ({
  plataformaDelNavegador: () => mockPlataforma,
}));

const fs = jest.requireActual<{
  readFileSync: (ruta: string, codificacion: "utf8") => string;
}>("fs");

// Valor de prueba con el formato del token (no es ningún token real)
const TOKEN = "0123456789abcdef".repeat(4);

const TOKENS_NO_VALIDOS = [
  ["sin token", undefined],
  ["token vacío", ""],
  ["token corto", "abc123"],
  ["mayúsculas", TOKEN.toUpperCase()],
  ["token con más texto", `${TOKEN}x`],
  ["token repetido en la URL", [TOKEN, TOKEN]],
] as const;

beforeEach(() => {
  jest.clearAllMocks();
  mockPlataforma = "android";
});

describe("PaginaInvitacionWeb en Android", () => {
  test("con un token válido ofrece abrir MI Banda", async () => {
    await render(<PaginaInvitacionWeb token={TOKEN} />);

    expect(await screen.findByText("Invitación a una banda")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Abrir MI Banda" })).toBeTruthy();
    expect(screen.getByText("¿No tienes la app?")).toBeTruthy();
    expect(screen.queryByText(/no es válida/)).toBeNull();
  });

  test("Abrir MI Banda abre mibanda://invitacion?token=... solo al pulsar", async () => {
    await render(<PaginaInvitacionWeb token={TOKEN} />);
    const boton = await screen.findByRole("button", { name: "Abrir MI Banda" });

    // Sin redirección automática al cargar
    expect(mockOpenURL).not.toHaveBeenCalled();

    await fireEvent.press(boton);

    expect(mockOpenURL).toHaveBeenCalledTimes(1);
    expect(mockOpenURL).toHaveBeenCalledWith(`mibanda://invitacion?token=${TOKEN}`);
  });
});

describe("PaginaInvitacionWeb en iPhone / iPad", () => {
  beforeEach(() => {
    mockPlataforma = "ios";
  });

  test("sin la app no hay botón que lance mibanda:// (error de Safari)", async () => {
    await render(<PaginaInvitacionWeb token={TOKEN} />);

    expect(await screen.findByText("Invitación a una banda")).toBeTruthy();
    expect(screen.getByText("MI Banda no está instalada en este dispositivo")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText("Abrir MI Banda")).toBeNull();
    expect(mockOpenURL).not.toHaveBeenCalled();
  });

  test("no inventa una ficha de App Store", async () => {
    await render(<PaginaInvitacionWeb token={TOKEN} />);
    await screen.findByText("Invitación a una banda");

    expect(screen.queryByText(/App Store|apps\.apple\.com|itunes/i)).toBeNull();
  });
});

describe("PaginaInvitacionWeb en escritorio", () => {
  test("explica que es una app para el móvil, sin botón", async () => {
    mockPlataforma = "otra";
    await render(<PaginaInvitacionWeb token={TOKEN} />);

    expect(await screen.findByText(/abre este enlace desde el teléfono/)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    expect(mockOpenURL).not.toHaveBeenCalled();
  });
});

describe.each(["android", "ios", "otra"] as const)("PaginaInvitacionWeb (%s)", (plataforma) => {
  beforeEach(() => {
    mockPlataforma = plataforma;
  });

  test("el token no aparece en ningún texto y no se abre nada sin pulsar", async () => {
    await render(<PaginaInvitacionWeb token={TOKEN} />);
    await screen.findByText("Invitación a una banda");

    expect(screen.queryByText(new RegExp(TOKEN))).toBeNull();
    expect(screen.queryByText(/token|mibanda:\/\//i)).toBeNull();
    expect(mockOpenURL).not.toHaveBeenCalled();
  });

  test.each(TOKENS_NO_VALIDOS)("%s: invitación no válida y sin botón", async (_caso, token) => {
    await render(<PaginaInvitacionWeb token={token} />);

    expect(await screen.findByText(/Esta invitación no es válida/)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    expect(mockOpenURL).not.toHaveBeenCalled();
  });
});

describe("página web: sin registro, almacenamiento ni Supabase", () => {
  const archivosWeb = [
    "src/components/PaginaInvitacionWeb.tsx",
    "src/utils/plataformaWeb.ts",
    "src/app/invitacion.web.tsx",
    "src/app/index.web.tsx",
    "src/app/_layout.web.tsx",
    "src/app/banda.web.tsx",
    "src/app/+html.tsx",
  ];

  test.each(archivosWeb)("%s no registra ni guarda el token", (ruta) => {
    const codigo = fs.readFileSync(ruta, "utf8");

    expect(codigo).not.toMatch(/console\.|localStorage|sessionStorage|AsyncStorage|SecureStore|setItem|indexedDB|document\.cookie/);
    expect(codigo).not.toMatch(/analytics|fetch\(/i);
  });

  test.each(archivosWeb)("%s no redirige solo ni inventa datos de App Store", (ruta) => {
    const codigo = fs.readFileSync(ruta, "utf8");

    expect(codigo).not.toMatch(/window\.location|location\.(href|assign|replace)|http-equiv="refresh"|httpEquiv="refresh"/i);
    expect(codigo).not.toMatch(/apple-itunes-app|apps\.apple\.com|itunes\.apple\.com/i);
  });

  test.each(archivosWeb)("%s no usa Supabase ni la sesión de la app", (ruta) => {
    const codigo = fs.readFileSync(ruta, "utf8");

    // Solo se miran los imports: los comentarios pueden nombrarlos
    expect(codigo).not.toMatch(/from\s+["'][^"']*(supabase|AuthContext|BandaContext|services\/)/i);
  });

  test("el botón solo llama a openURL desde onPress, nunca en un efecto", () => {
    const codigo = fs.readFileSync("src/components/PaginaInvitacionWeb.tsx", "utf8");

    expect(codigo.match(/openURL/g)).toHaveLength(1);
    expect(codigo).toContain("onPress={() => void Linking.openURL(enlaceApp)}");
  });

  test("+html.tsx mantiene noindex, nofollow y no-referrer", () => {
    const html = fs.readFileSync("src/app/+html.tsx", "utf8");

    expect(html).toContain('<meta name="robots" content="noindex, nofollow" />');
    expect(html).toContain('<meta name="referrer" content="no-referrer" />');
  });

  test("en web no se compilan la URL ni la clave de Supabase", () => {
    const web = fs.readFileSync("src/config/entornoSupabase.web.ts", "utf8");
    const nativo = fs.readFileSync("src/config/entornoSupabase.ts", "utf8");

    expect(web).not.toContain("process.env");
    expect(nativo).toContain("process.env.EXPO_PUBLIC_SUPABASE_URL");
    expect(nativo).toContain("process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  });
});
