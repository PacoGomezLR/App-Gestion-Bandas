import { TAMANO_LOGO_SPLASH } from "../../components/animated-icon.styles";
import { Colores } from "../../constants/theme";

// Arranque con identidad MI Banda: splash nativo y su continuación animada con
// el monograma MB, sin recursos de la plantilla de Expo.

jest.mock("../../global.css", () => ({}));

const fs = jest.requireActual<{
  existsSync: (ruta: string) => boolean;
  readFileSync: {
    (ruta: string, codificacion: "utf8"): string;
    (ruta: string): Uint8Array;
  };
  readdirSync: (ruta: string, opciones: { recursive: true }) => string[];
}>("fs");

function cabeceraPng(ruta: string) {
  const bytes = fs.readFileSync(ruta);
  const leer = (p: number) => ((bytes[p] << 24) | (bytes[p + 1] << 16) | (bytes[p + 2] << 8) | bytes[p + 3]) >>> 0;

  return { ancho: leer(16), alto: leer(20), tipoColor: bytes[25] };
}

const appJson = JSON.parse(fs.readFileSync("app.json", "utf8")) as {
  expo: { plugins: unknown[] };
};
const splash = appJson.expo.plugins.find(
  (plugin): plugin is [string, { backgroundColor: string; image: string; imageWidth: number }] =>
    Array.isArray(plugin) && plugin[0] === "expo-splash-screen"
);

describe("splash nativo", () => {
  test("fondo #0B0D0F (el de la app) y el monograma MB", () => {
    expect(splash?.[1]).toEqual({
      backgroundColor: "#0B0D0F",
      image: "./assets/images/splash-icon.png",
      imageWidth: 120,
    });
    expect(splash?.[1].backgroundColor).toBe(Colores.background);
  });

  test("splash-icon.png: MB con transparencia y la proporción de 120x70", () => {
    const png = cabeceraPng("assets/images/splash-icon.png");

    expect(png).toEqual({ ancho: 984, alto: 574, tipoColor: 6 });
    // Sin deformar: la misma proporción que el tamaño en pantalla
    expect(png.ancho / png.alto).toBeCloseTo(TAMANO_LOGO_SPLASH.width / TAMANO_LOGO_SPLASH.height, 2);
  });
});

describe("continuación animada (AnimatedSplashOverlay)", () => {
  const nativo = fs.readFileSync("src/components/animated-icon.tsx", "utf8");

  test("usa el mismo recurso y el mismo ancho que el splash nativo", () => {
    expect(nativo).toContain("require('@/assets/images/splash-icon.png')");
    expect(TAMANO_LOGO_SPLASH.width).toBe(splash?.[1].imageWidth);
  });

  test("misma animación de siempre: 600 ms y oculta el splash nativo al montar", () => {
    expect(nativo).toContain("const DURATION = 600;");
    expect(nativo).toContain("splashKeyframe.duration(DURATION)");
    expect(nativo).toContain("SplashScreen.hideAsync()");
  });

  test("en web no hay overlay (no hay splash nativo que continuar)", () => {
    expect(fs.readFileSync("src/components/animated-icon.web.tsx", "utf8")).toMatch(
      /export function AnimatedSplashOverlay\(\) \{\s*return null;\s*\}/
    );
  });
});

describe("sin recursos de la plantilla de Expo en el arranque", () => {
  test("ya no existen el logo ni el brillo de Expo", () => {
    expect(fs.existsSync("assets/images/expo-logo.png")).toBe(false);
    expect(fs.existsSync("assets/images/logo-glow.png")).toBe(false);
    expect(fs.existsSync("src/components/animated-icon.module.css")).toBe(false);
  });

  test("nadie los referencia (código ni app.json)", () => {
    const archivos = fs
      .readdirSync("src", { recursive: true })
      .map((ruta) => ruta.split("\\").join("/"))
      .filter((ruta) => /\.(ts|tsx|css)$/.test(ruta) && !ruta.includes("__tests__"));
    const conExpo = archivos.filter((ruta) =>
      /expo-logo|logo-glow|expoLogoBackground|AnimatedIcon\b|#3C9FFE|#0274DF/i.test(
        fs.readFileSync(`src/${ruta}`, "utf8")
      )
    );

    expect(conExpo).toEqual([]);
    expect(fs.readFileSync("app.json", "utf8")).not.toMatch(/expo-logo|logo-glow/);
  });
});
