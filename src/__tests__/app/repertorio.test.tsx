import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Alert, type AlertButton, BackHandler, Platform } from "react-native";

import { useBandaContext } from "../../context/BandaContext";
import { RepertorioProvider, useRepertorioContext } from "../../context/RepertorioContext";
import type { Cancion, EstadoCancion } from "../../types/cancion";
import RepertorioScreen from "../../app/repertorio";

// El proveedor y la pantalla son los reales: solo se simula el repositorio, para
// comprobar lo que llegaría a Supabase.

let mockEnFoco = true;

jest.mock("expo-router", () => ({ useIsFocused: () => mockEnFoco }));
jest.mock("../../global.css", () => ({}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));

jest.mock("../../components/BotonCerrarSesion", () => {
  const { Text } = jest.requireActual<typeof import("react-native")>("react-native");

  return { BotonCerrarSesion: () => <Text>Cerrar sesión</Text> };
});

jest.mock("../../context/BandaContext", () => ({ useBandaContext: jest.fn() }));

const mockRepositorioPedido = jest.fn<void, [string]>();
const mockListar = jest.fn<Promise<Cancion[]>, []>();
const mockCrear = jest.fn<Promise<Cancion>, [string, EstadoCancion]>();
const mockEditar = jest.fn<Promise<Cancion>, [string, string]>();
const mockPasar = jest.fn<Promise<Cancion>, [string]>();
const mockEliminar = jest.fn<Promise<void>, [string]>();

jest.mock("../../services/supabase/canciones", () => ({
  crearRepositorioCancionesSupabase: (bandaId: string) => {
    mockRepositorioPedido(bandaId);

    return {
      listar: () => mockListar(),
      crear: (nombre: string, estado: EstadoCancion) => mockCrear(nombre, estado),
      editarNombre: (id: string, nombre: string) => mockEditar(id, nombre),
      pasarARepertorio: (id: string) => mockPasar(id),
      eliminar: (id: string) => mockEliminar(id),
    };
  },
}));

const mockUseBandaContext = jest.mocked(useBandaContext);

const PIRATAS: Cancion = { id: "c1", nombre: "Años 80 - Los Piratas", estado: "repertorio" };
const GRANADA: Cancion = { id: "c2", nombre: "Granada - Supersubmarina", estado: "repertorio" };
const LEIVA: Cancion = { id: "c3", nombre: "Como si fueras a morir mañana - Leiva", estado: "nueva" };
const CAFFEINA: Cancion = { id: "c4", nombre: "Mira cómo vuelo - Miss Caffeina", estado: "nueva" };

function simular({
  esAdmin = true,
  canciones = [GRANADA, LEIVA, PIRATAS, CAFFEINA],
  bandaId = "b1",
}: { esAdmin?: boolean; canciones?: Cancion[]; bandaId?: string } = {}) {
  mockUseBandaContext.mockReturnValue({
    bandaActual: { id: bandaId, nombre: "IndiesPensables" },
    esAdmin,
  } as unknown as ReturnType<typeof useBandaContext>);

  mockListar.mockResolvedValue(canciones);
  mockCrear.mockImplementation(async (nombre, estado) => ({ id: `nueva-${nombre}`, nombre, estado }));
  mockEditar.mockImplementation(async (id, nombre) => ({
    ...(canciones.find((cancion) => cancion.id === id) ?? PIRATAS),
    nombre,
  }));
  mockPasar.mockImplementation(async (id) => ({
    ...(canciones.find((cancion) => cancion.id === id) ?? LEIVA),
    estado: "repertorio",
  }));
  mockEliminar.mockResolvedValue(undefined);
}

function pantalla() {
  return (
    <RepertorioProvider>
      <RepertorioScreen />
    </RepertorioProvider>
  );
}

async function abrir() {
  const resultado = await render(pantalla());

  await screen.findByRole("tab", { name: /^Repertorio/ });
  await screen.findByText(/Años 80|Todavía no hay|No se han podido/);

  return resultado;
}

async function irANuevas() {
  await fireEvent.press(screen.getByRole("tab", { name: /^Canciones nuevas/ }));
}

