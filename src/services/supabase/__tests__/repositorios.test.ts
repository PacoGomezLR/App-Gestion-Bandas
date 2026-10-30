import { ErrorRepositorio } from "../errores";
import { crearRepositorioEventosSupabase } from "../eventos";
import { COLUMNAS_EVENTO } from "../mapeoEventos";
import { crearRepositorioTecnicosSupabase } from "../personas";

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
const mockRpc = jest.fn<Promise<RespuestaSimulada>, [string, Record<string, unknown>]>();

jest.mock("../../../lib/supabase", () => ({
  supabase: {
    from: (tabla: string) => mockFrom(tabla),
    rpc: (funcion: string, parametros: Record<string, unknown>) => mockRpc(funcion, parametros),
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

const ERROR_RLS = {
  code: "42501",
  message: 'new row violates row-level security policy for table "eventos"',
};

const ERROR_FK = {
  code: "23503",
  message: 'update or delete on table "tecnicos" violates foreign key constraint',
};

const DATOS_EVENTO = {
  titulo: "Boda de María",
  tipo: "boda" as const,
  fecha: "2026-03-12",
  hora: "20:30",
  lugar: "Lucena",
  notas: "",
  estado: "pendiente" as const,
  tecnicoIds: ["t1"],
};

beforeEach(() => {
  jest.resetAllMocks();
});

describe("repositorio de eventos (Supabase)", () => {
  test("listar filtra por banda_id y mapea fecha, hora y asignaciones", async () => {
    const consulta = responderConsulta({
      data: [
        {
          id: "e1",
          titulo: "Boda de María",
          tipo: "boda",
          fecha: "2026-03-12",
          hora: "20:30:00",
          lugar: "Lucena",
          notas: null,
          estado: "confirmado",
          // Llegan en cualquier orden: se reconstruye el orden de asignación
          evento_tecnicos: [
            { tecnico_id: "t2", orden: 2 },
            { tecnico_id: "t1", orden: 1 },
          ],
        },
        {
          id: "e2",
          titulo: "Ensayo",
          tipo: "ensayo",
          fecha: "2026-03-13",
          hora: null,
          lugar: "",
          notas: "Traer cables",
          estado: "pendiente",
          evento_tecnicos: [],
        },
      ],
      error: null,
    });

    const eventos = await crearRepositorioEventosSupabase("b1").listar();

    expect(mockFrom).toHaveBeenCalledWith("eventos");
    expect(consulta.llamadas[0]).toEqual({ metodo: "select", args: [COLUMNAS_EVENTO] });
    expect(filtros(consulta)).toEqual([["banda_id", "b1"]]);
    // Una sola consulta con las relaciones embebidas: sin N+1
    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(eventos).toEqual([
      {
        id: "e1",
        titulo: "Boda de María",
        tipo: "boda",
        fecha: "2026-03-12",
        hora: "20:30",
        lugar: "Lucena",
        notas: "",
        estado: "confirmado",
        tecnicoIds: ["t1", "t2"],
      },
      {
        id: "e2",
        titulo: "Ensayo",
        tipo: "ensayo",
        fecha: "2026-03-13",
        hora: "",
        lugar: "",
        notas: "Traer cables",
        estado: "pendiente",
        tecnicoIds: [],
      },
    ]);
    // La consulta ya no pide ninguna relación de músicos
    expect(COLUMNAS_EVENTO).not.toMatch(/miembro/);
  });

  test("crear usa la RPC atómica con la banda del repositorio y devuelve el id nuevo", async () => {
    mockRpc.mockResolvedValueOnce({ data: "uuid-nuevo", error: null });

    const evento = await crearRepositorioEventosSupabase("b1").crear(DATOS_EVENTO);

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("crear_evento", {
      p_banda_id: "b1",
      p_titulo: "Boda de María",
      p_tipo: "boda",
      p_fecha: "2026-03-12",
      p_hora: "20:30",
      p_lugar: "Lucena",
      p_notas: "",
      p_estado: "pendiente",
      p_tecnico_ids: ["t1"],
    });
    // Firma de 003: ningún parámetro de músicos
    expect(mockRpc.mock.calls[0][1]).not.toHaveProperty("p_miembro_ids");
    // Ni evento ni asignaciones se insertan por separado desde JS
    expect(mockFrom).not.toHaveBeenCalled();
    expect(evento).toEqual({ ...DATOS_EVENTO, id: "uuid-nuevo" });
  });

  test("editar usa la RPC atómica con el id del evento y la banda del repositorio", async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    const evento = await crearRepositorioEventosSupabase("b1").actualizar({
      ...DATOS_EVENTO,
      id: "e1",
      hora: "",
    });

    expect(mockRpc).toHaveBeenCalledWith(
      "actualizar_evento",
      expect.objectContaining({
        p_evento_id: "e1",
        p_banda_id: "b1",
        p_hora: "",
        p_tecnico_ids: ["t1"],
      })
    );
    expect(mockRpc.mock.calls[0][1]).not.toHaveProperty("p_miembro_ids");
    expect(mockFrom).not.toHaveBeenCalled();
    expect(evento.id).toBe("e1");
  });

  test("editar después de listar envía exactamente los parámetros de actualizar_evento (003)", async () => {
    // Ya no hay caché por evento: listar no cambia lo que se envía al editar
    responderConsulta({
      data: [
        {
          id: "e1",
          titulo: "Boda de María",
          tipo: "boda",
          fecha: "2026-03-12",
          hora: null,
          lugar: "Lucena",
          notas: "",
          estado: "pendiente",
          evento_tecnicos: [{ tecnico_id: "t1", orden: 1 }],
        },
      ],
      error: null,
    });
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    const repositorio = crearRepositorioEventosSupabase("b1");
    await repositorio.listar();
    await repositorio.actualizar({ ...DATOS_EVENTO, id: "e1", lugar: "Montilla" });

    expect(Object.keys(mockRpc.mock.calls[0][1]).sort()).toEqual([
      "p_banda_id",
      "p_estado",
      "p_evento_id",
      "p_fecha",
      "p_hora",
      "p_lugar",
      "p_notas",
      "p_tecnico_ids",
      "p_tipo",
      "p_titulo",
    ]);
    expect(mockRpc.mock.calls[0][1]).toMatchObject({ p_evento_id: "e1", p_lugar: "Montilla" });
  });

  test("eliminar filtra por id y por banda", async () => {
    const consulta = responderConsulta({ data: [{ id: "e1" }], error: null });

    await crearRepositorioEventosSupabase("b1").eliminar("e1");

    expect(mockFrom).toHaveBeenCalledWith("eventos");
    expect(consulta.llamadas.map(({ metodo }) => metodo)).toContain("delete");
    expect(filtros(consulta)).toEqual([
      ["id", "e1"],
      ["banda_id", "b1"],
    ]);
  });

  test("eliminar sin filas afectadas (RLS) es un error controlado", async () => {
    responderConsulta({ data: [], error: null });

    await expect(crearRepositorioEventosSupabase("b1").eliminar("e1")).rejects.toEqual(
      new ErrorRepositorio("sin_permiso")
    );
  });

  test("los errores de Supabase se propagan sin el mensaje técnico", async () => {
    responderConsulta({ data: null, error: ERROR_RLS });
    mockRpc.mockResolvedValueOnce({ data: null, error: ERROR_RLS });

    const repositorio = crearRepositorioEventosSupabase("b1");

    const errorListar = await repositorio.listar().catch((error: unknown) => error);
    const errorCrear = await repositorio.crear(DATOS_EVENTO).catch((error: unknown) => error);

    for (const error of [errorListar, errorCrear]) {
      expect(error).toBeInstanceOf(ErrorRepositorio);
      expect(error).toMatchObject({ motivo: "sin_permiso" });
      expect(String(error)).not.toMatch(/row-level|violates|42501/);
    }
  });

  test("una fila con tipo o estado desconocido invalida la carga", async () => {
    responderConsulta({
      data: [
        {
          id: "e1",
          titulo: "Antiguo",
          tipo: "reunion",
          fecha: "2026-03-12",
          hora: null,
          lugar: "",
          notas: "",
          estado: "cancelado",
          evento_tecnicos: [],
        },
      ],
      error: null,
    });

    await expect(crearRepositorioEventosSupabase("b1").listar()).rejects.toThrow();
  });
});

describe.each([
  ["técnicos", "tecnicos", crearRepositorioTecnicosSupabase],
] as const)("repositorio de %s (Supabase)", (_nombre, tabla, crearRepositorio) => {
  test("listar filtra por banda_id y ordena por nombre", async () => {
    const consulta = responderConsulta({
      data: [
        { id: "p1", nombre: "Ana" },
        { id: "p2", nombre: "Bruno" },
      ],
      error: null,
    });

    const registros = await crearRepositorio("b1").listar();

    expect(mockFrom).toHaveBeenCalledWith(tabla);
    expect(filtros(consulta)).toEqual([["banda_id", "b1"]]);
    expect(consulta.llamadas).toContainEqual({ metodo: "order", args: ["nombre"] });
    expect(registros).toEqual([
      { id: "p1", nombre: "Ana" },
      { id: "p2", nombre: "Bruno" },
    ]);
  });

  test("crear fuerza la banda del repositorio y devuelve el id de Supabase", async () => {
    const consulta = responderConsulta({ data: [{ id: "uuid-1", nombre: "Carla" }], error: null });

    const registro = await crearRepositorio("b1").crear("Carla");

    expect(consulta.llamadas[0]).toEqual({
      metodo: "insert",
      args: [{ banda_id: "b1", nombre: "Carla" }],
    });
    expect(registro).toEqual({ id: "uuid-1", nombre: "Carla" });
  });

  test("actualizar solo envía el nombre y filtra por id y banda", async () => {
    const consulta = responderConsulta({ data: [{ id: "p1", nombre: "Ana María" }], error: null });

    await crearRepositorio("b1").actualizar({ id: "p1", nombre: "Ana María" });

    // Nunca se envía banda_id en una actualización
    expect(consulta.llamadas[0]).toEqual({ metodo: "update", args: [{ nombre: "Ana María" }] });
    expect(filtros(consulta)).toEqual([
      ["id", "p1"],
      ["banda_id", "b1"],
    ]);
  });

  test("eliminar fuerza la banda del repositorio", async () => {
    const consulta = responderConsulta({ data: [{ id: "p1" }], error: null });

    await crearRepositorio("b1").eliminar("p1");

    expect(consulta.llamadas.map(({ metodo }) => metodo)).toContain("delete");
    expect(filtros(consulta)).toEqual([
      ["id", "p1"],
      ["banda_id", "b1"],
    ]);
  });

  test("si la clave foránea rechaza el borrado devuelve el motivo en_uso", async () => {
    responderConsulta({ data: null, error: ERROR_FK });

    await expect(crearRepositorio("b1").eliminar("p1")).rejects.toEqual(
      new ErrorRepositorio("en_uso")
    );
  });

  test("una escritura descartada por RLS (sin filas) es un error controlado", async () => {
    responderConsulta({ data: [], error: null });
    responderConsulta({ data: [], error: null });

    const repositorio = crearRepositorio("b1");

    await expect(repositorio.actualizar({ id: "p1", nombre: "Ana" })).rejects.toEqual(
      new ErrorRepositorio("sin_permiso")
    );
    await expect(repositorio.eliminar("p1")).rejects.toEqual(new ErrorRepositorio("sin_permiso"));
  });
});

describe("aislamiento por banda", () => {
  test("cada repositorio consulta solo con el filtro de su propia banda", async () => {
    const consultas = [
      responderConsulta({ data: [], error: null }),
      responderConsulta({ data: [], error: null }),
      responderConsulta({ data: [], error: null }),
    ];

    await crearRepositorioEventosSupabase("cathaline").listar();
    await crearRepositorioTecnicosSupabase("cathaline").listar();
    await crearRepositorioEventosSupabase("otra-banda").listar();

    expect(consultas.map(filtros)).toEqual([
      [["banda_id", "cathaline"]],
      [["banda_id", "cathaline"]],
      [["banda_id", "otra-banda"]],
    ]);
    // Ninguna consulta a las tablas de músicos retiradas en 003
    expect(mockFrom).not.toHaveBeenCalledWith("miembros");
    expect(mockFrom).not.toHaveBeenCalledWith("evento_miembros");
  });

  test("ninguna operación de tabla se ejecuta sin filtro de banda_id", async () => {
    const consultas = [
      responderConsulta({ data: [{ id: "e1" }], error: null }),
      responderConsulta({ data: [{ id: "t1", nombre: "Carlos" }], error: null }),
      responderConsulta({ data: [{ id: "t1" }], error: null }),
    ];

    await crearRepositorioEventosSupabase("cathaline").eliminar("e1");
    await crearRepositorioTecnicosSupabase("cathaline").actualizar({ id: "t1", nombre: "Carlos" });
    await crearRepositorioTecnicosSupabase("cathaline").eliminar("t1");

    for (const consulta of consultas) {
      expect(filtros(consulta)).toContainEqual(["banda_id", "cathaline"]);
    }
  });

  test("las RPC reciben siempre la banda del repositorio", async () => {
    mockRpc.mockResolvedValue({ data: "uuid", error: null });

    await crearRepositorioEventosSupabase("cathaline").crear(DATOS_EVENTO);
    await crearRepositorioEventosSupabase("cathaline").actualizar({ ...DATOS_EVENTO, id: "e1" });

    for (const [, parametros] of mockRpc.mock.calls) {
      expect(parametros.p_banda_id).toBe("cathaline");
    }
  });
});
