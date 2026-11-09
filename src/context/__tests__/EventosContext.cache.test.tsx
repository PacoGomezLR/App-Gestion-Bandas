import { act, render, waitFor } from "@testing-library/react-native";

import type { CachesPorEvento, Evento } from "../../types/evento";
import { useBandaContext } from "../BandaContext";
import { EventosProvider, useEventosContext } from "../EventosContext";

jest.mock("../BandaContext", () => ({ useBandaContext: jest.fn() }));

const mockCrear = jest.fn();
const mockCrearConCache = jest.fn();
const mockActualizar = jest.fn();
const mockActualizarConCache = jest.fn();
const mockEliminar = jest.fn();
const mockListarEventos = jest.fn<Promise<Evento[]>, []>();
const mockListarCaches = jest.fn<Promise<CachesPorEvento>, []>();
const mockRepositorioCaches = jest.fn<void, [string]>();

jest.mock("../../services/supabase/eventos", () => ({
  crearRepositorioEventosSupabase: () => ({
    listar: () => mockListarEventos(),
    crear: (...args: unknown[]) => mockCrear(...args),
    crearConCache: (...args: unknown[]) => mockCrearConCache(...args),
    actualizar: (...args: unknown[]) => mockActualizar(...args),
    actualizarConCache: (...args: unknown[]) => mockActualizarConCache(...args),
    eliminar: (...args: unknown[]) => mockEliminar(...args),
  }),
}));

jest.mock("../../services/supabase/eventoFinanzas", () => ({
  crearRepositorioEventoFinanzasSupabase: (bandaId: string) => {
    mockRepositorioCaches(bandaId);

    return { listar: () => mockListarCaches() };
  },
}));

const mockUseBandaContext = jest.mocked(useBandaContext);

function simularBanda(bandaId: string, esAdmin = true) {
  mockUseBandaContext.mockReturnValue({
    bandaActual: { id: bandaId, nombre: "Banda" },
    esAdmin,
  } as unknown as ReturnType<typeof useBandaContext>);
}

const BODA: Evento = {
  id: "e1",
  titulo: "Boda Córdoba 14/11/2026",
  tipo: "boda",
  fecha: "2026-11-14",
  hora: "",
  lugar: "Córdoba",
  notas: "",
  estado: "confirmado",
  tecnicoIds: [],
};

const ENSAYO: Evento = { ...BODA, id: "e2", tipo: "ensayo" };

let contexto: ReturnType<typeof useEventosContext> | null = null;

function Espia() {
  contexto = useEventosContext();
  return null;
}

function valor(): ReturnType<typeof useEventosContext> {
  if (contexto === null) {
    throw new Error("Falta el contexto");
  }

  return contexto;
}

function pantalla() {
  return (
    <EventosProvider>
      <Espia />
    </EventosProvider>
  );
}

async function montar() {
  const resultado = await render(pantalla());

  await waitFor(() => {
    expect(valor().cargando).toBe(false);
    expect(valor().cargandoCaches).toBe(false);
  });

  return resultado;
}

async function escribirCache(texto: string) {
  await act(async () => {
    valor().setCache(texto);
  });
}

async function guardar(): Promise<boolean> {
  let guardado = false;

  await act(async () => {
    guardado = await valor().guardarEvento();
  });

  return guardado;
}

async function prepararAlta() {
  await act(async () => {
    valor().setTipo("boda");
    valor().setFecha("2026-12-01");
  });
}