function nombresVisibles(): string[] {
  return [PIRATAS, GRANADA, LEIVA, CAFFEINA]
    .map(({ nombre }) => nombre)
    .filter((nombre) => screen.queryByText(nombre) !== null)
    .sort(
      (a, b) =>
        JSON.stringify(screen.toJSON()).indexOf(a) - JSON.stringify(screen.toJSON()).indexOf(b)
    );
}

function botonDeAlerta(espia: jest.SpyInstance, texto: string): AlertButton {
  const botones = espia.mock.calls[0][2] as AlertButton[];
  const boton = botones.find((actual) => actual.text === texto);

  if (boton === undefined) {
    throw new Error(`Falta el botón ${texto}`);
  }

  return boton;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockEnFoco = true;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Repertorio: apartados", () => {
  test("una sola consulta trae los dos apartados", async () => {
    simular();
    await abrir();
    await irANuevas();

    expect(mockListar).toHaveBeenCalledTimes(1);
  });

  test("empieza en Repertorio, ordenado alfabéticamente", async () => {
    simular();
    await abrir();

    expect(screen.getByRole("tab", { name: /^Repertorio/ }).props.accessibilityState.selected).toBe(true);
    expect(nombresVisibles()).toEqual(["Años 80 - Los Piratas", "Granada - Supersubmarina"]);
  });

  test("Canciones nuevas muestra solo las suyas, también ordenadas", async () => {
    simular();
    await abrir();
    await irANuevas();

    expect(screen.getByRole("tab", { name: /^Canciones nuevas/ }).props.accessibilityState.selected).toBe(true);
    expect(nombresVisibles()).toEqual([
      "Como si fueras a morir mañana - Leiva",
      "Mira cómo vuelo - Miss Caffeina",
    ]);
  });

  test("los contadores salen de lo ya cargado", async () => {
    simular();
    await abrir();

    expect(screen.getByText("Repertorio (2)")).toBeTruthy();
    expect(screen.getByText("Canciones nuevas (2)")).toBeTruthy();
  });

  test("si la carga falla, ni contadores ni mensaje de lista vacía", async () => {
    simular();
    mockListar.mockRejectedValue(new Error("fallo"));
    await abrir();

    expect(screen.getByText("No se han podido cargar las canciones")).toBeTruthy();
    expect(screen.queryByText(/\(\d+\)/)).toBeNull();
    expect(screen.queryByText("Todavía no hay canciones en el repertorio.")).toBeNull();
    expect(screen.queryByText("+ Añadir canción")).toBeNull();
  });

  test.each([
    [true, "Todavía no hay canciones en el repertorio.", "Añade la primera canción para empezar."],
    [false, "Todavía no hay canciones en el repertorio.", null],
  ])("repertorio vacío (admin: %s)", async (esAdmin, titulo, detalle) => {
    simular({ esAdmin, canciones: [] });
    await abrir();

    expect(screen.getByText(titulo)).toBeTruthy();
    expect(screen.queryByText("Añade la primera canción para empezar.") !== null).toBe(detalle !== null);
  });

  test.each([true, false])("canciones nuevas vacío (admin: %s)", async (esAdmin) => {
    simular({ esAdmin, canciones: [PIRATAS] });
    await abrir();
    await irANuevas();

    expect(screen.getByText("No hay canciones nuevas.")).toBeTruthy();
    expect(
      screen.queryByText("Añade aquí las canciones que queréis incorporar al repertorio.") !== null
    ).toBe(esAdmin);
  });
});

