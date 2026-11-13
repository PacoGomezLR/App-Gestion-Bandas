import { router } from "expo-router";
import { act, fireEvent, renderRouter, screen } from "expo-router/testing-library";
import { Text } from "react-native";

import CallbackAuth from "../../app/auth/callback";
import InvitacionWeb from "../../app/invitacion.web";
import AppTabsWeb from "../../components/app-tabs.web";
import { useBandaContext } from "../../context/BandaContext";

// Barra de pestañas web con el router real de Expo (expo-router/testing-library):
// rutas, estado activo, roles y las rutas auxiliares que no son pestañas.
// Las pantallas de las pestañas se sustituyen por un texto; invitacion.web y
// auth/callback son las reales.

jest.mock("../../global.css", () => ({}));
jest.mock("../../context/BandaContext", () => ({ useBandaContext: jest.fn() }));
// iPhone / escritorio: la invitación ya la ha tratado la app y vuelve al inicio
jest.mock("../../utils/plataformaWeb", () => ({ plataformaDelNavegador: () => "ios" }));

const fs = jest.requireActual<{
  readFileSync: (ruta: string, codificacion: "utf8") => string;
}>("fs");

function simular(esAdmin: boolean) {
  jest.mocked(useBandaContext).mockReturnValue({ esAdmin } as unknown as ReturnType<typeof useBandaContext>);
}

const rutas = {
  _layout: () => <AppTabsWeb />,
  index: () => <Text>Pantalla del calendario</Text>,
  repertorio: () => <Text>Pantalla del repertorio</Text>,
  banda: () => <Text>Pantalla de la banda</Text>,
  invitacion: InvitacionWeb,
  "auth/callback": CallbackAuth,
};

async function abrir(url: string, esAdmin = true) {
  simular(esAdmin);
  await renderRouter(rutas, { initialUrl: url });
  await act(async () => {});
}

function nombresPestanas(): string[] {
  return screen.getAllByRole("tab").map((pestana) => String(pestana.props.accessibilityLabel));
}

function activa(): string[] {
  return screen
    .getAllByRole("tab")
    .filter((pestana) => pestana.props.accessibilityState?.selected === true)
    .map((pestana) => String(pestana.props.accessibilityLabel));
}

describe("pestañas web por rol", () => {
  test("admin: Calendario | Repertorio | Banda", async () => {
    await abrir("/");

    expect(nombresPestanas()).toEqual(["Calendario", "Repertorio", "Banda"]);
  });

  test("usuario: Calendario | Repertorio, sin Banda", async () => {
    await abrir("/", false);

    expect(nombresPestanas()).toEqual(["Calendario", "Repertorio"]);
    expect(screen.queryByRole("tab", { name: "Banda" })).toBeNull();
  });

  test("las rutas auxiliares nunca son pestañas", async () => {
    await abrir("/");

    expect(nombresPestanas()).not.toEqual(expect.arrayContaining([expect.stringMatching(/invitaci|callback|auth/i)]));
    // En web el contenedor sale como role="tablist" con su etiqueta
    expect(screen.getByLabelText("Navegación principal").props.accessibilityRole).toBe("tablist");
  });
});

describe("rutas y estado activo", () => {
  test.each([
    ["/", "Calendario", "Pantalla del calendario"],
    ["/repertorio", "Repertorio", "Pantalla del repertorio"],
    ["/banda", "Banda", "Pantalla de la banda"],
  ])("en %s está activa %s y se ve su pantalla", async (url, pestana, pantalla) => {
    await abrir(url);

    expect(screen).toHavePathname(url);
    expect(screen.getByText(pantalla)).toBeTruthy();
    expect(activa()).toEqual([pestana]);
  });

  test("cada pestaña lleva a su ruta", async () => {
    await abrir("/");

    await act(async () => {
      fireEvent.press(screen.getByRole("tab", { name: "Repertorio" }));
    });
    expect(screen).toHavePathname("/repertorio");
    expect(activa()).toEqual(["Repertorio"]);

    await act(async () => {
      fireEvent.press(screen.getByRole("tab", { name: "Banda" }));
    });
    expect(screen).toHavePathname("/banda");
    expect(screen.getByText("Pantalla de la banda")).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByRole("tab", { name: "Calendario" }));
    });
    expect(screen).toHavePathname("/");
    expect(activa()).toEqual(["Calendario"]);
  });
});

describe("historial", () => {
  test("Atrás vuelve a la pestaña anterior y la marca como activa", async () => {
    await abrir("/");

    await act(async () => {
      fireEvent.press(screen.getByRole("tab", { name: "Repertorio" }));
    });
    expect(screen).toHavePathname("/repertorio");

    await act(async () => {
      router.back();
    });

    expect(screen).toHavePathname("/");
    expect(activa()).toEqual(["Calendario"]);
  });
});

describe("rutas auxiliares", () => {
  test("/invitacion se monta y vuelve al inicio, sin pestaña propia", async () => {
    await abrir("/invitacion?token=" + "0123456789abcdef".repeat(4));

    expect(screen).toHavePathname("/");
    expect(screen.getByText("Pantalla del calendario")).toBeTruthy();
    expect(activa()).toEqual(["Calendario"]);
    expect(nombresPestanas()).toEqual(["Calendario", "Repertorio", "Banda"]);
  });

  test("/auth/callback se monta y vuelve al inicio, sin pestaña propia", async () => {
    await abrir("/auth/callback");

    expect(screen).toHavePathname("/");
    expect(screen.getByText("Pantalla del calendario")).toBeTruthy();
    expect(activa()).toEqual(["Calendario"]);
  });

  test("usuario normal en /invitacion: también vuelve al inicio", async () => {
    await abrir("/invitacion", false);

    expect(screen).toHavePathname("/");
    expect(nombresPestanas()).toEqual(["Calendario", "Repertorio"]);
  });
});

describe("sin rastro de la plantilla", () => {
  test("ni Expo Starter, ni docs.expo.dev, ni enlaces externos", () => {
    const codigo = fs.readFileSync("src/components/app-tabs.web.tsx", "utf8");

    expect(codigo).not.toMatch(/Expo Starter|docs\.expo\.dev|ExternalLink|external-link|SymbolView/);
  });

  test("navegación con el router (sin window.location)", () => {
    const codigo = fs.readFileSync("src/components/app-tabs.web.tsx", "utf8");

    expect(codigo).not.toMatch(/window\.location|location\.href/);
    expect(codigo).toContain('<TabTrigger name="invitacion" href="/invitacion" />');
    expect(codigo).toContain('<TabTrigger name="callback" href="/auth/callback" />');
  });
});
