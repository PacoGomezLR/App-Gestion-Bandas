import { Colores } from "../../constants/theme";

// MI Banda instalable en iPhone (Safari → Compartir → Añadir a pantalla de
// inicio): manifest, iconos, HTML de todas las páginas y nada de service worker.
// Rutas relativas a la raíz del proyecto (cwd de Jest).

jest.mock("../../global.css", () => ({}));

const fs = jest.requireActual<{
  existsSync: (ruta: string) => boolean;
  readFileSync: {
    (ruta: string, codificacion: "utf8"): string;
    (ruta: string): Uint8Array;
  };
  readdirSync: (ruta: string, opciones: { recursive: true }) => string[];
}>("fs");
const zlib = jest.requireActual<{ inflateSync: (datos: Uint8Array) => Uint8Array }>("zlib");

interface Manifest {
  name: string;
  short_name: string;
  start_url: string;
  scope: string;
  display: string;
  background_color: string;
  theme_color: string;
  lang: string;
  icons: { src: string; sizes: string; type: string; purpose?: string }[];
}

const manifest = JSON.parse(fs.readFileSync("public/manifest.json", "utf8")) as Manifest;
const html = fs.readFileSync("src/app/+html.tsx", "utf8");

function leerUint32(bytes: Uint8Array, posicion: number): number {
  return ((bytes[posicion] << 24) | (bytes[posicion + 1] << 16) | (bytes[posicion + 2] << 8) | bytes[posicion + 3]) >>> 0;
}

// Lector mínimo de PNG (solo zlib de Node): tamaño y si todos los píxeles son opacos
function leerPng(ruta: string): { ancho: number; alto: number; opaco: boolean } {
  const bytes = fs.readFileSync(ruta);
  const firma = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

  if (!firma.every((byte, i) => bytes[i] === byte)) {
    throw new Error(`${ruta} no es un PNG`);
  }

  const ancho = leerUint32(bytes, 16);
  const alto = leerUint32(bytes, 20);
  const profundidad = bytes[24];
  const tipoColor = bytes[25];
  const entrelazado = bytes[28];

  // RGB sin canal alfa: opaco por definición
  if (tipoColor === 2) {
    return { ancho, alto, opaco: true };
  }

  if (tipoColor !== 6 || profundidad !== 8 || entrelazado !== 0) {
    throw new Error(`${ruta}: formato PNG no previsto en el test`);
  }

  const trozos: Uint8Array[] = [];
  for (let posicion = 8; posicion < bytes.length; ) {
    const longitud = leerUint32(bytes, posicion);
    const tipo = String.fromCharCode(...bytes.slice(posicion + 4, posicion + 8));

    if (tipo === "IDAT") {
      trozos.push(bytes.slice(posicion + 8, posicion + 8 + longitud));
    }

    posicion += 12 + longitud;
  }

  const comprimido = new Uint8Array(trozos.reduce((total, trozo) => total + trozo.length, 0));
  trozos.reduce((desplazamiento, trozo) => {
    comprimido.set(trozo, desplazamiento);
    return desplazamiento + trozo.length;
  }, 0);
  const datos = zlib.inflateSync(comprimido);

  // Se deshacen los filtros por fila (RGBA de 8 bits: 4 bytes por píxel)
  const porPixel = 4;
  const porFila = ancho * porPixel;
  const anterior = new Uint8Array(porFila);
  const actual = new Uint8Array(porFila);
  let opaco = true;

  for (let fila = 0; fila < alto; fila++) {
    const inicio = fila * (porFila + 1);
    const filtro = datos[inicio];

    for (let i = 0; i < porFila; i++) {
      const crudo = datos[inicio + 1 + i];
      const izquierda = i >= porPixel ? actual[i - porPixel] : 0;
      const arriba = anterior[i];
      const arribaIzquierda = i >= porPixel ? anterior[i - porPixel] : 0;
      let prediccion = 0;

      if (filtro === 1) prediccion = izquierda;
      else if (filtro === 2) prediccion = arriba;
      else if (filtro === 3) prediccion = Math.floor((izquierda + arriba) / 2);
      else if (filtro === 4) {
        const p = izquierda + arriba - arribaIzquierda;
        const pa = Math.abs(p - izquierda);
        const pb = Math.abs(p - arriba);
        const pc = Math.abs(p - arribaIzquierda);
        prediccion = pa <= pb && pa <= pc ? izquierda : pb <= pc ? arriba : arribaIzquierda;
      }

      actual[i] = (crudo + prediccion) & 0xff;
    }

    for (let i = 3; i < porFila; i += porPixel) {
      if (actual[i] !== 255) {
        opaco = false;
      }
    }

    anterior.set(actual);
  }

  return { ancho, alto, opaco };
}

