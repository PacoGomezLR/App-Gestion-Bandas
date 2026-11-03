import { convertirErrorSupabase, ErrorRepositorio } from "../errores";
import {
  COLUMNAS_INDISPONIBILIDAD,
  convertirFilasIndisponibilidad,
  crearRepositorioDisponibilidadSupabase,
} from "../disponibilidad";

interface RespuestaSimulada {
  data: unknown;
  error: { code?: string; message: string } | null;
}

interface LlamadaConsulta {
  metodo: string;
  args: unknown[];
}

// Consulta encadenable de supabase-js simulada (como en repositorios.test.ts):
// registra cada llamada y resuelve con la respuesta indicada. Nunca sale a Internet.
class ConsultaSimulada implements PromiseLike<RespuestaSimulada> {
  readonly llamadas: LlamadaConsulta[] = [];

  constructor(private readonly respuesta: RespuestaSimulada) {}

  private registrar(metodo: string, args: unknown[]) {
    this.llamadas.push({ metodo, args });
    return this;
  }

  select(...args: unknown[]) {
    return this.registrar("select", args);
  }

  insert(...args: unknown[]) {
    return this.registrar("insert", args);
  }

  delete(...args: unknown[]) {
    return this.registrar("delete", args);
  }

  eq(...args: unknown[]) {
    return this.registrar("eq", args);
  }

  order(...args: unknown[]) {
    return this.registrar("order", args);
  }

  then<R1 = RespuestaSimulada, R2 = never>(
    onfulfilled?: ((valor: RespuestaSimulada) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((motivo: unknown) => R2 | PromiseLike<R2>) | null
  ): PromiseLike<R1 | R2> {
    return Promise.resolve(this.respuesta).then(onfulfilled, onrejected);
  }
}

const mockFrom = jest.fn<ConsultaSimulada, [string]>();

jest.mock("../../../lib/supabase", () => ({
  supabase: {
    from: (tabla: string) => mockFrom(tabla),
  },
}));

function responderConsulta(respuesta: RespuestaSimulada): ConsultaSimulada {
  const consulta = new ConsultaSimulada(respuesta);
  mockFrom.mockReturnValueOnce(consulta);
  return consulta;
}

function filtros(consulta: ConsultaSimulada): unknown[][] {
  return consulta.llamadas.filter(({ metodo }) => metodo === "eq").map(({ args }) => args);
}

const FILA = { id: "i1", banda_id: "b1", usuario_id: "u1", fecha: "2026-11-14" };

beforeEach(() => {
  jest.resetAllMocks();
});

describe("repositorio de disponibilidad (Supabase)", () => {
  test("listar filtra por banda, ordena por fecha y convierte las filas", async () => {
    const consulta = responderConsulta({
      data: [FILA, { ...FILA, id: "i2", usuario_id: "u2" }],
      error: null,
    });

    const lista = await crearRepositorioDisponibilidadSupabase("b1", "u1").listar();

    expect(mockFrom).toHaveBeenCalledWith("indisponibilidades_usuario");
    expect(consulta.llamadas[0]).toEqual({ metodo: "select", args: [COLUMNAS_INDISPONIBILIDAD] });
    // Toda la banda (también los días de otros integrantes), nunca otra banda
    expect(filtros(consulta)).toEqual([["banda_id", "b1"]]);
    expect(consulta.llamadas).toContainEqual({ metodo: "order", args: ["fecha"] });
    expect(lista).toEqual([
      { id: "i1", bandaId: "b1", usuarioId: "u1", fecha: "2026-11-14" },
      { id: "i2", bandaId: "b1", usuarioId: "u2", fecha: "2026-11-14" },
    ]);
  });

  test("marcar inserta siempre para la banda y el usuario del repositorio", async () => {
    const consulta = responderConsulta({ data: [FILA], error: null });

    const creada = await crearRepositorioDisponibilidadSupabase("b1", "u1").marcarNoDisponible(
      "2026-11-14"
    );

    // Solo banda, usuario y fecha: no hay nota ni ningún otro dato
    expect(consulta.llamadas[0]).toEqual({
      metodo: "insert",
      args: [{ banda_id: "b1", usuario_id: "u1", fecha: "2026-11-14" }],
    });
    expect(creada).toEqual({ id: "i1", bandaId: "b1", usuarioId: "u1", fecha: "2026-11-14" });
  });

  test("la consulta no pide nota", () => {
    expect(COLUMNAS_INDISPONIBILIDAD).toBe("id, banda_id, usuario_id, fecha");
  });

  test("el mismo día dos veces es un error duplicado (unique banda/usuario/fecha)", async () => {
    responderConsulta({ data: null, error: { code: "23505", message: "duplicate key value" } });

    await expect(
      crearRepositorioDisponibilidadSupabase("b1", "u1").marcarNoDisponible("2026-11-14")
    ).rejects.toEqual(new ErrorRepositorio("duplicado"));
    expect(convertirErrorSupabase({ code: "23505" }).motivo).toBe("duplicado");
  });

  test("desmarcar borra solo si la indisponibilidad es propia y de esa banda", async () => {
    const consulta = responderConsulta({ data: [{ id: "i1" }], error: null });

    await crearRepositorioDisponibilidadSupabase("b1", "u1").desmarcar("i1");

    expect(consulta.llamadas.map(({ metodo }) => metodo)).toContain("delete");
    expect(filtros(consulta)).toEqual([
      ["id", "i1"],
      ["banda_id", "b1"],
      ["usuario_id", "u1"],
    ]);
  });

  test("si la RLS rechaza la escritura (sin filas) es un error sin_permiso", async () => {
    responderConsulta({ data: [], error: null });
    responderConsulta({ data: [], error: null });
    responderConsulta({ data: null, error: { code: "42501", message: "row-level security" } });

    const repositorio = crearRepositorioDisponibilidadSupabase("b1", "u1");

    await expect(repositorio.marcarNoDisponible("2026-11-14")).rejects.toEqual(
      new ErrorRepositorio("sin_permiso")
    );
    // Un día ajeno: el filtro por usuario_id no encuentra nada que borrar
    await expect(repositorio.desmarcar("i-de-otro")).rejects.toEqual(new ErrorRepositorio("sin_permiso"));
    await expect(repositorio.listar()).rejects.toEqual(new ErrorRepositorio("sin_permiso"));
  });

  test("cada banda consulta solo con su propio filtro", async () => {
    const consultas = [
      responderConsulta({ data: [], error: null }),
      responderConsulta({ data: [], error: null }),
    ];

    await crearRepositorioDisponibilidadSupabase("cathaline", "u1").listar();
    await crearRepositorioDisponibilidadSupabase("otra-banda", "u1").listar();

    expect(consultas.map(filtros)).toEqual([[["banda_id", "cathaline"]], [["banda_id", "otra-banda"]]]);
  });
});

describe("convertirFilasIndisponibilidad", () => {
  test("rechaza respuestas y filas mal formadas", () => {
    expect(() => convertirFilasIndisponibilidad({})).toThrow();
    expect(() => convertirFilasIndisponibilidad([{ ...FILA, fecha: "14-11-2026" }])).toThrow();
    expect(() => convertirFilasIndisponibilidad([{ ...FILA, usuario_id: 5 }])).toThrow();
  });
});
