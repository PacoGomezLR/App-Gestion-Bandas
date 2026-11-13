import * as nativo from "../archivos";
import * as web from "../archivos.web";

const fs = jest.requireActual<{
  readFileSync: (ruta: string, codificacion: "utf8") => string;
}>("fs");

// Firma de un PNG (con transparencia o sin ella, los bytes deben llegar intactos)
const BYTES_PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff]);

const fetchOriginal = globalThis.fetch;
const mockFetch = jest.fn<Promise<Response>, [RequestInfo | URL]>();

function respuesta(bytes: Uint8Array, ok = true, status = 200): Response {
  return {
    ok,
    status,
    arrayBuffer: async () => bytes.slice().buffer,
  } as Response;
}

beforeEach(() => {
  mockFetch.mockReset();
  globalThis.fetch = mockFetch as typeof fetch;
});

afterAll(() => {
  globalThis.fetch = fetchOriginal;
});

describe("leerBytesArchivo (web)", () => {
  test("lee la URI blob: del selector con fetch y devuelve un ArrayBuffer", async () => {
    mockFetch.mockResolvedValue(respuesta(BYTES_PNG));

    const bytes = await web.leerBytesArchivo("blob:https://mibanda.expo.app/1234");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith("blob:https://mibanda.expo.app/1234");
    expect(bytes).toBeInstanceOf(ArrayBuffer);
  });

  test("un PNG conserva exactamente sus bytes", async () => {
    mockFetch.mockResolvedValue(respuesta(BYTES_PNG));

    const bytes = await web.leerBytesArchivo("blob:x");

    expect(Array.from(new Uint8Array(bytes))).toEqual(Array.from(BYTES_PNG));
  });

  test("si fetch falla, el error llega a quien llama", async () => {
    mockFetch.mockRejectedValue(new TypeError("Load failed"));

    await expect(web.leerBytesArchivo("blob:caducada")).rejects.toThrow("Load failed");
  });

  test("una respuesta no válida es un error y no se leen bytes parciales", async () => {
    const leer = jest.fn(async () => new ArrayBuffer(3));
    mockFetch.mockResolvedValue({ ok: false, status: 404, arrayBuffer: leer } as unknown as Response);

    await expect(web.leerBytesArchivo("blob:x")).rejects.toThrow("HTTP 404");
    expect(leer).not.toHaveBeenCalled();
  });

  test("si no se puede leer el cuerpo, también es un error", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => {
        throw new Error("cuerpo ilegible");
      },
    } as unknown as Response);

    await expect(web.leerBytesArchivo("blob:x")).rejects.toThrow("cuerpo ilegible");
  });
});

describe("misma API que la versión nativa", () => {
  test("exporta lo mismo", () => {
    expect(Object.keys(web).sort()).toEqual(Object.keys(nativo).sort());
    expect(typeof web.leerBytesArchivo).toBe("function");
    expect(web.leerBytesArchivo.length).toBe(nativo.leerBytesArchivo.length);
  });

  test("la web no importa expo-file-system; la app sí", () => {
    const codigoWeb = fs.readFileSync("src/services/archivos.web.ts", "utf8");
    const codigoNativo = fs.readFileSync("src/services/archivos.ts", "utf8");

    expect(codigoWeb).not.toMatch(/from\s+["']expo-file-system/);
    expect(codigoWeb).not.toMatch(/require\(["']expo-file-system/);
    expect(codigoNativo).toContain('import { File } from "expo-file-system";');
  });

  test("ni la URI ni los bytes se registran", () => {
    const codigoWeb = fs.readFileSync("src/services/archivos.web.ts", "utf8");

    expect(codigoWeb).not.toMatch(/console\./);
  });
});
