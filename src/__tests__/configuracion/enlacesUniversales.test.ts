// Revisión estática de la configuración de enlaces (App Links / Universal Links).
// Evita dejar datos de Apple inventados: el AASA y associatedDomains solo se
// añaden cuando existan un Team ID y un bundle identifier reales.
// Rutas relativas a la raíz del proyecto (cwd de Jest).
const fs = jest.requireActual<{
  readFileSync: (ruta: string, codificacion: "utf8") => string;
  existsSync: (ruta: string) => boolean;
}>("fs");

interface ConfigExpo {
  scheme: string;
  android?: { package?: string };
  ios?: { bundleIdentifier?: string; associatedDomains?: string[]; appleTeamId?: string };
}

const expo = (JSON.parse(fs.readFileSync("app.json", "utf8")) as { expo: ConfigExpo }).expo;
const RUTA_AASA = "public/.well-known/apple-app-site-association";
const DOMINIO = "mibanda.expo.app";
// Team ID de Apple: 10 caracteres alfanuméricos en mayúscula
const APP_ID_REAL = /^[A-Z0-9]{10}\.[A-Za-z0-9.-]+$/;
const DATOS_FALSOS = /ABCDE12345|QQ57RJ5UTD|TEAM_?ID|APPLE_TEAM|PLACEHOLDER|TODO|com\.example|XXXX/i;

describe("Android y el scheme no cambian", () => {
  test("scheme mibanda (auth/callback y fallback) y package Android", () => {
    expect(expo.scheme).toBe("mibanda");
    expect(expo.android?.package).toBe("com.pacogomezlr.mibanda");
  });
});

describe("iOS Universal Links", () => {
  test("associatedDomains, si existe, usa exactamente applinks:mibanda.expo.app", () => {
    const dominios = expo.ios?.associatedDomains;

    if (dominios === undefined) {
      return;
    }

    expect(dominios).toEqual([`applinks:${DOMINIO}`]);
    // Sin bundle identifier real no hay app iOS a la que asociar el dominio
    expect(expo.ios?.bundleIdentifier).toBeDefined();
  });

  test("ningún dato de Apple inventado en app.json", () => {
    const ios = JSON.stringify(expo.ios ?? {});

    expect(ios).not.toMatch(DATOS_FALSOS);
  });

  test("si existe el AASA, solo contiene datos reales y la ruta de invitación", () => {
    if (!fs.existsSync(RUTA_AASA)) {
      return;
    }

    const texto = fs.readFileSync(RUTA_AASA, "utf8");
    expect(texto).not.toMatch(DATOS_FALSOS);

    const aasa = JSON.parse(texto) as {
      applinks: { details: { appIDs: string[]; components: { "/": string }[] }[] };
    };
    const bundle = expo.ios?.bundleIdentifier;

    expect(bundle).toBeDefined();
    for (const detalle of aasa.applinks.details) {
      for (const appId of detalle.appIDs) {
        expect(appId).toMatch(APP_ID_REAL);
        expect(appId.endsWith(`.${bundle}`)).toBe(true);
      }
      // Solo /invitacion: nada de todo el dominio ni de auth/callback
      expect(detalle.components.map((componente) => componente["/"])).toEqual(["/invitacion"]);
    }
    expect(texto).not.toContain("auth/callback");
  });

  test("sin Team ID ni bundle identifier no se sirve un AASA (ni associatedDomains)", () => {
    if (expo.ios?.bundleIdentifier !== undefined) {
      return;
    }

    expect(fs.existsSync(RUTA_AASA)).toBe(false);
    expect(expo.ios?.associatedDomains).toBeUndefined();
  });
});
