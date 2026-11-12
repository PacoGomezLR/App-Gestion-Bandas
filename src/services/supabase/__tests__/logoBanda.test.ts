import { type ArchivoLogo, BUCKET_LOGOS, crearRepositorioLogoBandaSupabase } from "../logoBanda";

interface Respuesta {
  data: unknown;
  error: { code?: string; message: string } | null;
}

// Consulta encadenable simulada: registra las llamadas y resuelve la respuesta
class Consulta implements PromiseLike<Respuesta> {
  readonly llamadas: { metodo: string; args: unknown[] }[] = [];

  constructor(private readonly respuesta: Respuesta) {}

  private registrar(metodo: string, args: unknown[]) {
    this.llamadas.push({ metodo, args });
    return this;
  }

  select(...args: unknown[]) {
    return this.registrar("select", args);
  }

  update(...args: unknown[]) {
    return this.registrar("update", args);
  }

  eq(...args: unknown[]) {
    return this.registrar("eq", args);
  }

  maybeSingle() {
    return this.registrar("maybeSingle", []);
  }

  then<R1 = Respuesta, R2 = never>(
    onfulfilled?: ((valor: Respuesta) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((motivo: unknown) => R2 | PromiseLike<R2>) | null
  ): PromiseLike<R1 | R2> {
    return Promise.resolve(this.respuesta).then(onfulfilled, onrejected);
  }
}

const mockFrom = jest.fn<Consulta, [string]>();
const mockStorageFrom = jest.fn<unknown, [string]>();
const mockUpload = jest.fn<Promise<{ error: { message: string } | null }>, [string, ArrayBuffer, object]>();
const mockRemove = jest.fn<Promise<{ error: null }>, [string[]]>();

jest.mock("../../../lib/supabase", () => ({
  supabase: {
    from: (tabla: string) => mockFrom(tabla),
    storage: {
      from: (bucket: string) => {
        mockStorageFrom(bucket);

        return {
          upload: (ruta: string, datos: ArrayBuffer, opciones: object) => mockUpload(ruta, datos, opciones),
          remove: (rutas: string[]) => mockRemove(rutas),
          getPublicUrl: (ruta: string) => ({ data: { publicUrl: `https://cdn.test/${ruta}` } }),
        };
      },
    },
  },
}));

function responder(respuesta: Respuesta): Consulta {
  const consulta = new Consulta(respuesta);
  mockFrom.mockReturnValueOnce(consulta);
  return consulta;
}

// La fila que devuelve el UPDATE (con .select)
function filaGuardada(ruta: string | null, escala: number | string = 1): Respuesta {
  return { data: [{ logo_path: ruta, logo_scale: escala }], error: null };
}

const BANDA = "10000000-0000-0000-0000-00000000000a";
const ANTERIOR = `${BANDA}/logo-viejo.png`;

// Firma real de un PNG (8 bytes): lo que se sube tiene que ser exactamente esto
const FIRMA_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function archivo(mime: ArchivoLogo["mime"], bytes: number[] = FIRMA_PNG): ArchivoLogo {
  return { bytes: new Uint8Array(bytes).buffer, mime };
}

const PNG = archivo("image/png");

const repositorio = () => crearRepositorioLogoBandaSupabase(BANDA);

afterEach(() => {
  jest.restoreAllMocks();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUpload.mockResolvedValue({ error: null });
  mockRemove.mockResolvedValue({ error: null });
});

describe("leer", () => {
  test("una sola consulta de su banda: ruta y escala", async () => {
    const consulta = responder({ data: { logo_path: `${BANDA}/logo-1.png`, logo_scale: 1.7 }, error: null });

    await expect(repositorio().obtener()).resolves.toEqual({ ruta: `${BANDA}/logo-1.png`, escala: 1.7 });
    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(consulta.llamadas).toContainEqual({ metodo: "select", args: ["logo_path, logo_scale"] });
    expect(consulta.llamadas).toContainEqual({ metodo: "eq", args: ["id", BANDA] });
  });

  test("numeric puede llegar como texto: se convierte a número", async () => {
    responder({ data: { logo_path: `${BANDA}/logo-1.png`, logo_scale: "2.50" }, error: null });

    await expect(repositorio().obtener()).resolves.toMatchObject({ escala: 2.5 });
  });

  test.each([null, { logo_path: null, logo_scale: 1 }, { logo_path: "", logo_scale: 1 }])(
    "sin logo: ruta null y escala 1 (%p)",
    async (data) => {
      responder({ data, error: null });

      await expect(repositorio().obtener()).resolves.toEqual({ ruta: null, escala: 1 });
    }
  );

  test("con la 012 pero sin la 013: el logo se sigue viendo, a tamaño normal", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    responder({ data: null, error: { code: "42703", message: "column bandas.logo_scale does not exist" } });
    const segunda = responder({ data: { logo_path: `${BANDA}/logo-1.png` }, error: null });

    await expect(repositorio().obtener()).resolves.toEqual({ ruta: `${BANDA}/logo-1.png`, escala: 1 });
    expect(segunda.llamadas).toContainEqual({ metodo: "select", args: ["logo_path"] });
  });

  test("sin la 012 (falta logo_path) llega como error y deja el motivo en Metro", async () => {
    const consola = jest.spyOn(console, "error").mockImplementation(() => {});
    responder({ data: null, error: { code: "42703", message: "column bandas.logo_path does not exist" } });

    await expect(repositorio().obtener()).rejects.toThrow();
    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(consola).toHaveBeenCalledWith(
      "[Logo de la banda] Falla al leer:",
      expect.objectContaining({ code: "42703", message: "column bandas.logo_path does not exist" })
    );
  });

  test("la URL pública sale del bucket de logos", () => {
    expect(repositorio().urlPublica(`${BANDA}/logo-1.png`)).toBe(`https://cdn.test/${BANDA}/logo-1.png`);
    expect(mockStorageFrom).toHaveBeenCalledWith(BUCKET_LOGOS);
  });
});

