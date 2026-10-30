// app-tabs no se puede renderizar en Jest: sus iconos usan "@/assets", que la
// configuración de jest-expo traduce a src/assets (los iconos están en la raíz).
// Se comprueba el código de las pestañas y la carpeta de rutas, que es lo que
// decide Expo Router. Las rutas son relativas a la raíz del proyecto (cwd de Jest).
const fs = jest.requireActual<{
  readdirSync: (ruta: string) => string[];
  readFileSync: (ruta: string, codificacion: "utf8") => string;
}>("fs");

function pestanas(archivo: string): string[] {
  const codigo = fs.readFileSync(archivo, "utf8");

  return [...codigo.matchAll(/Trigger name="([^"]+)"/g)].map(([, nombre]) => nombre);
}

describe("navegación principal", () => {
  test("las pestañas nativas son solo Calendario y Técnicos: ya no existe Músicos", () => {
    const codigo = fs.readFileSync("src/components/app-tabs.tsx", "utf8");

    expect(pestanas("src/components/app-tabs.tsx")).toEqual(["index", "tecnicos"]);
    expect(codigo).toContain("Calendario");
    expect(codigo).toContain("Técnicos");
    expect(codigo).not.toMatch(/Músicos|miembros/i);
  });

  test("la versión web tampoco tiene pestaña de Músicos", () => {
    const codigo = fs.readFileSync("src/components/app-tabs.web.tsx", "utf8");

    expect(pestanas("src/components/app-tabs.web.tsx")).toEqual(["home", "tecnicos"]);
    expect(codigo).not.toMatch(/Músicos|miembros/i);
  });

  test("no existe ninguna pantalla de músicos entre las rutas de la app", () => {
    // En Expo Router cada archivo de src/app es una ruta accesible
    const rutas = fs.readdirSync("src/app");

    expect(rutas.filter((archivo) => /miembro|m[uú]sico/i.test(archivo))).toEqual([]);
    expect(rutas).toEqual(expect.arrayContaining(["_layout.tsx", "index.tsx", "tecnicos.tsx"]));
    expect(() => require("../../app/miembros")).toThrow(/Cannot find module/);
  });

  test("el layout ya no monta ningún provider de músicos", () => {
    const codigo = fs.readFileSync("src/app/_layout.tsx", "utf8");

    expect(codigo).toContain("<EventosProvider>");
    expect(codigo).toContain("<TecnicosProvider>");
    expect(codigo).not.toMatch(/Miembros/);
  });
});
