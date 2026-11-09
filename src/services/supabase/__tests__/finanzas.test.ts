import type { DatosMovimiento } from "../../../types/finanzas";
import { ErrorRepositorio } from "../errores";
import { COLUMNAS_MOVIMIENTO, crearRepositorioFinanzasSupabase } from "../finanzas";

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

const FILA = {
  id: "m1",
  tipo: "gasto",
  importe_centimos: 8500,
  concepto: "Gasolina",
  categoria: "transporte",
  fecha: "2026-11-01",
  evento_id: null,
  notas: null,
  created_at: "2026-11-02T10:00:00+00:00",
};

const MOVIMIENTO = {
  id: "m1",
  tipo: "gasto",
  importeCentimos: 8500,
  concepto: "Gasolina",
  categoria: "transporte",
  fecha: "2026-11-01",
  eventoId: null,
  notas: null,
  creadoEn: "2026-11-02T10:00:00+00:00",
};

const DATOS: DatosMovimiento = {
  tipo: "gasto",
  importeCentimos: 8500,
  concepto: "Gasolina",
  categoria: "transporte",
  fecha: "2026-11-01",
  eventoId: "e1",
  notas: "Con peaje",
};

const ERROR_RLS = { code: "42501", message: 'row-level security for "movimientos_financieros"' };
const ERROR_FK = { code: "23503", message: "violates foreign key constraint" };

const repositorio = crearRepositorioFinanzasSupabase("banda-1");

beforeEach(() => {
  mockFrom.mockReset();
});

describe("listar", () => {
  test("filtra por banda y ordena por fecha y creación descendentes", async () => {
    const consulta = responder({ data: [FILA], error: null });

    await expect(repositorio.listar()).resolves.toEqual([MOVIMIENTO]);

    expect(mockFrom).toHaveBeenCalledWith("movimientos_financieros");
    expect(argumentos(consulta, "select")).toEqual([[COLUMNAS_MOVIMIENTO]]);
    expect(argumentos(consulta, "eq")).toEqual([["banda_id", "banda-1"]]);
    expect(argumentos(consulta, "order")).toEqual([
      ["fecha", { ascending: false }],
      ["created_at", { ascending: false }],
    ]);
  });

  test("lee las categorías nuevas con su tipo", async () => {
    responder({
      data: [
        { ...FILA, id: "a", tipo: "ingreso", categoria: "sobrante_concierto" },
        { ...FILA, id: "b", tipo: "gasto", categoria: "alquiler_furgoneta" },
      ],
      error: null,
    });

    const movimientos = await repositorio.listar();

    expect(movimientos.map(({ categoria }) => categoria)).toEqual([
      "sobrante_concierto",
      "alquiler_furgoneta",
    ]);
  });

  test("un rechazo de la RLS no se confunde con una banda sin movimientos", async () => {
    responder({ data: null, error: ERROR_RLS });

    await expect(repositorio.listar()).rejects.toMatchObject({ motivo: "sin_permiso" });
  });

  test.each([
    ["un importe con decimales", { importe_centimos: 12.5 }],
    ["un importe de texto", { importe_centimos: "8500" }],
    ["un importe cero", { importe_centimos: 0 }],
    ["un importe negativo", { importe_centimos: -100 }],
    ["un tipo desconocido", { tipo: "regalo" }],
    ["una categoría de otro tipo", { categoria: "concierto" }],
    ["sobrante_concierto en un gasto", { categoria: "sobrante_concierto" }],
    ["sin fecha", { fecha: null }],
  ])("una fila con %s invalida la carga: el bote nunca sale de datos raros", async (_nombre, cambio) => {
    responder({ data: [{ ...FILA, ...cambio }], error: null });

    await expect(repositorio.listar()).rejects.toThrow("Movimiento no válido");
  });

  test("una respuesta que no es una lista se rechaza", async () => {
    responder({ data: null, error: null });

    await expect(repositorio.listar()).rejects.toThrow("Respuesta no válida");
  });
});

describe("crear", () => {
  test("inserta en la banda fijada, sin creado_por", async () => {
    const consulta = responder({ data: [FILA], error: null });

    await expect(repositorio.crear(DATOS)).resolves.toEqual(MOVIMIENTO);

    expect(argumentos(consulta, "insert")).toEqual([
      [
        {
          banda_id: "banda-1",
          tipo: "gasto",
          importe_centimos: 8500,
          concepto: "Gasolina",
          categoria: "transporte",
          fecha: "2026-11-01",
          evento_id: "e1",
          notas: "Con peaje",
        },
      ],
    ]);
  });

  test("un usuario sin permiso recibe sin_permiso", async () => {
    responder({ data: null, error: ERROR_RLS });

    await expect(repositorio.crear(DATOS)).rejects.toMatchObject({ motivo: "sin_permiso" });
  });

  test("la clave foránea rechaza un evento de otra banda", async () => {
    responder({ data: null, error: ERROR_FK });

    await expect(repositorio.crear(DATOS)).rejects.toMatchObject({ motivo: "en_uso" });
  });

  test("una escritura sin filas devueltas cuenta como sin permiso", async () => {
    responder({ data: [], error: null });

    await expect(repositorio.crear(DATOS)).rejects.toBeInstanceOf(ErrorRepositorio);
  });
});

describe("actualizar", () => {
  test("solo envía lo editable y busca por id y banda", async () => {
    const consulta = responder({ data: [FILA], error: null });

    await repositorio.actualizar("m1", DATOS);

    const [[cambios]] = argumentos(consulta, "update") as [[Record<string, unknown>]];

    expect(Object.keys(cambios).sort()).toEqual([
      "categoria",
      "concepto",
      "evento_id",
      "fecha",
      "importe_centimos",
      "notas",
      "tipo",
    ]);
    expect(argumentos(consulta, "eq")).toEqual([
      ["id", "m1"],
      ["banda_id", "banda-1"],
    ]);
  });

  test("si la RLS lo descarta no finge que ha guardado", async () => {
    responder({ data: [], error: null });

    await expect(repositorio.actualizar("m1", DATOS)).rejects.toMatchObject({ motivo: "sin_permiso" });
  });
});

describe("eliminar", () => {
  test("busca por id y banda", async () => {
    const consulta = responder({ data: [{ id: "m1" }], error: null });

    await repositorio.eliminar("m1");

    expect(argumentos(consulta, "delete")).toHaveLength(1);
    expect(argumentos(consulta, "eq")).toEqual([
      ["id", "m1"],
      ["banda_id", "banda-1"],
    ]);
  });

  test("si la RLS lo descarta no finge que ha borrado", async () => {
    responder({ data: [], error: null });

    await expect(repositorio.eliminar("m1")).rejects.toMatchObject({ motivo: "sin_permiso" });
  });
});
