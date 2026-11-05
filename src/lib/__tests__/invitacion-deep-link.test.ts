import { redirectSystemPath } from "../../app/+native-intent";
import { procesarEnlaceAuth } from "../auth-deep-link";
import {
  comprobarConfiguracionInvitaciones,
  crearEnlaceAppInvitacion,
  crearEnlaceInvitacion,
  ErrorConfiguracionInvitacion,
  esEnlaceInvitacion,
  esTokenInvitacion,
  ESQUEMA_APP,
  extraerTokenInvitacion,
  RUTA_INVITACION,
} from "../invitacion-deep-link";

const fs = jest.requireActual<{
  readFileSync: (ruta: string, codificacion: "utf8") => string;
}>("fs");

const mockCreateURL = jest.fn(
  (ruta: string, opciones?: { queryParams?: Record<string, string> }) =>
    `mibanda://${ruta}?token=${opciones?.queryParams?.token ?? ""}`
);

jest.mock("expo-linking", () => ({
  createURL: (ruta: string, opciones?: { queryParams?: Record<string, string> }) =>
    mockCreateURL(ruta, opciones),
}));

// Valor de prueba con el formato del token (no es ningún token real)
const TOKEN = "0123456789abcdef".repeat(4);

describe("enlace de invitación", () => {
  test("usa el scheme de la app y su propia ruta, distinta de auth/callback", () => {
    const enlace = crearEnlaceInvitacion(TOKEN);

    expect(RUTA_INVITACION).toBe("invitacion");
    expect(mockCreateURL).toHaveBeenCalledWith("invitacion", { queryParams: { token: TOKEN } });
    expect(enlace).toBe(`mibanda://invitacion?token=${TOKEN}`);
    expect(enlace).not.toContain("auth/callback");
  });

  test("extrae el token de la build y de Expo Go", () => {
    expect(extraerTokenInvitacion(`mibanda://invitacion?token=${TOKEN}`)).toBe(TOKEN);
    expect(extraerTokenInvitacion(`exp://192.168.1.10:8081/--/invitacion?token=${TOKEN}`)).toBe(TOKEN);
  });

  test("rechaza tokens con otro formato y enlaces que no son de invitación", () => {
    expect(extraerTokenInvitacion("mibanda://invitacion")).toBeNull();
    expect(extraerTokenInvitacion("mibanda://invitacion?token=corto")).toBeNull();
    expect(extraerTokenInvitacion(`mibanda://invitacion?token=${TOKEN.toUpperCase()}`)).toBeNull();
    expect(extraerTokenInvitacion(`mibanda://auth/callback?token=${TOKEN}`)).toBeNull();
    expect(extraerTokenInvitacion("no es una url")).toBeNull();
    expect(esEnlaceInvitacion("mibanda://auth/callback?code=abc")).toBe(false);
    expect(esEnlaceInvitacion(`mibanda://invitacion?token=${TOKEN}`)).toBe(true);
  });

  test("el procesado de auth/callback ignora los enlaces de invitación", async () => {
    const auth = { setSession: jest.fn(), exchangeCodeForSession: jest.fn() };

    await expect(procesarEnlaceAuth(`mibanda://invitacion?token=${TOKEN}`, auth)).resolves.toBe("ignorado");
    expect(auth.setSession).not.toHaveBeenCalled();
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });
});

// Dominio .test (RFC 6761): reservado, nunca existe. No es configuración real.
const ORIGEN = "https://mibanda.test";

