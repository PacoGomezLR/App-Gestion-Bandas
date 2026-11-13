import { act, render } from "@testing-library/react-native";

import { useBandaContext } from "../../context/BandaContext";
import { LogoBandaProvider, TAMANO_MAXIMO_LOGO, useLogoBandaContext } from "../../context/LogoBandaContext";
import type { CambioLogo, DatosLogo } from "../../services/supabase/logoBanda";

// Guardado del logo como en web / iPhone: proveedor real con la lectura de bytes
// de archivos.web.ts (fetch de la URI blob: del selector). Se simulan la banda,
// el repositorio (Supabase Storage) y fetch.

jest.mock("../../lib/supabase", () => ({ supabase: {} }));
jest.mock("../../context/BandaContext", () => ({ useBandaContext: jest.fn() }));
// Metro resuelve ../services/archivos a archivos.web.ts en web
jest.mock("../../services/archivos", () => jest.requireActual("../../services/archivos.web"));

const mockObtener = jest.fn<Promise<DatosLogo>, [string]>();
const mockGuardar = jest.fn<Promise<DatosLogo>, [string, CambioLogo, string | null]>();
const mockQuitar = jest.fn<Promise<void>, [string, string | null]>();

jest.mock("../../services/supabase/logoBanda", () => ({
  crearRepositorioLogoBandaSupabase: (bandaId: string) => ({
    obtener: () => mockObtener(bandaId),
    urlPublica: (ruta: string) => `https://cdn.test/${ruta}`,
    guardar: (cambio: CambioLogo, anterior: string | null) => mockGuardar(bandaId, cambio, anterior),
    quitar: (anterior: string | null) => mockQuitar(bandaId, anterior),
  }),
}));

const mockFetch = jest.fn<Promise<Response>, [RequestInfo | URL]>();
const fetchOriginal = globalThis.fetch;

// Firma de un PNG
const BYTES_PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const ANTERIOR: DatosLogo = { ruta: "b1/logo-1.png", escala: 1.5 };
const URI_BLOB = "blob:https://mibanda.expo.app/0b7c";

function respuesta(bytes: Uint8Array): Response {
  return { ok: true, status: 200, arrayBuffer: async () => bytes.slice().buffer } as Response;
}

let contexto: ReturnType<typeof useLogoBandaContext> | null = null;

function Captura() {
  contexto = useLogoBandaContext();
  return null;
}

function actual() {
  if (contexto === null) {
    throw new Error("Sin contexto del logo");
  }

  return contexto;
}

async function montar() {
  await render(
    <LogoBandaProvider>
      <Captura />
    </LogoBandaProvider>
  );
  await act(async () => {});
}

async function guardar(mimeType: string, fileName: string) {
  let resultado = false;

  await act(async () => {
    resultado = await actual().guardarLogo({ imagen: { uri: URI_BLOB, mimeType, fileName }, escala: 1.2 });
  });

  return resultado;
}

beforeEach(() => {
  jest.clearAllMocks();
  contexto = null;
  globalThis.fetch = mockFetch as typeof fetch;
  mockFetch.mockResolvedValue(respuesta(BYTES_PNG));
  jest.mocked(useBandaContext).mockReturnValue({
    bandaActual: { id: "b1", nombre: "Rockabanda" },
    esAdmin: true,
  } as unknown as ReturnType<typeof useBandaContext>);
  mockObtener.mockResolvedValue(ANTERIOR);
  mockGuardar.mockImplementation(async (_banda, cambio) => ({ ruta: "b1/logo-2.png", escala: cambio.escala }));
  mockQuitar.mockResolvedValue(undefined);
});

afterAll(() => {
  globalThis.fetch = fetchOriginal;
});

