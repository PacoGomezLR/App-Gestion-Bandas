// El tema oscuro llega a toda la app: sin modo claro, sin colores sueltos y
// con los componentes compartidos usando los tokens.
import { fireEvent, render, screen } from "@testing-library/react-native";
import { type StyleProp, StyleSheet, type TextStyle, type ViewStyle } from "react-native";

import { Colores } from "../../constants/theme";
import { useTheme } from "../../hooks/use-theme";
import { BotonPrincipal, CampoFormulario } from "../../components/PantallaBase";
import {
  BotonSecundario,
  EstadoVacio,
  FilaTexto,
  GrupoFilas,
  Tarjeta,
} from "../../components/PantallaInterior";
import { SelectorApartado } from "../../components/SelectorApartado";

// Rutas relativas a la raíz del proyecto (cwd de Jest)
const fs = jest.requireActual<{
  readdirSync: (ruta: string, opciones: { recursive: true }) => string[];
  readFileSync: (ruta: string, codificacion: "utf8") => string;
}>("fs");

jest.mock("../../global.css", () => ({}));

type Estilo = ViewStyle & TextStyle;

function estilo(elemento: { props: { style?: unknown } } | null | undefined): Estilo {
  return StyleSheet.flatten(elemento?.props.style as StyleProp<Estilo>) ?? {};
}

