import { act, render, waitFor } from "@testing-library/react-native";

import { ErrorRepositorio } from "../../services/supabase/errores";
import type { DatosMovimiento, MovimientoFinanciero } from "../../types/finanzas";
import { useBandaContext } from "../BandaContext";
import { FinanzasProvider, useFinanzasContext } from "../FinanzasContext";

jest.mock("../BandaContext", () => ({ useBandaContext: jest.fn() }));

const mockRepositorioPedido = jest.fn<void, [string]>();
const mockListar = jest.fn<Promise<MovimientoFinanciero[]>, []>();
const mockCrear = jest.fn<Promise<MovimientoFinanciero>, [DatosMovimiento]>();
const mockActualizar = jest.fn<Promise<MovimientoFinanciero>, [string, DatosMovimiento]>();
const mockEliminar = jest.fn<Promise<void>, [string]>();

jest.mock("../../services/supabase/finanzas", () => ({
  crearRepositorioFinanzasSupabase: (bandaId: string) => {
    mockRepositorioPedido(bandaId);

    return {
      listar: () => mockListar(),
      crear: (datos: DatosMovimiento) => mockCrear(datos),
      actualizar: (id: string, datos: DatosMovimiento) => mockActualizar(id, datos),
      eliminar: (id: string) => mockEliminar(id),
    };
  },
}));

const mockUseBandaContext = jest.mocked(useBandaContext);

function simularBanda(bandaId: string | null, esAdmin = true) {
  mockUseBandaContext.mockReturnValue({
    bandaActual: bandaId === null ? null : { id: bandaId, nombre: "Banda" },
    esAdmin,
  } as unknown as ReturnType<typeof useBandaContext>);
}

const INGRESO: MovimientoFinanciero = {
  id: "m1",
  tipo: "ingreso",
  importeCentimos: 80000,
  concepto: "Concierto",
  categoria: "concierto",
  fecha: "2026-11-01",
  eventoId: null,
  notas: null,
  creadoEn: "2026-11-01T10:00:00+00:00",
};

const GASTO: MovimientoFinanciero = {
  ...INGRESO,
  id: "m2",
  tipo: "gasto",
  importeCentimos: 12050,
  concepto: "Técnico",
  categoria: "tecnico",
  fecha: "2026-11-02",
};

const { id: _id, creadoEn: _creadoEn, ...DATOS_GASTO } = GASTO;

let contexto: ReturnType<typeof useFinanzasContext> | null = null;

function Espia() {
  contexto = useFinanzasContext();
  return null;
}

function valor(): ReturnType<typeof useFinanzasContext> {
  if (contexto === null) {
    throw new Error("Falta el contexto");
  }

  return contexto;
}

function pantalla() {
  return (
    <FinanzasProvider>
      <Espia />
    </FinanzasProvider>
  );
}

async function montar() {
  const resultado = await render(pantalla());

  await waitFor(() => expect(valor().cargando).toBe(false));

  return resultado;
}

beforeEach(() => {
  jest.clearAllMocks();
  contexto = null;
  simularBanda("b1");
  mockListar.mockResolvedValue([INGRESO, GASTO]);
});

describe("carga", () => {
  test("los totales salen de los movimientos", async () => {
    await montar();

    expect(valor().boteActualCentimos).toBe(67950);
    expect(valor().ingresosTotalesCentimos).toBe(80000);
    expect(valor().gastosTotalesCentimos).toBe(12050);
  });

  test("ordena por fecha descendente aunque el servidor responda en otro orden", async () => {
    await montar();

    expect(valor().movimientos.map(({ id }) => id)).toEqual(["m2", "m1"]);
  });

  test("un fallo de carga se distingue de una banda sin movimientos", async () => {
    mockListar.mockRejectedValue(new Error("fallo"));
    await montar();

    expect(valor().error).toBe("No se han podido cargar los movimientos");
    expect(valor().movimientos).toEqual([]);
  });

  test("recargar limpia el error y trae los datos", async () => {
    mockListar.mockRejectedValueOnce(new Error("fallo"));
    await montar();

    await act(async () => {
      await valor().recargar();
    });

    expect(valor().error).toBe("");
    expect(valor().boteActualCentimos).toBe(67950);
  });

  test("al cambiar de banda no quedan movimientos de la anterior", async () => {
    const { rerender } = await montar();

    simularBanda("b2");
    mockListar.mockResolvedValue([GASTO]);
    await rerender(pantalla());
    await waitFor(() => expect(valor().movimientos).toEqual([GASTO]));

    expect(mockRepositorioPedido).toHaveBeenLastCalledWith("b2");
    expect(valor().boteActualCentimos).toBe(-12050);
  });

  test("una respuesta tardía de otra banda no sobrescribe la actual", async () => {
    let responderVieja: (lista: MovimientoFinanciero[]) => void = () => {};
    mockListar.mockReturnValueOnce(
      new Promise((resolver) => {
        responderVieja = resolver;
      })
    );

    const { rerender } = await render(pantalla());

    simularBanda("b2");
    mockListar.mockResolvedValue([GASTO]);
    await rerender(pantalla());
    await waitFor(() => expect(valor().movimientos).toEqual([GASTO]));

    await act(async () => {
      responderVieja([INGRESO]);
    });

    expect(valor().movimientos).toEqual([GASTO]);
  });

  test("sin banda no consulta nada", async () => {
    simularBanda(null);
    await montar();

    expect(mockRepositorioPedido).not.toHaveBeenCalled();
    expect(valor().movimientos).toEqual([]);
  });
});