describe("logo en web", () => {
  test("lee la URI blob: con fetch y sube el PNG con sus mismos bytes, sustituyendo el anterior", async () => {
    await montar();

    expect(await guardar("image/png", "logo.png")).toBe(true);

    expect(mockFetch).toHaveBeenCalledWith(URI_BLOB);
    expect(mockGuardar).toHaveBeenCalledTimes(1);

    const [banda, cambio, anterior] = mockGuardar.mock.calls[0];

    expect(banda).toBe("b1");
    expect(anterior).toBe("b1/logo-1.png");
    expect(cambio.escala).toBe(1.2);
    expect(cambio.imagen?.mime).toBe("image/png");
    expect(Array.from(new Uint8Array(cambio.imagen?.bytes ?? new ArrayBuffer(0)))).toEqual(Array.from(BYTES_PNG));
    expect(actual().url).toBe("https://cdn.test/b1/logo-2.png");
    expect(actual().escala).toBe(1.2);
  });

  test.each([
    ["image/jpeg", "foto.jpg"],
    ["image/webp", "logo.webp"],
  ])("JPEG y WebP se suben con su tipo (%s)", async (mime, nombre) => {
    await montar();

    expect(await guardar(mime, nombre)).toBe(true);

    expect(mockGuardar.mock.calls[0][1].imagen?.mime).toBe(mime);
  });

  test("un formato no admitido no llega a leerse ni a subirse (mismas reglas)", async () => {
    await montar();

    expect(await guardar("image/gif", "animado.gif")).toBe(false);

    expect(actual().errorOperacion).toBe("Formato no admitido: elige una imagen PNG, JPG o WebP");
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockGuardar).not.toHaveBeenCalled();
  });

  test("más de 2 MB: aviso de tamaño y nada se sube", async () => {
    mockFetch.mockResolvedValue(respuesta(new Uint8Array(TAMANO_MAXIMO_LOGO + 1)));
    await montar();

    expect(await guardar("image/png", "enorme.png")).toBe(false);

    expect(actual().errorOperacion).toBe("La imagen es demasiado grande: el máximo son 2 MB");
    expect(mockGuardar).not.toHaveBeenCalled();
  });

  test("si fetch falla: error de siempre, nada se sube y el logo anterior sigue", async () => {
    mockFetch.mockRejectedValue(new TypeError("Load failed"));
    const errorConsola = jest.spyOn(console, "error").mockImplementation(() => {});
    await montar();

    expect(await guardar("image/png", "logo.png")).toBe(false);

    expect(actual().errorOperacion).toBe("No se ha podido guardar el logo");
    expect(mockGuardar).not.toHaveBeenCalled();
    expect(mockQuitar).not.toHaveBeenCalled();
    expect(actual().url).toBe("https://cdn.test/b1/logo-1.png");
    expect(actual().escala).toBe(1.5);
    // Se puede volver a intentar
    expect(actual().procesando).toBe(false);
    // El aviso de desarrollo no incluye la URI
    expect(JSON.stringify(errorConsola.mock.calls)).not.toContain(URI_BLOB);
    errorConsola.mockRestore();
  });

  test("solo la escala no lee ningún archivo; quitar el logo tampoco", async () => {
    await montar();

    await act(async () => {
      await actual().guardarLogo({ escala: 1.8 });
    });
    await act(async () => {
      await actual().quitarLogo();
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockGuardar).toHaveBeenCalledWith("b1", { escala: 1.8 }, "b1/logo-1.png");
    expect(mockQuitar).toHaveBeenCalledTimes(1);
    expect(actual().url).toBeNull();
  });
});

describe("Android sigue con la versión nativa", () => {
  test("LogoBandaContext importa ../services/archivos (Metro elige .web.ts solo en web)", () => {
    const fs = jest.requireActual<{ readFileSync: (ruta: string, codificacion: "utf8") => string }>("fs");
    const contextoLogo = fs.readFileSync("src/context/LogoBandaContext.tsx", "utf8");

    expect(contextoLogo).toContain('import { leerBytesArchivo } from "../services/archivos";');
    expect(contextoLogo).not.toMatch(/archivos\.web|Platform\.OS/);
  });
});