describe("Repertorio: admin", () => {
  async function abrirAlta(enNuevas = false) {
    await abrir();

    if (enNuevas) {
      await irANuevas();
    }

    await fireEvent.press(screen.getByText("+ Añadir canción"));
  }

  test("+ Añadir canción abre un formulario de una sola línea", async () => {
    simular();
    await abrirAlta();

    expect(screen.getByText("Nueva canción")).toBeTruthy();
    expect(screen.getByLabelText("Canción").props.placeholder).toBe("Años 80 - Los Piratas");
    expect(screen.getByLabelText("Canción").props.maxLength).toBe(160);
    expect(screen.getByRole("button", { name: "Guardar canción" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeTruthy();
  });

  test("desde Repertorio la crea en el repertorio, recortada y sin tocar mayúsculas", async () => {
    simular();
    await abrirAlta();

    await fireEvent.changeText(screen.getByLabelText("Canción"), "  LN Granada - Supersubmarina ");
    await fireEvent.press(screen.getByText("Guardar canción"));

    expect(mockCrear).toHaveBeenCalledWith("LN Granada - Supersubmarina", "repertorio");
    expect(await screen.findByText("LN Granada - Supersubmarina")).toBeTruthy();
    expect(screen.getByText("Repertorio (3)")).toBeTruthy();
  });

  test("desde Canciones nuevas la crea como nueva, sin preguntar", async () => {
    simular();
    await abrirAlta(true);

    expect(screen.queryByRole("radio")).toBeNull();

    await fireEvent.changeText(screen.getByLabelText("Canción"), "Años 80");
    await fireEvent.press(screen.getByText("Guardar canción"));

    expect(mockCrear).toHaveBeenCalledWith("Años 80", "nueva");
    expect(await screen.findByText("Canciones nuevas (3)")).toBeTruthy();
  });

  test("Cancelar no guarda", async () => {
    simular();
    await abrirAlta();
    await fireEvent.changeText(screen.getByLabelText("Canción"), "Años 80");

    await fireEvent.press(screen.getByText("Cancelar"));

    expect(mockCrear).not.toHaveBeenCalled();
    expect(screen.getByText("+ Añadir canción")).toBeTruthy();
  });

  test("sin nombre no guarda y lo explica", async () => {
    simular();
    await abrirAlta();

    await fireEvent.press(screen.getByText("Guardar canción"));

    expect(mockCrear).not.toHaveBeenCalled();
    expect(screen.getByText("Escribe el nombre de la canción")).toBeTruthy();
  });

  test("un doble toque no duplica la canción", async () => {
    let terminar: (cancion: Cancion) => void = () => {};
    simular();
    mockCrear.mockReturnValue(
      new Promise((resolver) => {
        terminar = resolver;
      })
    );
    await abrirAlta();
    await fireEvent.changeText(screen.getByLabelText("Canción"), "Años 80");

    await fireEvent.press(screen.getByText("Guardar canción"));
    const boton = screen.getByRole("button", { name: "Guardando..." });

    expect(boton.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(boton);
    expect(mockCrear).toHaveBeenCalledTimes(1);

    await act(async () => {
      terminar({ id: "x", nombre: "Años 80", estado: "repertorio" });
    });
  });

  test("si falla, sigue el formulario con lo escrito y el error", async () => {
    simular();
    mockCrear.mockRejectedValue(new Error("fallo"));
    await abrirAlta();
    await fireEvent.changeText(screen.getByLabelText("Canción"), "Años 80");

    await fireEvent.press(screen.getByText("Guardar canción"));

    expect(await screen.findByText("No se ha podido guardar la canción")).toBeTruthy();
    expect(screen.getByLabelText("Canción").props.value).toBe("Años 80");
  });

  test("la fila abre el detalle de una canción del repertorio", async () => {
    simular();
    await abrir();

    await fireEvent.press(screen.getByRole("button", { name: "Años 80 - Los Piratas" }));

    expect(screen.getByRole("button", { name: "Editar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Eliminar canción" })).toBeTruthy();
    expect(screen.queryByText("Pasar a repertorio")).toBeNull();
    expect(screen.queryByText(/Mover a canciones nuevas/)).toBeNull();
  });

  test("editar cambia solo el nombre y vuelve al detalle", async () => {
    simular();
    await abrir();
    await fireEvent.press(screen.getByRole("button", { name: "Años 80 - Los Piratas" }));
    await fireEvent.press(screen.getByText("Editar"));

    expect(screen.getByLabelText("Canción").props.value).toBe("Años 80 - Los Piratas");
    expect(screen.queryByRole("radio")).toBeNull();

    await fireEvent.changeText(screen.getByLabelText("Canción"), "Años 80");
    await fireEvent.press(screen.getByText("Guardar cambios"));

    expect(mockEditar).toHaveBeenCalledWith("c1", "Años 80");
    expect(await screen.findByRole("header", { name: "Años 80" })).toBeTruthy();
  });

  test("eliminar pide confirmación con el nombre y Eliminar es destructivo", async () => {
    const alerta = jest.spyOn(Alert, "alert");
    simular();
    await abrir();
    await fireEvent.press(screen.getByRole("button", { name: "Años 80 - Los Piratas" }));

    await fireEvent.press(screen.getByText("Eliminar canción"));

    expect(alerta.mock.calls[0][0]).toBe("¿Eliminar canción?");
    expect(alerta.mock.calls[0][1]).toBe("“Años 80 - Los Piratas” se eliminará del repertorio.");
    expect(botonDeAlerta(alerta, "Cancelar").style).toBe("cancel");
    expect(botonDeAlerta(alerta, "Eliminar").style).toBe("destructive");
    expect(mockEliminar).not.toHaveBeenCalled();
  });

  test("Cancelar en la confirmación no elimina", async () => {
    const alerta = jest.spyOn(Alert, "alert");
    simular();
    await abrir();
    await fireEvent.press(screen.getByRole("button", { name: "Años 80 - Los Piratas" }));
    await fireEvent.press(screen.getByText("Eliminar canción"));

    expect(botonDeAlerta(alerta, "Cancelar").onPress).toBeUndefined();
    expect(mockEliminar).not.toHaveBeenCalled();
  });

  test("Eliminar borra y vuelve a la lista sin ella", async () => {
    const alerta = jest.spyOn(Alert, "alert");
    simular();
    await abrir();
    await fireEvent.press(screen.getByRole("button", { name: "Años 80 - Los Piratas" }));
    await fireEvent.press(screen.getByText("Eliminar canción"));

    await act(async () => {
      botonDeAlerta(alerta, "Eliminar").onPress?.();
    });

    expect(mockEliminar).toHaveBeenCalledWith("c1");
    expect(screen.queryByText("Años 80 - Los Piratas")).toBeNull();
    expect(screen.getByText("Repertorio (1)")).toBeTruthy();
  });

  test("en Canciones nuevas la acción principal es Pasar a repertorio", async () => {
    simular();
    await abrir();
    await irANuevas();
    await fireEvent.press(screen.getByRole("button", { name: "Como si fueras a morir mañana - Leiva" }));

    expect(screen.getByRole("button", { name: "Pasar a repertorio" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Editar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Eliminar canción" })).toBeTruthy();
  });

  test("pasar a repertorio la quita de nuevas y la pone en el repertorio, sin duplicarla", async () => {
    simular();
    await abrir();
    await irANuevas();
    await fireEvent.press(screen.getByRole("button", { name: "Como si fueras a morir mañana - Leiva" }));

    await fireEvent.press(screen.getByText("Pasar a repertorio"));

    expect(mockPasar).toHaveBeenCalledWith("c3");
    expect(mockCrear).not.toHaveBeenCalled();
    expect(await screen.findByText("Canciones nuevas (1)")).toBeTruthy();
    expect(screen.queryByText("Como si fueras a morir mañana - Leiva")).toBeNull();

    await fireEvent.press(screen.getByRole("tab", { name: /^Repertorio/ }));

    expect(screen.getByText("Repertorio (3)")).toBeTruthy();
    expect(screen.getAllByText("Como si fueras a morir mañana - Leiva")).toHaveLength(1);
  });
});

describe("Repertorio: usuario normal", () => {
  test("consulta los dos apartados sin acciones y sin filas pulsables", async () => {
    simular({ esAdmin: false });
    await abrir();

    expect(screen.getByText("Años 80 - Los Piratas")).toBeTruthy();
    expect(screen.queryByText("+ Añadir canción")).toBeNull();
    expect(screen.queryByRole("button", { name: "Años 80 - Los Piratas" })).toBeNull();

    await irANuevas();

    expect(screen.getByText("Como si fueras a morir mañana - Leiva")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Leiva/ })).toBeNull();
    expect(screen.queryByText("Pasar a repertorio")).toBeNull();
    expect(screen.queryByText("Editar")).toBeNull();
    expect(screen.queryByText("Eliminar canción")).toBeNull();
  });

  test("aunque llame a las acciones directamente, no llegan a la base", async () => {
    simular({ esAdmin: false });
    let contexto: ReturnType<typeof useRepertorioContext> | null = null;

    function Espia() {
      contexto = useRepertorioContext();
      return null;
    }

    await render(
      <RepertorioProvider>
        <Espia />
      </RepertorioProvider>
    );

    function acciones(): ReturnType<typeof useRepertorioContext> {
      if (contexto === null) {
        throw new Error("Falta el contexto");
      }

      return contexto;
    }

    let resultados: boolean[] = [];

    await act(async () => {
      resultados = [
        await acciones().crearCancion("X", "nueva"),
        await acciones().editarCancion("c1", "X"),
        await acciones().pasarARepertorio("c3"),
        await acciones().eliminarCancion("c1"),
      ];
    });

    expect(resultados).toEqual([false, false, false, false]);
    expect(mockCrear).not.toHaveBeenCalled();
    expect(mockEditar).not.toHaveBeenCalled();
    expect(mockPasar).not.toHaveBeenCalled();
    expect(mockEliminar).not.toHaveBeenCalled();
  });
});

describe("Repertorio: cambio de banda", () => {
  test("no enseña canciones de la banda anterior", async () => {
    simular();
    const { rerender } = await abrir();

    simular({ bandaId: "b2", canciones: [{ id: "z", nombre: "Otra banda - Otra", estado: "repertorio" }] });
    await rerender(pantalla());

    expect(await screen.findByText("Otra banda - Otra")).toBeTruthy();
    expect(screen.queryByText("Años 80 - Los Piratas")).toBeNull();
    expect(mockRepositorioPedido).toHaveBeenLastCalledWith("b2");
  });
});

describe("Repertorio: botón Atrás de Android", () => {
  type Manejador = Parameters<typeof BackHandler.addEventListener>[1];
  let manejadores: Manejador[] = [];

  async function pulsarAtras(): Promise<boolean> {
    const manejador = manejadores[manejadores.length - 1];
    let interceptado = false;

    await act(async () => {
      // La pantalla no usa el evento: se pasa uno vacío
      interceptado = manejador !== undefined && manejador({} as Parameters<Manejador>[0]) === true;
    });

    return interceptado;
  }

  beforeEach(() => {
    manejadores = [];
    jest.replaceProperty(Platform, "OS", "android");
    jest.spyOn(BackHandler, "addEventListener").mockImplementation((_evento, manejador) => {
      manejadores.push(manejador);

      return {
        remove: () => {
          manejadores = manejadores.filter((actual) => actual !== manejador);
        },
      };
    });
  });

  test("en la lista no se intercepta", async () => {
    simular();
    await abrir();

    expect(manejadores).toHaveLength(0);
  });

  test("edición → detalle → lista", async () => {
    simular();
    await abrir();
    await fireEvent.press(screen.getByRole("button", { name: "Años 80 - Los Piratas" }));
    await fireEvent.press(screen.getByText("Editar"));

    expect(await pulsarAtras()).toBe(true);
    expect(screen.getByRole("button", { name: "Eliminar canción" })).toBeTruthy();

    expect(await pulsarAtras()).toBe(true);
    expect(screen.getByText("+ Añadir canción")).toBeTruthy();
    expect(manejadores).toHaveLength(0);
  });

  test("nueva canción → lista, sin guardar", async () => {
    simular();
    await abrir();
    await fireEvent.press(screen.getByText("+ Añadir canción"));

    expect(await pulsarAtras()).toBe(true);
    expect(screen.getByText("+ Añadir canción")).toBeTruthy();
    expect(mockCrear).not.toHaveBeenCalled();
  });

  test("con otra pestaña a la vista no se intercepta y sigue donde estaba", async () => {
    simular();
    const { rerender } = await abrir();
    await fireEvent.press(screen.getByRole("button", { name: "Años 80 - Los Piratas" }));

    mockEnFoco = false;
    await rerender(pantalla());

    expect(manejadores).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Eliminar canción" })).toBeTruthy();

    mockEnFoco = true;
    await rerender(pantalla());

    expect(await pulsarAtras()).toBe(true);
    expect(screen.getByText("+ Añadir canción")).toBeTruthy();
  });
});