describe("enlace de invitación HTTPS", () => {
  const original = process.env.EXPO_PUBLIC_INVITE_BASE_URL;

  beforeEach(() => {
    mockCreateURL.mockClear();
    process.env.EXPO_PUBLIC_INVITE_BASE_URL = `${ORIGEN}/`;
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.EXPO_PUBLIC_INVITE_BASE_URL;
    } else {
      process.env.EXPO_PUBLIC_INVITE_BASE_URL = original;
    }
  });

  test("con origen configurado se comparte https, sin dobles barras", () => {
    const enlace = crearEnlaceInvitacion(TOKEN);

    expect(enlace).toBe(`${ORIGEN}/invitacion?token=${TOKEN}`);
    expect(mockCreateURL).not.toHaveBeenCalled();
  });

  test("con el dominio real de Expo Hosting se comparte y se reconoce el enlace https", () => {
    process.env.EXPO_PUBLIC_INVITE_BASE_URL = "https://mibanda.expo.app";
    const enlace = crearEnlaceInvitacion(TOKEN);

    expect(enlace).toBe(`https://mibanda.expo.app/invitacion?token=${TOKEN}`);
    expect(extraerTokenInvitacion(enlace)).toBe(TOKEN);
    expect(redirigir({ path: enlace, initial: true })).toBe("/");
  });

  test("variable vacía: fallback de desarrollo con mibanda://", () => {
    for (const valor of ["", "   "]) {
      process.env.EXPO_PUBLIC_INVITE_BASE_URL = valor;
      expect(crearEnlaceInvitacion(TOKEN)).toBe(`mibanda://invitacion?token=${TOKEN}`);
      expect(() => comprobarConfiguracionInvitaciones()).not.toThrow();
    }
  });

  test("variable definida pero no válida: error de configuración, nunca un mibanda:// silencioso", () => {
    for (const valor of ["http://mibanda.test", "javascript:alert(1)", `${ORIGEN}/?token=${TOKEN}`, "mibanda.test"]) {
      process.env.EXPO_PUBLIC_INVITE_BASE_URL = valor;

      expect(() => crearEnlaceInvitacion(TOKEN)).toThrow(ErrorConfiguracionInvitacion);
      expect(() => comprobarConfiguracionInvitaciones()).toThrow(ErrorConfiguracionInvitacion);
      expect(mockCreateURL).not.toHaveBeenCalled();
    }

    // Mensaje para personas, sin el valor configurado ni detalles internos
    expect(() => crearEnlaceInvitacion(TOKEN)).toThrow("No se ha podido preparar el enlace de invitación.");
  });

  test("con la configuración rota los enlaces mibanda:// se siguen reconociendo", () => {
    process.env.EXPO_PUBLIC_INVITE_BASE_URL = "http://mibanda.test";

    expect(extraerTokenInvitacion(`mibanda://invitacion?token=${TOKEN}`)).toBe(TOKEN);
    expect(extraerTokenInvitacion(`http://mibanda.test/invitacion?token=${TOKEN}`)).toBeNull();
  });

  test("la misma extracción vale para https y para mibanda://", () => {
    expect(extraerTokenInvitacion(`${ORIGEN}/invitacion?token=${TOKEN}`)).toBe(TOKEN);
    expect(extraerTokenInvitacion(`${ORIGEN}/invitacion/?token=${TOKEN}`)).toBe(TOKEN);
    expect(extraerTokenInvitacion(`mibanda://invitacion?token=${TOKEN}`)).toBe(TOKEN);
    expect(esEnlaceInvitacion(`${ORIGEN}/invitacion?token=${TOKEN}`)).toBe(true);
  });

  test("rechaza otro host, otra ruta, http y tokens con otro formato", () => {
    expect(extraerTokenInvitacion(`https://otro.test/invitacion?token=${TOKEN}`)).toBeNull();
    expect(extraerTokenInvitacion(`https://mibanda.test.otro.test/invitacion?token=${TOKEN}`)).toBeNull();
    expect(extraerTokenInvitacion(`http://mibanda.test/invitacion?token=${TOKEN}`)).toBeNull();
    expect(extraerTokenInvitacion(`${ORIGEN}/otra/invitacion?token=${TOKEN}`)).toBeNull();
    expect(extraerTokenInvitacion(`${ORIGEN}/--/invitacion?token=${TOKEN}`)).toBeNull();
    expect(extraerTokenInvitacion(`${ORIGEN}/auth/callback?token=${TOKEN}`)).toBeNull();
    expect(extraerTokenInvitacion(`${ORIGEN}/invitacion?token=corto`)).toBeNull();
    expect(extraerTokenInvitacion(`${ORIGEN}:8443/invitacion?token=${TOKEN}`)).toBeNull();
  });

  test("sin origen configurado ningún enlace https se trata como invitación", () => {
    delete process.env.EXPO_PUBLIC_INVITE_BASE_URL;

    expect(extraerTokenInvitacion(`${ORIGEN}/invitacion?token=${TOKEN}`)).toBeNull();
  });

  test("auth/callback ignora también la invitación https", async () => {
    const auth = { setSession: jest.fn(), exchangeCodeForSession: jest.fn() };

    await expect(procesarEnlaceAuth(`${ORIGEN}/invitacion?token=${TOKEN}`, auth)).resolves.toBe("ignorado");
    expect(auth.setSession).not.toHaveBeenCalled();
  });

  test("+native-intent no busca la ruta /invitacion ni con https ni con la ruta sola", () => {
    expect(redirigir({ path: `${ORIGEN}/invitacion?token=${TOKEN}`, initial: true })).toBe("/");
    expect(redirigir({ path: `${ORIGEN}/invitacion?token=${TOKEN}`, initial: false })).toBeNull();
    expect(redirigir({ path: `/invitacion?token=${TOKEN}`, initial: true })).toBe("/");
    expect(redirigir({ path: "/tecnicos", initial: false })).toBe("/tecnicos");
  });
});

// NativeIntent declara la función como opcional; aquí siempre existe
function redirigir(argumentos: { path: string; initial: boolean }) {
  if (redirectSystemPath === undefined) {
    throw new Error("Falta redirectSystemPath");
  }

  return redirectSystemPath(argumentos);
}

describe("+native-intent", () => {
  test("ni la invitación ni auth/callback buscan una ruta inexistente", () => {
    const invitacion = `mibanda://invitacion?token=${TOKEN}`;

    expect(redirigir({ path: invitacion, initial: true })).toBe("/");
    expect(redirigir({ path: invitacion, initial: false })).toBeNull();
    expect(redirigir({ path: "mibanda://auth/callback?code=abc", initial: true })).toBe("/");
    expect(redirigir({ path: "mibanda://auth/callback?code=abc", initial: false })).toBeNull();
  });

  test("el resto de rutas siguen igual", () => {
    expect(redirigir({ path: "/tecnicos", initial: false })).toBe("/tecnicos");
  });
});

describe("enlace para abrir la app desde la página web", () => {
  test("con token válido genera mibanda://invitacion?token=...", () => {
    expect(crearEnlaceAppInvitacion(TOKEN)).toBe(`mibanda://invitacion?token=${TOKEN}`);
    // Lo reconoce la misma extracción que usa la app
    expect(extraerTokenInvitacion(crearEnlaceAppInvitacion(TOKEN) ?? "")).toBe(TOKEN);
  });

  test("sin token válido no hay enlace", () => {
    for (const valor of [undefined, null, "", "corto", TOKEN.toUpperCase(), `${TOKEN}&x=1`, [TOKEN], 42]) {
      expect(crearEnlaceAppInvitacion(valor)).toBeNull();
      expect(esTokenInvitacion(valor)).toBe(false);
    }
  });

  test("usa el scheme de app.json, que sigue siendo mibanda", () => {
    const configuracion = JSON.parse(fs.readFileSync("app.json", "utf8")) as { expo: { scheme: string } };

    expect(ESQUEMA_APP).toBe("mibanda");
    expect(configuracion.expo.scheme).toBe(ESQUEMA_APP);
  });
});
