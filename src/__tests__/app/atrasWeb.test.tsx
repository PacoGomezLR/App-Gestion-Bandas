import { act, fireEvent, renderRouter, screen } from "expo-router/testing-library";
import { Text, View } from "react-native";

import AppTabsWeb from "../../components/app-tabs.web";
import { BotonAtras } from "../../components/BotonAtras";
import { useBandaContext } from "../../context/BandaContext";

// «‹ Atrás» con el router real de Expo y la barra de pestañas web (PWA):
// aparece solo con historial, vuelve con router.back y se oculta al llegar.

jest.mock("../../global.css", () => ({}));
jest.mock("../../context/BandaContext", () => ({ useBandaContext: jest.fn() }));

function pantalla(nombre: string) {
  return function Pantalla() {
    return (
      <View>
        <BotonAtras />
        <Text>{`Pantalla ${nombre}`}</Text>
      </View>
    );
  };
}

const rutas = {
  _layout: () => <AppTabsWeb />,
  index: pantalla("Calendario"),
  repertorio: pantalla("Repertorio"),
  banda: pantalla("Banda"),
  // Las rutas auxiliares que declara la barra web (no son pestañas)
  invitacion: () => null,
  "auth/callback": () => null,
};

async function abrir(url: string) {
  jest.mocked(useBandaContext).mockReturnValue({ esAdmin: true } as unknown as ReturnType<typeof useBandaContext>);
  await renderRouter(rutas, { initialUrl: url });
  await act(async () => {});
}

async function pulsar(nombre: string) {
  await act(async () => {
    fireEvent.press(screen.getByRole(nombre === "Atrás" ? "button" : "tab", { name: nombre }));
  });
}

describe("‹ Atrás en web", () => {
  test("en la primera pantalla no hay a dónde volver: no aparece", async () => {
    await abrir("/");

    expect(screen.getByText("Pantalla Calendario")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Atrás" })).toBeNull();
  });

  test("tras ir a Repertorio aparece y vuelve a la pantalla anterior sin recargar", async () => {
    await abrir("/");
    await pulsar("Repertorio");

    expect(screen).toHavePathname("/repertorio");
    expect(screen.getByRole("button", { name: "Atrás" })).toBeTruthy();

    await pulsar("Atrás");

    expect(screen).toHavePathname("/");
    expect(screen.getByText("Pantalla Calendario")).toBeTruthy();
    // De vuelta en la primera, ya no hay historial: desaparece
    expect(screen.queryByRole("button", { name: "Atrás" })).toBeNull();
  });

  test("desde Banda también vuelve con el historial del router", async () => {
    await abrir("/");
    await pulsar("Banda");

    expect(screen).toHavePathname("/banda");

    await pulsar("Atrás");

    expect(screen).toHavePathname("/");
  });
});
