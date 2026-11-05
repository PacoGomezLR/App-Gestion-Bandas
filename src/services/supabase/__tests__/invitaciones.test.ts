import { ErrorRepositorio } from "../errores";
import {
  aceptarInvitacionBanda,
  consultarInvitacionBanda,
  crearInvitacionBanda,
} from "../invitaciones";

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

// Valor de prueba con el formato del token (no es ningún token real)
const TOKEN = "0123456789abcdef".repeat(4);

beforeEach(() => {
  jest.resetAllMocks();
});

describe("servicio de invitaciones", () => {
  test("crear solo envía banda y rol: creada_por, token y caducidad los decide la base", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ token: TOKEN, expires_at: "2026-11-10T10:00:00+00:00" }],
      error: null,
    });

    const creada = await crearInvitacionBanda("b1", "admin");

    expect(mockRpc).toHaveBeenCalledWith("crear_invitacion_banda", { p_banda_id: "b1", p_rol: "admin" });
    expect(mockFrom).not.toHaveBeenCalled();
    expect(creada).toEqual({ token: TOKEN, expiraEn: "2026-11-10T10:00:00+00:00", rol: "admin" });
  });

  test("crear siendo usuario normal (42501) es un error sin_permiso", async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { code: "42501", message: "permission" } });

    await expect(crearInvitacionBanda("b1", "usuario")).rejects.toEqual(new ErrorRepositorio("sin_permiso"));
  });

  test("consultar devuelve estado y nombre de la banda, sin hashes ni correos", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ estado: "valida", banda_nombre: "Indiespensables", token_hash: "x", email: "y" }],
      error: null,
    });

    const consulta = await consultarInvitacionBanda(TOKEN);

    expect(mockRpc).toHaveBeenCalledWith("consultar_invitacion_banda", { p_token: TOKEN });
    expect(consulta).toEqual({ estado: "valida", bandaNombre: "Indiespensables" });
  });

  test.each(["no_valida", "caducada", "usada"])("consultar un token %s no da nombre de banda", async (estado) => {
    mockRpc.mockResolvedValueOnce({ data: [{ estado, banda_nombre: null }], error: null });

    await expect(consultarInvitacionBanda(TOKEN)).resolves.toEqual({ estado, bandaNombre: null });
  });

  test("aceptar solo envía el token: el rol nunca lo elige la app", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ resultado: "aceptada", banda_id: "b9", banda_nombre: "Indiespensables" }],
      error: null,
    });

    const aceptacion = await aceptarInvitacionBanda(TOKEN);

    expect(mockRpc).toHaveBeenCalledWith("aceptar_invitacion_banda", { p_token: TOKEN });
    expect(Object.keys(mockRpc.mock.calls[0][1])).toEqual(["p_token"]);
    expect(aceptacion).toEqual({ resultado: "aceptada", bandaId: "b9", bandaNombre: "Indiespensables" });
  });

  test("rechaza respuestas con estados desconocidos o mal formadas", async () => {
    mockRpc.mockResolvedValueOnce({ data: [{ estado: "rara" }], error: null });
    await expect(consultarInvitacionBanda(TOKEN)).rejects.toThrow();

    mockRpc.mockResolvedValueOnce({ data: [{ resultado: "aceptada", banda_id: 5 }], error: null });
    await expect(aceptarInvitacionBanda(TOKEN)).rejects.toThrow();

    mockRpc.mockResolvedValueOnce({ data: [], error: null });
    await expect(crearInvitacionBanda("b1", "usuario")).rejects.toThrow();
  });

  test("un error de la base se traduce sin detalles técnicos", async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { code: "XX000", message: "detalle interno" } });

    await expect(aceptarInvitacionBanda(TOKEN)).rejects.toEqual(new ErrorRepositorio("desconocido"));
  });
});