describe("manifest", () => {
  test("nombre, inicio, ámbito y modo standalone", () => {
    expect(manifest.name).toBe("MI Banda");
    expect(manifest.short_name).toBe("MI Banda");
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.lang).toBe("es");
  });

  test("tema oscuro: los mismos colores que la app", () => {
    expect(manifest.background_color).toBe("#0B0D0F");
    expect(manifest.theme_color).toBe("#0B0D0F");
    expect(manifest.background_color).toBe(Colores.background);
  });

  test("iconos 192 y 512 declarados (sin maskable: no se ha diseñado para recorte)", () => {
    expect(manifest.icons).toEqual([
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ]);
  });
});

describe("iconos", () => {
  test.each([
    ["public/icon-192.png", 192],
    ["public/icon-512.png", 512],
    ["public/apple-touch-icon.png", 180],
  ])("%s: PNG cuadrado de %ipx y opaco", (ruta, lado) => {
    const png = leerPng(ruta);

    expect(png.ancho).toBe(lado);
    expect(png.alto).toBe(lado);
    // iOS pinta en negro lo transparente de un apple-touch-icon
    expect(png.opaco).toBe(true);
  });

  test("control: el lector detecta la translucidez del icono original (base de los anteriores)", () => {
    const original = leerPng("assets/images/icon.png");

    expect(original.ancho).toBe(1024);
    expect(original.opaco).toBe(false);
  });
});

describe("+html.tsx", () => {
  test("enlaza el manifest y el icono de Apple", () => {
    expect(html).toContain('<link rel="manifest" href="/manifest.json" />');
    expect(html).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png" />');
  });

  test("metas de la app web instalada", () => {
    expect(html).toContain('<meta name="theme-color" content={Colores.background} />');
    expect(html).toContain('<meta name="apple-mobile-web-app-capable" content="yes" />');
    expect(html).toContain('<meta name="mobile-web-app-capable" content="yes" />');
    expect(html).toContain('<meta name="apple-mobile-web-app-title" content="MI Banda" />');
    expect(html).toContain('<meta name="apple-mobile-web-app-status-bar-style" content="black" />');
  });

  test("viewport con viewport-fit=cover (zonas seguras del iPhone)", () => {
    expect(html).toContain(
      'content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"'
    );
  });

  test("mantiene charset, compatibilidad, noindex y no-referrer", () => {
    expect(html).toContain('<meta charSet="utf-8" />');
    expect(html).toContain('<meta httpEquiv="X-UA-Compatible" content="IE=edge" />');
    expect(html).toContain('<meta name="robots" content="noindex, nofollow" />');
    expect(html).toContain('<meta name="referrer" content="no-referrer" />');
  });

  test("pantalla completa con 100dvh y sin doble scroll (solo los ScrollView)", () => {
    expect(html).toContain("html,body,#root{height:100%}");
    expect(html).toContain("body{overflow:hidden;overscroll-behavior:none}");
    expect(html).toContain("#root{display:flex;height:100dvh}");
    expect(html).toContain("html,body{background-color:${Colores.background}}");
  });
});

describe("sin service worker (v1 necesita conexión)", () => {
  test("no hay sw.js, Workbox ni registro de service worker", () => {
    expect(fs.existsSync("public/sw.js")).toBe(false);
    expect(fs.existsSync("public/service-worker.js")).toBe(false);
    expect(fs.existsSync("workbox-config.js")).toBe(false);

    const archivos = fs
      .readdirSync("src", { recursive: true })
      .map((ruta) => ruta.replace(/\\/g, "/"))
      .filter((ruta) => /\.(ts|tsx)$/.test(ruta) && !ruta.includes("__tests__"));
    const conServiceWorker = archivos.filter((ruta) =>
      /serviceWorker|workbox/i.test(fs.readFileSync(`src/${ruta}`, "utf8"))
    );

    expect(conServiceWorker).toEqual([]);

    const paquete = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const dependencias = Object.keys({ ...paquete.dependencies, ...paquete.devDependencies });

    expect(dependencias.filter((nombre) => /workbox|service-?worker|pwa/i.test(nombre))).toEqual([]);
  });
});

describe("textos", () => {
  test("ningún texto de la app dice que haga falta la app instalada ni que sea solo para Android", () => {
    const archivos = fs
      .readdirSync("src", { recursive: true })
      .map((ruta) => ruta.replace(/\\/g, "/"))
      .filter((ruta) => /\.tsx$/.test(ruta) && !ruta.includes("__tests__"));
    // Solo textos que ve la persona: los comentarios pueden explicar la plataforma
    const incorrectos = archivos.filter((ruta) =>
      /con la app instalada|app para Android|app para el móvil|no está disponible para iPhone|no está instalada en este dispositivo/.test(
        fs
          .readFileSync(`src/${ruta}`, "utf8")
          .replace(/\/\/.*$/gm, "")
          .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
      )
    );

    expect(incorrectos).toEqual([]);
  });
});