describe("sin ser admin", () => {
  beforeEach(() => {
    simularBanda("b1", false);
  });

  test("ni se crea el repositorio ni se pide ningún dato", async () => {
    await montar();

    expect(mockRepositorioPedido).not.toHaveBeenCalled();
    expect(mockListar).not.toHaveBeenCalled();
    expect(valor().movimientos).toEqual([]);
  });

  test("las acciones no llegan a la base aunque se llamen directamente", async () => {
    await montar();

    let resultados: boolean[] = [];

    await act(async () => {
      resultados = [
        await valor().crearMovimiento(DATOS_GASTO),
        await valor().editarMovimiento("m1", DATOS_GASTO),
        await valor().eliminarMovimiento("m1"),
      ];
    });

    expect(resultados).toEqual([false, false, false]);
    expect(mockCrear).not.toHaveBeenCalled();
    expect(mockActualizar).not.toHaveBeenCalled();
    expect(mockEliminar).not.toHaveBeenCalled();
  });

  test("perder el rol borra de memoria lo ya cargado", async () => {
    simularBanda("b1", true);
    const { rerender } = await montar();

    expect(valor().movimientos).toHaveLength(2);

    simularBanda("b1", false);
    await rerender(pantalla());

    await waitFor(() => expect(valor().movimientos).toEqual([]));
    expect(valor().boteActualCentimos).toBe(0);
  });
});

describe("escrituras", () => {
  test("crear suma al bote y mantiene el orden", async () => {
    mockListar.mockResolvedValue([INGRESO]);
    mockCrear.mockResolvedValue(GASTO);
    await montar();

    await act(async () => {
      await valor().crearMovimiento(DATOS_GASTO);
    });

    expect(valor().movimientos.map(({ id }) => id)).toEqual(["m2", "m1"]);
    expect(valor().boteActualCentimos).toBe(67950);
  });

  test("editar recalcula el bote", async () => {
    mockActualizar.mockResolvedValue({ ...GASTO, importeCentimos: 100 });
    await montar();

    await act(async () => {
      await valor().editarMovimiento("m2", { ...DATOS_GASTO, importeCentimos: 100 });
    });

    expect(valor().boteActualCentimos).toBe(79900);
  });

  test("eliminar modifica el bote", async () => {
    mockEliminar.mockResolvedValue();
    await montar();

    await act(async () => {
      await valor().eliminarMovimiento("m2");
    });

    expect(valor().boteActualCentimos).toBe(80000);
    expect(valor().gastosTotalesCentimos).toBe(0);
  });

  test("si la base falla, el bote no cambia", async () => {
    mockEliminar.mockRejectedValue(new Error("fallo"));
    await montar();

    let eliminado = true;

    await act(async () => {
      eliminado = await valor().eliminarMovimiento("m2");
    });

    expect(eliminado).toBe(false);
    expect(valor().boteActualCentimos).toBe(67950);
    expect(valor().errorOperacion).toBe("No se ha podido eliminar el movimiento");
  });

  test("cada operación tiene su mensaje y no toca el error de carga", async () => {
    mockCrear.mockRejectedValue(new Error("fallo"));
    mockActualizar.mockRejectedValue(new Error("fallo"));
    await montar();

    await act(async () => {
      await valor().crearMovimiento(DATOS_GASTO);
    });
    expect(valor().errorOperacion).toBe("No se ha podido guardar el movimiento");

    await act(async () => {
      await valor().editarMovimiento("m2", DATOS_GASTO);
    });
    expect(valor().errorOperacion).toBe("No se han podido guardar los cambios");
    expect(valor().error).toBe("");
  });

  test("explica el rechazo de la base sin detalles técnicos", async () => {
    mockCrear.mockRejectedValueOnce(new ErrorRepositorio("sin_permiso"));
    mockCrear.mockRejectedValueOnce(new ErrorRepositorio("en_uso"));
    await montar();

    await act(async () => {
      await valor().crearMovimiento(DATOS_GASTO);
    });
    expect(valor().errorOperacion).toBe(
      "Solo un administrador de la banda puede gestionar las finanzas"
    );

    await act(async () => {
      await valor().crearMovimiento(DATOS_GASTO);
    });
    expect(valor().errorOperacion).toBe("El evento relacionado ya no existe");
  });

  test("dos envíos seguidos crean un solo movimiento", async () => {
    let terminar: (creado: MovimientoFinanciero) => void = () => {};
    mockCrear.mockReturnValue(
      new Promise((resolver) => {
        terminar = resolver;
      })
    );
    await montar();

    let segundo = true;

    await act(async () => {
      const primero = valor().crearMovimiento(DATOS_GASTO);
      segundo = await valor().crearMovimiento(DATOS_GASTO);
      terminar(GASTO);
      await primero;
    });

    expect(segundo).toBe(false);
    expect(mockCrear).toHaveBeenCalledTimes(1);
  });

  test("limpiarErrorOperacion quita el error", async () => {
    mockCrear.mockRejectedValue(new Error("fallo"));
    await montar();

    await act(async () => {
      await valor().crearMovimiento(DATOS_GASTO);
    });
    await act(async () => {
      valor().limpiarErrorOperacion();
    });

    expect(valor().errorOperacion).toBe("");
  });
});

test("fuera del proveedor avisa del error de programación", async () => {
  jest.spyOn(console, "error").mockImplementation(() => {});

  await expect(render(<Espia />)).rejects.toThrow(
    "useFinanzasContext debe usarse dentro de FinanzasProvider"
  );
});
