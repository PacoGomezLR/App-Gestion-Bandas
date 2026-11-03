import { ErrorRepositorio } from "../errores";
import { convertirFilasIntegrantes, crearRepositorioIntegrantesSupabase } from "../integrantes";

interface RespuestaSimulada {
  data: unknown;
  error: { code?: string; message: string } | null;
}

const mockFrom = jest.fn();
const mockRpc = jest.fn<Promise<RespuestaSimulada>, [string, Record<string, unknown>]>();

jest.mock("../../../lib/supabase", () => ({
  supabase: {
    from: (tabla: string) => mockFrom(tabla),
    rpc: (funcion: string, parametros: Record<string, unknown>) => mockRpc(funcion, parametros),
  },
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe("repositorio de integrantes (Supabase)", () => {
  test("lista los nombres de la banda con UNA sola llamada a la RPC", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        { usuario_id: "u1", nombre_visible: "Paco Gómez" },
        { usuario_id: "u2", nombre_visible: null },
      ],
      error: null,
    });

    const integrantes = await crearRepositorioIntegrantesSupabase("b1").listar();

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("listar_integrantes_banda", { p_banda_id: "b1" });
    // Ninguna consulta directa a perfiles (no se pide un perfil por persona)
    expect(mockFrom).not.toHaveBeenCalled();
    expect(integrantes).toEqual([
      { usuarioId: "u1", nombreVisible: "Paco Gómez" },
      { usuarioId: "u2", nombreVisible: null },
    ]);
  });

  test("aunque llegaran datos de más, solo se conservan usuario_id y nombre_visible", () => {
    const [integrante] = convertirFilasIntegrantes([
      { usuario_id: "u1", nombre_visible: "Paco", email: "paco@ejemplo.com", rol: "admin" },
    ]);

    expect(integrante).toEqual({ usuarioId: "u1", nombreVisible: "Paco" });
    expect(integrante).not.toHaveProperty("email");
    expect(integrante).not.toHaveProperty("rol");
  });

  test("una banda ajena (42501 en la RPC) es un error sin_permiso", async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { code: "42501", message: "Banda no disponible" } });

    await expect(crearRepositorioIntegrantesSupabase("ajena").listar()).rejects.toEqual(
      new ErrorRepositorio("sin_permiso")
    );
  });

  test("solo lectura: no ofrece ninguna forma de cambiar nombres", () => {
    expect(Object.keys(crearRepositorioIntegrantesSupabase("b1"))).toEqual(["listar"]);
  });

  test("rechaza respuestas mal formadas", () => {
    expect(() => convertirFilasIntegrantes({})).toThrow();
    expect(() => convertirFilasIntegrantes([{ usuario_id: 1, nombre_visible: "Paco" }])).toThrow();
    expect(() => convertirFilasIntegrantes([{ usuario_id: "u1", nombre_visible: 3 }])).toThrow();
  });
});
