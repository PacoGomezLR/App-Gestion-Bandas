import { render, screen } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import AppTabsWeb from "../../components/app-tabs.web";
import { useBandaContext } from "../../context/BandaContext";

// Las pestañas que ve cada rol. La barra nativa no se puede pintar en Jest (sus
// iconos usan "@/assets", que aquí no resuelve): se revisa su código. La web sí
// se pinta, con una barra simulada que escribe el nombre de cada pestaña.
// Rutas relativas a la raíz del proyecto (cwd de Jest).
const fs = jest.requireActual<{
  readFileSync: (ruta: string, codificacion: "utf8") => string;
}>("fs");

jest.mock("../../global.css", () => ({}));
jest.mock("../../context/BandaContext", () => ({ useBandaContext: jest.fn() }));

jest.mock("expo-router/ui", () => {
  const { Text, View } = jest.requireActual<typeof import("react-native")>("react-native");
  const Caja = ({ children }: PropsWithChildren) => <View>{children}</View>;

  return {
    Tabs: Caja,
    TabList: Caja,
    TabSlot: () => null,
    TabTrigger: ({ name }: { name: string }) => <Text>{`pestaña:${name}`}</Text>,
  };
});

jest.mock("../../components/external-link", () => ({ ExternalLink: () => null }));
jest.mock("expo-symbols", () => ({ SymbolView: () => null }));

const mockUseBandaContext = jest.mocked(useBandaContext);

function simular(esAdmin: boolean) {
  mockUseBandaContext.mockReturnValue({ esAdmin } as unknown as ReturnType<typeof useBandaContext>);
}

function pestanasWeb(): string[] {
  return screen
    .getAllByText(/^pestaña:/)
    .map((texto) => String(texto.props.children).replace("pestaña:", ""));
}

describe("pestañas nativas", () => {
  const codigo = fs.readFileSync("src/components/app-tabs.tsx", "utf8");

  test("el rol sale del contexto de la banda", () => {
    expect(codigo).toContain("const { esAdmin } = useBandaContext();");
  });

  test("solo Banda depende del rol, y se oculta sin dejar hueco", () => {
    // hidden quita la pestaña de la barra y bloquea su ruta
    expect(codigo).toContain('<NativeTabs.Trigger name="banda" hidden={!esAdmin}>');
    expect(codigo).toContain('<NativeTabs.Trigger name="index">');
    expect(codigo).toContain('<NativeTabs.Trigger name="repertorio">');
    expect(codigo.match(/hidden=/g)).toHaveLength(1);
  });

  test("Calendario sigue siendo la primera (la inicial)", () => {
    expect([...codigo.matchAll(/Trigger name="([^"]+)"/g)].map(([, nombre]) => nombre)).toEqual([
      "index",
      "repertorio",
      "banda",
    ]);
  });
});

describe("pestañas web", () => {
  test("admin: Calendario | Repertorio | Banda", async () => {
    simular(true);
    await render(<AppTabsWeb />);

    expect(pestanasWeb()).toEqual(["home", "repertorio", "banda"]);
  });

  test("usuario: Calendario | Repertorio, sin Banda", async () => {
    simular(false);
    await render(<AppTabsWeb />);

    expect(pestanasWeb()).toEqual(["home", "repertorio"]);
  });
});
