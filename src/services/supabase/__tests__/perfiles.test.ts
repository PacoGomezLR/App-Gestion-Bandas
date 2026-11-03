import { ErrorRepositorio } from "../errores";
import { guardarNombreVisiblePropio } from "../perfiles";

interface RespuestaSimulada {
  data: unknown;
  error: { code?: string; message: string } | null;
}

interface LlamadaConsulta {
  metodo: string;
  args: unknown[];
}

// Consulta encadenable de supabase-js simulada (como en repositorios.test.ts)
class ConsultaSimulada implements PromiseLike<RespuestaSimulada> {
  readonly llamadas: LlamadaConsulta[] = [];

  constructor(private readonly respuesta: RespuestaSimulada) {}

  private registrar(metodo: string, args: unknown[]) {
    this.llamadas.push({ metodo, args });
    return this;
  }

  update(...args: unknown[]) {
    return this.registrar("update", args);
  }

  eq(...args: unknown[]) {
    return this.registrar("eq", args);
  }

  select(...args: unknown[]) {
    return this.registrar("select", args);
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

beforeEach(() => {
  jest.resetAllMocks();
});

describe("guardarNombreVisiblePropio", () => {
  test("actualiza solo nombre_visible del perfil indicado y no pide el email", async () => {
    const consulta = responderConsulta({ data: [{ nombre_visible: "Paco Gómez" }], error: null });

    await guardarNombreVisiblePropio("u1", "Paco Gómez");

    expect(mockFrom).toHaveBeenCalledWith("perfiles");
    expect(consulta.llamadas).toEqual([
      { metodo: "update", args: [{ nombre_visible: "Paco Gómez" }] },
      { metodo: "eq", args: ["id", "u1"] },
      { metodo: "select", args: ["nombre_visible"] },
    ]);
  });

  test("si la RLS descarta la escritura (perfil ajeno, sin filas) es un error sin_permiso", async () => {
    responderConsulta({ data: [], error: null });

    await expect(guardarNombreVisiblePropio("otro", "Paco")).rejects.toEqual(
      new ErrorRepositorio("sin_permiso")
    );
  });

  test("los errores de Supabase se traducen sin detalles técnicos", async () => {
    responderConsulta({ data: null, error: { code: "42501", message: "permission denied" } });

    await expect(guardarNombreVisiblePropio("u1", "Paco")).rejects.toEqual(
      new ErrorRepositorio("sin_permiso")
    );
  });
});
