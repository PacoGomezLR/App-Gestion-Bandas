import type { User } from "@supabase/supabase-js";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useAuthContext } from "../AuthContext";
import { BandaProvider, convertirFilasPertenencias, useBandaContext } from "../BandaContext";

interface RespuestaSupabase {
  data: unknown;
  error: { message: string } | null;
}

// Cliente Supabase simulado: no se conecta a Internet ni necesita .env
const mockEqPertenencias = jest.fn(
  async (_columna: string, _valor: string): Promise<RespuestaSupabase> => ({
    data: [],
    error: null,
  })
);
const mockSelect = jest.fn((_columnas: string) => ({ eq: mockEqPertenencias }));
const mockInsert = jest.fn(
  async (_fila: Record<string, string>): Promise<RespuestaSupabase> => ({
    data: null,
    error: null,
  })
);
const mockFrom = jest.fn((_tabla: string) => ({ select: mockSelect, insert: mockInsert }));

jest.mock("../../lib/supabase", () => ({
  supabase: {
    from: (tabla: string) => mockFrom(tabla),
  },
}));

// Solo se simula el hook: el AuthContext real cargaría el cliente Supabase
jest.mock("../AuthContext", () => ({
  useAuthContext: jest.fn(),
}));

const useAuthContextMock = jest.mocked(useAuthContext);

const paco: User = {
  id: "paco",
  email: "paco@email.com",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: "2026-01-01T00:00:00Z",
};

function fila(bandaId: string, nombre: string, rol: string, creadaEn: string) {
  return {
    banda_id: bandaId,
    usuario_id: "paco",
    rol,
    created_at: creadaEn,
    bandas: { id: bandaId, nombre, creada_por: "paco", created_at: creadaEn },
  };
}

const cathalineAdmin = fila("b1", "Cathaline", "admin", "2026-01-01T10:00:00Z");
const cathalineUsuario = fila("b1", "Cathaline", "usuario", "2026-01-01T10:00:00Z");
const otraBandaUsuario = fila("b2", "Otra banda", "usuario", "2026-02-01T10:00:00Z");

function devolverPertenencias(filas: unknown[]) {
  mockEqPertenencias.mockResolvedValue({ data: filas, error: null });
}

async function renderizarBanda() {
  const resultado = await renderHook(() => useBandaContext(), {
    wrapper: BandaProvider,
  });

  await waitFor(() => expect(resultado.result.current.cargando).toBe(false));

  return resultado;
}

beforeEach(() => {
  jest.clearAllMocks();
  devolverPertenencias([]);
  mockInsert.mockResolvedValue({ data: null, error: null });
  useAuthContextMock.mockReturnValue({
    session: null,
    usuario: paco,
    perfil: { id: "paco", email: "paco@email.com" },
    cargando: false,
    error: "",
    iniciarSesion: jest.fn(),
    crearCuenta: jest.fn(),
    cerrarSesion: jest.fn(),
  });
});