describe("guardar imagen nueva + escala", () => {
  test("PNG: se sube tal cual (image/png, .png) y ruta y escala se guardan en una sola escritura", async () => {
    const consulta = responder(filaGuardada(`${BANDA}/logo-2.png`, 1.7));

    const guardado = await repositorio().guardar({ imagen: PNG, escala: 1.7 }, ANTERIOR);

    const [ruta, datos, opciones] = mockUpload.mock.calls[0];
    expect(ruta).toMatch(new RegExp(`^${BANDA}/logo-\\d+\\.png$`));
    // El mismo archivo, sin decodificar ni recomprimir: la transparencia no se toca
    expect(datos).toBe(PNG.bytes);
    expect(Array.from(new Uint8Array(datos))).toEqual(FIRMA_PNG);
    expect(opciones).toEqual({ contentType: "image/png", upsert: false });
    expect(JSON.stringify(mockUpload.mock.calls)).not.toContain("image/jpeg");
    // Una única actualización con las dos cosas
    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(consulta.llamadas).toContainEqual({ metodo: "update", args: [{ logo_path: ruta, logo_scale: 1.7 }] });
    expect(consulta.llamadas).toContainEqual({ metodo: "eq", args: ["id", BANDA] });
    expect(mockRemove).toHaveBeenCalledWith([ANTERIOR]);
    expect(guardado).toEqual({ ruta: `${BANDA}/logo-2.png`, escala: 1.7 });
  });

  test.each([
    ["image/jpeg", "jpg"],
    ["image/webp", "webp"],
  ] as const)("%s se sube con su tipo y extensión .%s", async (mime, extension) => {
    responder(filaGuardada(`${BANDA}/logo-2.${extension}`));

    await repositorio().guardar({ imagen: archivo(mime, [1, 2, 3]), escala: 1 }, null);

    expect(mockUpload.mock.calls[0][0].endsWith(`.${extension}`)).toBe(true);
    expect(mockUpload.mock.calls[0][2]).toEqual({ contentType: mime, upsert: false });
  });

  test("la escala se guarda dentro de los límites", async () => {
    const consulta = responder(filaGuardada(`${BANDA}/logo-2.png`, 2.5));

    await repositorio().guardar({ imagen: PNG, escala: 9 }, null);

    expect(consulta.llamadas.find(({ metodo }) => metodo === "update")?.args[0]).toMatchObject({ logo_scale: 2.5 });
  });

  test("sin logo anterior no borra nada", async () => {
    responder(filaGuardada(`${BANDA}/logo-2.png`));

    await repositorio().guardar({ imagen: PNG, escala: 1 }, null);

    expect(mockRemove).not.toHaveBeenCalled();
  });

  test("si la subida falla (por ejemplo, sin bucket) no toca la banda y deja el motivo en Metro", async () => {
    const consola = jest.spyOn(console, "error").mockImplementation(() => {});
    mockUpload.mockResolvedValue({
      error: Object.assign(new Error("Bucket not found"), {
        name: "StorageApiError",
        statusCode: "404",
        code: "NoSuchBucket",
      }),
    } as unknown as { error: { message: string } });

    await expect(repositorio().guardar({ imagen: PNG, escala: 1.5 }, ANTERIOR)).rejects.toMatchObject({
      motivo: "desconocido",
    });

    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockRemove).not.toHaveBeenCalled();
    expect(consola).toHaveBeenCalledWith("[Logo de la banda] Falla al subir:", {
      name: "StorageApiError",
      message: "Bucket not found",
      code: "NoSuchBucket",
      statusCode: "404",
      error: undefined,
    });
    // Ni la imagen ni nada más llegan al registro
    expect(JSON.stringify(consola.mock.calls)).not.toContain("137,80,78,71");
  });

  test("si no se puede guardar en la banda, borra el archivo nuevo y conserva el anterior", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    responder({ data: [], error: null });

    await expect(repositorio().guardar({ imagen: PNG, escala: 1.5 }, ANTERIOR)).rejects.toMatchObject({
      motivo: "sin_permiso",
    });

    const rutaNueva = mockUpload.mock.calls[0][0];
    expect(mockRemove).toHaveBeenCalledTimes(1);
    expect(mockRemove).toHaveBeenCalledWith([rutaNueva]);
  });

  test("si borrar el anterior falla, el cambio sigue hecho", async () => {
    responder(filaGuardada(`${BANDA}/logo-2.png`));
    mockRemove.mockRejectedValue(new Error("sin red"));

    await expect(repositorio().guardar({ imagen: PNG, escala: 1 }, ANTERIOR)).resolves.toMatchObject({
      ruta: `${BANDA}/logo-2.png`,
    });
  });
});

