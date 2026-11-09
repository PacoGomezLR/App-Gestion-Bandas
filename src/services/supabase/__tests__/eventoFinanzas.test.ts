import { crearRepositorioEventoFinanzasSupabase } from "../eventoFinanzas";

interface Respuesta {
  data: unknown;
  error: { code?: string; message: string } | null;
}

const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn<Promise<Respuesta>, [string, string]>();

jest.mock("../../../lib/supabase", () => ({
  supabase: {
    from: (tabla: string) => {
      mockFrom(tabla);

      return {
        select: (columnas: string) => {
          mockSelect(columnas);

          return { eq: (columna: string, valor: string) => mockEq(columna, valor) };
        },
      };
    },
  },
}));

const repositorio = crearRepositorioEventoFinanzasSupabase("b1");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("repositorio de cachés", () => {
  test("una sola consulta trae los de toda la banda, indexados por evento", async () => {
    mockEq.mockResolvedValue({
      data: [
        { evento_id: "e1", cache_centimos: 120000 },
        { evento_id: "e2", cache_centimos: 0 },
      ],
      error: null,
    });

    await expect(repositorio.listar()).resolves.toEqual({ e1: 120000, e2: 0 });

    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledWith("evento_finanzas");
    expect(mockSelect).toHaveBeenCalledWith("evento_id, cache_centimos");
    expect(mockEq).toHaveBeenCalledWith("banda_id", "b1");
  });

  test("sin filas: ningún evento tiene caché", async () => {
    mockEq.mockResolvedValue({ data: [], error: null });

    await expect(repositorio.listar()).resolves.toEqual({});
  });

  test("un rechazo de la RLS llega como error, no como lista vacía", async () => {
    mockEq.mockResolvedValue({ data: null, error: { code: "42501", message: "denegado" } });

    await expect(repositorio.listar()).rejects.toMatchObject({ motivo: "sin_permiso" });
  });

  test.each([
    ["con decimales", 12.5],
    ["negativo", -1],
    ["de texto", "100"],
  ])("un caché %s invalida la carga", async (_nombre, valor) => {
    mockEq.mockResolvedValue({ data: [{ evento_id: "e1", cache_centimos: valor }], error: null });

    await expect(repositorio.listar()).rejects.toThrow("Caché no válido");
  });
});