async function prepararEdicion(evento: Evento) {
  await act(async () => {
    valor().prepararEdicion(evento);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  contexto = null;
  simularBanda("b1");
  mockListarEventos.mockResolvedValue([BODA, ENSAYO]);
  mockListarCaches.mockResolvedValue({ e1: 120000 });
  mockCrear.mockImplementation(async (datos: object) => ({ ...datos, id: "nuevo" }));
  mockCrearConCache.mockImplementation(async (datos: object) => ({ ...datos, id: "nuevo" }));
  mockActualizar.mockImplementation(async (evento: Evento) => evento);
  mockActualizarConCache.mockImplementation(async (evento: Evento) => evento);
  mockEliminar.mockResolvedValue(undefined);
});

describe("carga de cachés", () => {
  test("una sola consulta para toda la banda, tenga los eventos que tenga", async () => {
    await montar();

    expect(valor().eventos).toHaveLength(2);
    expect(valor().cachesEvento).toEqual({ e1: 120000 });
    expect(mockListarCaches).toHaveBeenCalledTimes(1);
  });

  test("un usuario normal no consulta nada y no recibe ningún caché", async () => {
    simularBanda("b1", false);
    await montar();

    expect(mockRepositorioCaches).not.toHaveBeenCalled();
    expect(mockListarCaches).not.toHaveBeenCalled();
    expect(valor().cachesEvento).toEqual({});
    // Sus eventos siguen ahí
    expect(valor().eventos).toHaveLength(2);
  });

  test("si falla, los eventos siguen funcionando y se avisa aparte", async () => {
    mockListarCaches.mockRejectedValue(new Error("sin tabla"));
    await montar();

    expect(valor().eventos).toHaveLength(2);
    expect(valor().errorCaches).toBe("No se ha podido cargar el caché");
    expect(valor().errorPersistencia).toBe("");
  });

  test("perder el rol borra de memoria los cachés", async () => {
    const { rerender } = await montar();

    simularBanda("b1", false);
    await rerender(pantalla());

    await waitFor(() => expect(valor().cachesEvento).toEqual({}));
  });

  test("al cambiar de banda no quedan cachés de la anterior", async () => {
    const { rerender } = await montar();

    simularBanda("b2");
    mockListarCaches.mockResolvedValue({ otro: 5 });
    await rerender(pantalla());

    await waitFor(() => expect(valor().cachesEvento).toEqual({ otro: 5 }));
  });
});

describe("crear", () => {
  test("con caché usa la transacción conjunta, en céntimos", async () => {
    await montar();
    await prepararAlta();
    await escribirCache("1250,50");

    expect(await guardar()).toBe(true);

    expect(mockCrearConCache).toHaveBeenCalledWith(
      expect.objectContaining({ fecha: "2026-12-01" }),
      125050
    );
    expect(mockCrear).not.toHaveBeenCalled();
    expect(valor().cachesEvento.nuevo).toBe(125050);
  });

  test("con 0 registra 0: es un dato, no la falta de dato", async () => {
    await montar();
    await prepararAlta();
    await escribirCache("0");

    await guardar();

    expect(mockCrearConCache).toHaveBeenCalledWith(expect.anything(), 0);
    expect(valor().cachesEvento.nuevo).toBe(0);
  });

  test("sin caché sigue el camino de siempre", async () => {
    await montar();
    await prepararAlta();

    await guardar();

    expect(mockCrear).toHaveBeenCalledTimes(1);
    expect(mockCrearConCache).not.toHaveBeenCalled();
    expect(valor().cachesEvento.nuevo).toBeUndefined();
  });

  test.each([
    ["-100", "El importe no puede ser negativo"],
    ["abc", "Escribe el importe solo con números, por ejemplo 12,50"],
    ["12,345", "El importe admite como máximo dos decimales"],
  ])("%s se rechaza sin llegar a la base", async (texto, mensaje) => {
    await montar();
    await prepararAlta();
    await escribirCache(texto);

    expect(await guardar()).toBe(false);

    expect(valor().error).toBe(mensaje);
    expect(mockCrearConCache).not.toHaveBeenCalled();
    expect(mockCrear).not.toHaveBeenCalled();
  });

  test("si la transacción falla no queda evento y el formulario conserva lo escrito", async () => {
    mockCrearConCache.mockRejectedValue(new Error("fallo"));
    await montar();
    await prepararAlta();
    await escribirCache("1200");

    expect(await guardar()).toBe(false);

    expect(valor().errorPersistencia).toBe("No se ha podido guardar el evento");
    expect(valor().eventos).toHaveLength(2);
    expect(valor().cachesEvento.nuevo).toBeUndefined();
    expect(valor().cache).toBe("1200");
    expect(valor().fecha).toBe("2026-12-01");
  });
});

describe("editar", () => {
  test("el campo trae el caché guardado", async () => {
    await montar();
    await prepararEdicion(BODA);

    expect(valor().cache).toBe("1200,00");
  });

  test("sin tocarlo no se envía nada del caché", async () => {
    await montar();
    await prepararEdicion(BODA);

    await guardar();

    expect(mockActualizar).toHaveBeenCalledTimes(1);
    expect(mockActualizarConCache).not.toHaveBeenCalled();
    expect(valor().cachesEvento.e1).toBe(120000);
  });

  test("añade caché a un evento que no lo tenía", async () => {
    await montar();
    await prepararEdicion(ENSAYO);
    await escribirCache("300");

    await guardar();

    expect(mockActualizarConCache).toHaveBeenCalledWith(expect.objectContaining({ id: "e2" }), 30000);
    expect(valor().cachesEvento.e2).toBe(30000);
  });

  test("cambia un caché existente", async () => {
    await montar();
    await prepararEdicion(BODA);
    await escribirCache("1300,50");

    await guardar();

    expect(mockActualizarConCache).toHaveBeenCalledWith(expect.objectContaining({ id: "e1" }), 130050);
    expect(valor().cachesEvento.e1).toBe(130050);
  });

  test("lo pone a 0", async () => {
    await montar();
    await prepararEdicion(BODA);
    await escribirCache("0");

    await guardar();

    expect(mockActualizarConCache).toHaveBeenCalledWith(expect.anything(), 0);
    expect(valor().cachesEvento.e1).toBe(0);
  });

  test("vaciar el campo lo quita", async () => {
    await montar();
    await prepararEdicion(BODA);
    await escribirCache("");

    await guardar();

    expect(mockActualizarConCache).toHaveBeenCalledWith(expect.anything(), null);
    expect(valor().cachesEvento.e1).toBeUndefined();
  });

  test("reescribir el mismo importe no cambia nada", async () => {
    await montar();
    await prepararEdicion(BODA);
    await escribirCache("1200");

    await guardar();

    expect(mockActualizar).toHaveBeenCalledTimes(1);
    expect(mockActualizarConCache).not.toHaveBeenCalled();
  });

  test("con la carga fallida, editar el evento nunca toca un caché que no se conoce", async () => {
    mockListarCaches.mockRejectedValue(new Error("fallo"));
    await montar();
    await prepararEdicion(BODA);

    await guardar();

    expect(mockActualizar).toHaveBeenCalledTimes(1);
    expect(mockActualizarConCache).not.toHaveBeenCalled();
  });

  test("cancelar descarta lo escrito", async () => {
    await montar();
    await prepararEdicion(BODA);
    await escribirCache("1");

    await act(async () => {
      valor().cancelarEdicion();
    });
    await prepararEdicion(BODA);

    expect(valor().cache).toBe("1200,00");
  });
});

describe("eliminar", () => {
  test("al borrar el evento desaparece su caché", async () => {
    await montar();

    await act(async () => {
      await valor().eliminarEvento("e1");
    });

    expect(valor().cachesEvento.e1).toBeUndefined();
  });

  test("si no se puede borrar, el caché permanece", async () => {
    const { ErrorRepositorio } = jest.requireActual<typeof import("../../services/supabase/errores")>(
      "../../services/supabase/errores"
    );

    mockEliminar.mockRejectedValue(new ErrorRepositorio("en_uso"));
    await montar();

    await act(async () => {
      await valor().eliminarEvento("e1");
    });

    expect(valor().cachesEvento.e1).toBe(120000);
    expect(valor().errorEliminacion?.eventoId).toBe("e1");
  });
});

describe("sin automatismos con Finanzas", () => {
  test("guardar un evento no puede crear movimientos: este contexto no usa Finanzas", () => {
    const fs = jest.requireActual<{
      readFileSync: (ruta: string, codificacion: "utf8") => string;
    }>("fs");
    const codigo = fs.readFileSync("src/context/EventosContext.tsx", "utf8");

    expect(codigo).not.toMatch(/supabase\/finanzas"|FinanzasContext/);
  });
});