describe("BandaContext", () => {
  test("un usuario sin bandas no tiene banda actual ni es admin", async () => {
    const { result } = await renderizarBanda();

    expect(result.current.bandas).toEqual([]);
    expect(result.current.bandaActual).toBeNull();
    expect(result.current.pertenenciaActual).toBeNull();
    expect(result.current.esAdmin).toBe(false);
  });

  test("consulta solo las pertenencias del usuario actual", async () => {
    await renderizarBanda();

    expect(mockFrom).toHaveBeenCalledWith("banda_usuarios");
    expect(mockEqPertenencias).toHaveBeenCalledWith("usuario_id", "paco");
  });

  test("con una banda como usuario la selecciona y no es admin", async () => {
    devolverPertenencias([cathalineUsuario]);

    const { result } = await renderizarBanda();

    expect(result.current.bandaActual).toEqual({
      id: "b1",
      nombre: "Cathaline",
      creadaPor: "paco",
      creadaEn: "2026-01-01T10:00:00Z",
    });
    expect(result.current.pertenenciaActual?.rol).toBe("usuario");
    expect(result.current.esAdmin).toBe(false);
  });

  test("con una banda como admin es admin", async () => {
    devolverPertenencias([cathalineAdmin]);

    const { result } = await renderizarBanda();

    expect(result.current.bandaActual?.nombre).toBe("Cathaline");
    expect(result.current.esAdmin).toBe(true);
  });

  test("el rol depende de la banda seleccionada", async () => {
    // Desordenadas a propósito: la primera por antigüedad es Cathaline
    devolverPertenencias([otraBandaUsuario, cathalineAdmin]);

    const { result } = await renderizarBanda();

    expect(result.current.bandas.map((banda) => banda.nombre)).toEqual([
      "Cathaline",
      "Otra banda",
    ]);
    expect(result.current.bandaActual?.nombre).toBe("Cathaline");
    expect(result.current.esAdmin).toBe(true);

    await act(() => {
      result.current.seleccionarBanda("b2");
    });

    expect(result.current.bandaActual?.nombre).toBe("Otra banda");
    expect(result.current.esAdmin).toBe(false);

    await act(() => {
      result.current.seleccionarBanda("b1");
    });

    expect(result.current.bandaActual?.nombre).toBe("Cathaline");
    expect(result.current.esAdmin).toBe(true);
  });

  test("ignora la selección de una banda a la que no pertenece", async () => {
    devolverPertenencias([cathalineUsuario]);

    const { result } = await renderizarBanda();

    await act(() => {
      result.current.seleccionarBanda("ajena");
    });

    expect(result.current.bandaActual?.id).toBe("b1");
  });

  test("crear Cathaline inserta solo la banda y el creador queda como admin", async () => {
    const { result } = await renderizarBanda();

    // Tras crearla, la base ya tiene la pertenencia admin creada por el trigger
    devolverPertenencias([cathalineAdmin]);

    let correcto = false;
    await act(async () => {
      correcto = await result.current.crearBanda("  Cathaline ");
    });

    expect(correcto).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith("bandas");
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledWith({ nombre: "Cathaline", creada_por: "paco" });
    // El admin no lo inserta React: carga, insert en bandas y recarga, nada más
    expect(mockFrom.mock.calls.map(([tabla]) => tabla)).toEqual([
      "banda_usuarios",
      "bandas",
      "banda_usuarios",
    ]);

    expect(result.current.bandaActual?.nombre).toBe("Cathaline");
    expect(result.current.esAdmin).toBe(true);
  });

  test("no crea una banda con nombre vacío", async () => {
    const { result } = await renderizarBanda();

    let correcto = true;
    await act(async () => {
      correcto = await result.current.crearBanda("   ");
    });

    expect(correcto).toBe(false);
    expect(mockInsert).not.toHaveBeenCalled();
    expect(result.current.error).toBe("Escribe el nombre de la banda");
  });

  test("si Supabase rechaza la banda avisa y sigue sin banda", async () => {
    mockInsert.mockResolvedValue({ data: null, error: { message: "RLS" } });

    const { result } = await renderizarBanda();

    let correcto = true;
    await act(async () => {
      correcto = await result.current.crearBanda("Cathaline");
    });

    expect(correcto).toBe(false);
    expect(result.current.error).toBe("No se ha podido crear la banda");
    expect(result.current.bandaActual).toBeNull();
  });

  test("si falla la carga expone errorCarga y permite reintentar", async () => {
    mockEqPertenencias.mockResolvedValueOnce({ data: null, error: { message: "Sin red" } });

    const { result } = await renderizarBanda();

    expect(result.current.errorCarga).toBe("No se han podido cargar las bandas");
    expect(result.current.bandaActual).toBeNull();

    devolverPertenencias([cathalineUsuario]);
    await act(async () => {
      await result.current.recargarBandas();
    });

    expect(result.current.errorCarga).toBe("");
    expect(result.current.bandaActual?.nombre).toBe("Cathaline");
  });
});

describe("convertirFilasPertenencias", () => {
  test("rechaza un rol desconocido o una banda que no coincide", () => {
    expect(() =>
      convertirFilasPertenencias([fila("b1", "Cathaline", "superadmin", "2026-01-01")])
    ).toThrow();
    expect(() =>
      convertirFilasPertenencias([{ ...cathalineAdmin, banda_id: "otra" }])
    ).toThrow();
    expect(() => convertirFilasPertenencias(null)).toThrow();
  });
});