describe("un solo tema", () => {
  test("useTheme devuelve siempre la paleta oscura, aunque el sistema esté en claro", () => {
    jest.spyOn(jest.requireActual<typeof import("react-native")>("react-native"), "useColorScheme").mockReturnValue("light");

    expect(useTheme()).toBe(Colores);
  });

  test("no queda ningún rastro del esquema del sistema ni del modo claro", () => {
    const archivos = fs
      .readdirSync("src", { recursive: true })
      .map((ruta) => ruta.replace(/\\/g, "/"))
      .filter((ruta) => /\.(ts|tsx)$/.test(ruta) && !ruta.includes("__tests__"));

    const conEsquema = archivos.filter((ruta) =>
      /useColorScheme|Colors\[|Colors\.(light|dark)|DefaultTheme/.test(fs.readFileSync(`src/${ruta}`, "utf8"))
    );

    expect(conEsquema).toEqual([]);
  });

  test("ningún componente escribe colores propios: todos salen de theme.ts", () => {
    const archivos = fs
      .readdirSync("src", { recursive: true })
      .map((ruta) => ruta.replace(/\\/g, "/"))
      .filter(
        (ruta) => /\.(ts|tsx)$/.test(ruta) && !ruta.includes("__tests__") && ruta !== "constants/theme.ts"
      );

    const conColores = archivos.flatMap((ruta) => {
      const codigo = fs.readFileSync(`src/${ruta}`, "utf8");

      return [...codigo.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\(|["'](?:white|black)["']/g)].map(
        ([color]) => `${ruta}: ${color}`
      );
    });

    // Únicos casos:
    // - el degradado del icono de Expo en el splash animado (recurso de la plantilla);
    // - "black" en +html.tsx: es el valor de la meta apple-mobile-web-app-status-bar-style
    //   (barra de estado opaca en la PWA de iPhone), no un color de la interfaz
    expect(conColores).toEqual([
      'app/+html.tsx: "black"',
      "components/animated-icon.tsx: #3C9FFE",
      "components/animated-icon.tsx: #0274DF",
    ]);
  });

  test("app.json: interfaz oscura y mismo fondo en la raíz y en el splash nativo", () => {
    const { expo } = JSON.parse(fs.readFileSync("app.json", "utf8")) as {
      expo: { userInterfaceStyle: string; backgroundColor: string; plugins: unknown[] };
    };
    const splash = expo.plugins.find(
      (plugin): plugin is [string, { backgroundColor: string }] =>
        Array.isArray(plugin) && plugin[0] === "expo-splash-screen"
    );

    expect(expo.userInterfaceStyle).toBe("dark");
    expect(expo.backgroundColor).toBe(Colores.background);
    expect(splash?.[1].backgroundColor).toBe(Colores.background);
  });

  test("raíz: barra de estado clara y tema de navegación oscuro", () => {
    const codigo = fs.readFileSync("src/app/_layout.tsx", "utf8");

    expect(codigo).toContain('<StatusBar style="light" />');
    expect(codigo).toContain("<ThemeProvider value={TemaNavegacion}>");
  });

  test("barra inferior: elegida con acento, texto claro y píldora; sin elegir en gris secundario", () => {
    const codigo = fs.readFileSync("src/components/app-tabs.tsx", "utf8");

    expect(codigo).toContain("backgroundColor={colors.background}");
    expect(codigo).toContain("indicatorColor={colors.primarySoft}");
    expect(codigo).toContain("iconColor={{ default: colors.textSecondary, selected: colors.primaryPressed }}");
    expect(codigo).toContain("default: { color: colors.textSecondary }");
    expect(codigo).toContain("selected: { color: colors.text }");
  });
});

describe("componentes compartidos", () => {
  test("campo: superficie con borde, texto claro, placeholder tenue y foco de color principal", async () => {
    await render(<CampoFormulario etiqueta="Canción" placeholder="Años 80" />);

    const campo = screen.getByLabelText("Canción");

    expect(estilo(campo)).toMatchObject({
      backgroundColor: Colores.backgroundElement,
      borderColor: Colores.border,
      color: Colores.text,
    });
    expect(campo.props.placeholderTextColor).toBe(Colores.textMuted);

    await fireEvent(campo, "focus");

    expect(estilo(screen.getByLabelText("Canción")).borderColor).toBe(Colores.primary);
  });

  test("botón principal: relleno principal y texto claro", async () => {
    await render(<BotonPrincipal titulo="Guardar" onPress={jest.fn()} />);

    expect(estilo(screen.getByRole("button", { name: "Guardar" })).backgroundColor).toBe(Colores.primary);
    expect(estilo(screen.getByText("Guardar")).color).toBe(Colores.onPrimary);
  });

  test("botón secundario: superficie oscura, borde visible y texto claro", async () => {
    await render(<BotonSecundario titulo="Volver" onPress={jest.fn()} />);

    expect(estilo(screen.getByRole("button", { name: "Volver" }))).toMatchObject({
      backgroundColor: Colores.backgroundElement,
      borderColor: Colores.border,
      borderWidth: 1,
    });
    expect(estilo(screen.getByText("Volver")).color).toBe(Colores.text);
  });

  test("tarjetas, listas y estados vacíos: superficie con borde, sin sombras", async () => {
    await render(
      <>
        <Tarjeta titulo="Nueva canción" />
        <GrupoFilas>
          <FilaTexto titulo="Félix" />
          <FilaTexto titulo="Marcos" />
        </GrupoFilas>
        <EstadoVacio titulo="Sin técnicos" />
      </>
    );

    const tarjeta = estilo(screen.getByText("Nueva canción").parent);
    // Texto → fila → contenedor del separador → grupo
    const grupo = estilo(screen.getByText("Félix").parent?.parent?.parent);
    const vacio = estilo(screen.getByText("Sin técnicos").parent);

    for (const superficie of [tarjeta, grupo, vacio]) {
      expect(superficie).toMatchObject({
        backgroundColor: Colores.backgroundElement,
        borderColor: Colores.border,
        borderWidth: 1,
      });
      expect(superficie.shadowColor).toBeUndefined();
      expect(superficie.elevation).toBeUndefined();
    }

    // Separador como borde de un píxel, con el color de borde (no un gap)
    expect(estilo(screen.getByText("Marcos").parent?.parent)).toMatchObject({
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: Colores.border,
    });
    expect(grupo.gap).toBeUndefined();
  });

  test("selector de apartado: el elegido con fondo suave, borde de acento y negrita", async () => {
    await render(<SelectorApartado apartado="repertorio" totales={null} onCambiar={jest.fn()} />);

    const elegido = screen.getByRole("tab", { name: "Repertorio" });
    const otro = screen.getByRole("tab", { name: "Canciones nuevas" });

    expect(estilo(elegido)).toMatchObject({
      backgroundColor: Colores.primarySoft,
      borderColor: Colores.primary,
    });
    expect(estilo(otro).backgroundColor).toBeUndefined();
    // No depende solo del color
    expect(estilo(screen.getByText("Repertorio")).fontWeight).toBe("700");
    expect(estilo(screen.getByText("Canciones nuevas")).color).toBe(Colores.textSecondary);
    expect(elegido.props.accessibilityState.selected).toBe(true);
  });
});