describe("guardar solo la escala", () => {
  test("no sube ni borra ningún archivo: solo actualiza logo_scale", async () => {
    const consulta = responder(filaGuardada(ANTERIOR, 0.8));

    const guardado = await repositorio().guardar({ escala: 0.8 }, ANTERIOR);

    expect(mockUpload).not.toHaveBeenCalled();
    expect(mockRemove).not.toHaveBeenCalled();
    expect(consulta.llamadas).toContainEqual({ metodo: "update", args: [{ logo_scale: 0.8 }] });
    expect(guardado).toEqual({ ruta: ANTERIOR, escala: 0.8 });
  });

  test("si la RLS lo descarta no finge que ha funcionado", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    responder({ data: [], error: null });

    await expect(repositorio().guardar({ escala: 2 }, ANTERIOR)).rejects.toMatchObject({ motivo: "sin_permiso" });
  });
});

describe("quitar", () => {
  test("deja la banda sin logo, con la escala normal, y borra el archivo", async () => {
    const consulta = responder(filaGuardada(null));

    await repositorio().quitar(ANTERIOR);

    expect(consulta.llamadas).toContainEqual({ metodo: "update", args: [{ logo_path: null, logo_scale: 1 }] });
    expect(mockRemove).toHaveBeenCalledWith([ANTERIOR]);
  });

  test("si la RLS lo descarta no finge que ha funcionado ni borra el archivo", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    responder({ data: [], error: null });

    await expect(repositorio().quitar(ANTERIOR)).rejects.toMatchObject({ motivo: "sin_permiso" });
    expect(mockRemove).not.toHaveBeenCalled();
  });
});
