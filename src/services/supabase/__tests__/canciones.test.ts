import { crearRepositorioCancionesSupabase } from "../canciones";

interface RespuestaSimulada {
  data: unknown;
  error: { code?: string; message: string } | null;
}

interface LlamadaConsulta {
  metodo: string;
  args: unknown[];
}

// Consulta encadenable de supabase-js simulada: registra cada llamada y
// resuelve con la respuesta indicada. Nunca sale a Internet.
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

  update(...args: unknown[]) {
    return this.registrar("update", args);
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
  supabase: { from: (tabla: string) => mockFrom(tabla) },
}));

function responder(respuesta: RespuestaSimulada): ConsultaSimulada {
  const consulta = new ConsultaSimulada(respuesta);
  mockFrom.mockReturnValueOnce(consulta);
  return consulta;
}

function argumentos(consulta: ConsultaSimulada, metodo: string): unknown[][] {
  return consulta.llamadas.filter((llamada) => llamada.metodo === metodo).map(({ args }) => args);
}

const FILA = { id: "c1", nombre: "Años 80 - Los Piratas", estado: "repertorio" };
const ERROR_RLS = { code: "42501", message: "row-level security" };

beforeEach(() => {
  mockFrom.mockReset();
});

describe("listar", () => {
  test("una sola consulta trae los dos apartados de la banda", async () => {
    const consulta = responder({
      data: [FILA, { id: "c2", nombre: "Granada - Supersubmarina", estado: "nueva" }],
      error: null,
    });

    const canciones = await crearRepositorioCancionesSupabase("b1").listar();

    expect(canciones).toEqual([
      { id: "c1", nombre: "Años 80 - Los Piratas", estado: "repertorio" },
      { id: "c2", nombre: "Granada - Supersubmarina", estado: "nueva" },
    ]);
    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledWith("canciones");
    expect(argumentos(consulta, "eq")).toEqual([["banda_id", "b1"]]);
    expect(argumentos(consulta, "order")).toEqual([["nombre"]]);
  });

  test("cada repositorio solo pide su banda", async () => {
    const a = responder({ data: [], error: null });
    const b = responder({ data: [], error: null });

    await crearRepositorioCancionesSupabase("b1").listar();
    await crearRepositorioCancionesSupabase("b2").listar();

    expect(argumentos(a, "eq")).toEqual([["banda_id", "b1"]]);
    expect(argumentos(b, "eq")).toEqual([["banda_id", "b2"]]);
  });

  test.each([
    ["un estado desconocido", { ...FILA, estado: "ensayando" }],
    ["sin nombre", { ...FILA, nombre: null }],
    ["sin id", { ...FILA, id: 7 }],
  ])("una fila con %s invalida la carga, sin enseñar datos dudosos", async (_motivo, fila) => {
    responder({ data: [fila], error: null });

    await expect(crearRepositorioCancionesSupabase("b1").listar()).rejects.toThrow("Canción no válida");
  });

  test("un error de la base llega como error, no como lista vacía", async () => {
    responder({ data: null, error: ERROR_RLS });

    await expect(crearRepositorioCancionesSupabase("b1").listar()).rejects.toMatchObject({
      motivo: "sin_permiso",
    });
  });
});

describe("escrituras", () => {
  test.each(["repertorio", "nueva"] as const)("crear en %s", async (estado) => {
    const consulta = responder({ data: [{ ...FILA, estado }], error: null });

    await expect(crearRepositorioCancionesSupabase("b1").crear("Años 80 - Los Piratas", estado)).resolves.toEqual({
      ...FILA,
      estado,
    });
    expect(argumentos(consulta, "insert")).toEqual([
      [{ banda_id: "b1", nombre: "Años 80 - Los Piratas", estado }],
    ]);
  });

  test("editar solo cambia el nombre, de esa canción y esa banda", async () => {
    const consulta = responder({ data: [{ ...FILA, nombre: "Años 80" }], error: null });

    await crearRepositorioCancionesSupabase("b1").editarNombre("c1", "Años 80");

    expect(argumentos(consulta, "update")).toEqual([[{ nombre: "Años 80" }]]);
    expect(argumentos(consulta, "eq")).toEqual([
      ["id", "c1"],
      ["banda_id", "b1"],
    ]);
  });

  test("pasar a repertorio cambia solo el estado de una canción nueva", async () => {
    const consulta = responder({ data: [{ ...FILA, estado: "repertorio" }], error: null });

    await expect(crearRepositorioCancionesSupabase("b1").pasarARepertorio("c1")).resolves.toMatchObject({
      estado: "repertorio",
    });
    expect(argumentos(consulta, "update")).toEqual([[{ estado: "repertorio" }]]);
    expect(argumentos(consulta, "insert")).toEqual([]);
    expect(argumentos(consulta, "eq")).toEqual([
      ["id", "c1"],
      ["banda_id", "b1"],
      ["estado", "nueva"],
    ]);
  });

  test("eliminar busca por id y banda", async () => {
    const consulta = responder({ data: [{ id: "c1" }], error: null });

    await crearRepositorioCancionesSupabase("b1").eliminar("c1");

    expect(argumentos(consulta, "delete")).toHaveLength(1);
    expect(argumentos(consulta, "eq")).toEqual([
      ["id", "c1"],
      ["banda_id", "b1"],
    ]);
  });

  test.each([
    ["crear", () => crearRepositorioCancionesSupabase("b1").crear("X", "nueva")],
    ["editar", () => crearRepositorioCancionesSupabase("b1").editarNombre("c1", "X")],
    ["pasar", () => crearRepositorioCancionesSupabase("b1").pasarARepertorio("c1")],
    ["eliminar", () => crearRepositorioCancionesSupabase("b1").eliminar("c1")],
  ])("%s: si la RLS lo descarta no finge que ha funcionado", async (_operacion, llamar) => {
    responder({ data: [], error: null });

    await expect(llamar()).rejects.toMatchObject({ motivo: "sin_permiso" });
  });
});
