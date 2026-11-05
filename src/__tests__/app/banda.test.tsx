import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Alert, type AlertButton, BackHandler, Platform, Share, StyleSheet } from "react-native";

import { IntegrantesProvider } from "../../context/IntegrantesContext";
import { TecnicosProvider, useTecnicosContext } from "../../context/TecnicosContext";
import { useBandaContext } from "../../context/BandaContext";
import { useEventosContext } from "../../context/EventosContext";
import { crearInvitacionBanda } from "../../services/supabase/invitaciones";
import type { IntegranteBanda } from "../../types/banda";
import type { Tecnico } from "../../types/tecnico";
import BandaScreen from "../../app/banda";

// Los proveedores de integrantes y técnicos son los reales: solo se simulan sus
// repositorios, para comprobar las llamadas que llegan a Supabase.

let mockEnFoco = true;

jest.mock("expo-router", () => ({ useIsFocused: () => mockEnFoco }));

jest.mock("../../global.css", () => ({}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));

jest.mock("expo-linking", () => ({
  createURL: (ruta: string, opciones?: { queryParams?: Record<string, string> }) =>
    `mibanda://${ruta}?token=${opciones?.queryParams?.token ?? ""}`,
}));

jest.mock("../../components/BotonCerrarSesion", () => {
  const { Text } = jest.requireActual<typeof import("react-native")>("react-native");

  return { BotonCerrarSesion: () => <Text>Cerrar sesión</Text> };
});

jest.mock("../../context/BandaContext", () => ({ useBandaContext: jest.fn() }));
jest.mock("../../context/EventosContext", () => ({ useEventosContext: jest.fn() }));

const mockListarIntegrantes = jest.fn<Promise<IntegranteBanda[]>, []>();

jest.mock("../../services/supabase/integrantes", () => ({
  crearRepositorioIntegrantesSupabase: () => ({ listar: () => mockListarIntegrantes() }),
}));

const mockListarTecnicos = jest.fn<Promise<Tecnico[]>, []>();
const mockCrearTecnico = jest.fn<Promise<Tecnico>, [string]>();
const mockActualizarTecnico = jest.fn<Promise<Tecnico>, [Tecnico]>();
const mockEliminarTecnico = jest.fn<Promise<void>, [string]>();

jest.mock("../../services/supabase/personas", () => ({
  crearRepositorioTecnicosSupabase: () => ({
    listar: () => mockListarTecnicos(),
    crear: (nombre: string) => mockCrearTecnico(nombre),
    actualizar: (tecnico: Tecnico) => mockActualizarTecnico(tecnico),
    eliminar: (id: string) => mockEliminarTecnico(id),
  }),
}));

jest.mock("../../services/supabase/invitaciones", () => ({ crearInvitacionBanda: jest.fn() }));

const mockUseBandaContext = jest.mocked(useBandaContext);
const mockUseEventosContext = jest.mocked(useEventosContext);
const mockCrearInvitacion = jest.mocked(crearInvitacionBanda);

// Valor de prueba con el formato del token (no es ningún token real)
const TOKEN = "0123456789abcdef".repeat(4);

const INTEGRANTES: IntegranteBanda[] = [
  { usuarioId: "id-paco", nombreVisible: "Paco Gómez" },
  { usuarioId: "id-kike", nombreVisible: "Kike Fuentes" },
  { usuarioId: "id-sin-nombre", nombreVisible: null },
];

const PABLO: Tecnico = { id: "t1", nombre: "Pablo" };

interface Opciones {
  esAdmin?: boolean;
  tecnicos?: Tecnico[];
  // Ids de técnico asignados a algún evento
  asignados?: string[];
}

function simular({ esAdmin = true, tecnicos = [PABLO], asignados = [] }: Opciones = {}) {
  const banda = { id: "b1", nombre: "IndiesPensables" };

  mockUseBandaContext.mockReturnValue({
    bandas: [],
    bandaActual: banda,
    pertenenciaActual: null,
    cargando: false,
    errorCarga: "",
    error: "",
    esAdmin,
    crearBanda: jest.fn(),
    seleccionarBanda: jest.fn(),
    recargarBandas: jest.fn(),
  } as unknown as ReturnType<typeof useBandaContext>);

  mockUseEventosContext.mockReturnValue({
    cargando: false,
    eventos: asignados.map((id) => ({ tecnicoIds: [id] })),
  } as unknown as ReturnType<typeof useEventosContext>);

  mockListarIntegrantes.mockResolvedValue(INTEGRANTES);
  mockListarTecnicos.mockResolvedValue(tecnicos);
}

// Un elemento nuevo cada vez: con el mismo, rerender no volvería a pintar
function pantalla() {
  return (
    <IntegrantesProvider>
      <TecnicosProvider>
        <BandaScreen />
      </TecnicosProvider>
    </IntegrantesProvider>
  );
}

async function abrirBanda() {
  const resultado = await render(pantalla());

  await screen.findByText("Equipo");

  return resultado;
}

async function abrirTecnicos() {
  await abrirBanda();
  await fireEvent.press(screen.getByRole("button", { name: /^Técnicos/ }));
}

async function abrirPablo() {
  await abrirTecnicos();
  await fireEvent.press(screen.getByRole("button", { name: "Pablo" }));
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

describe("Banda: pantalla principal", () => {
  test("es un índice con el nombre de la banda y los contadores", async () => {
    simular();
    await abrirBanda();

    expect(screen.getByText("Banda")).toBeTruthy();
    expect(screen.getByText("IndiesPensables")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Integrantes: 3" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Técnicos: 1" })).toBeTruthy();
    // Nada abierto a la vez: ni nombres, ni técnicos, ni formularios
    expect(screen.queryByText("Paco Gómez")).toBeNull();
    expect(screen.queryByText("Pablo")).toBeNull();
    expect(screen.queryByText("Generar invitación")).toBeNull();
  });

  test("el admin ve Administración con Invitar usuario", async () => {
    simular();
    await abrirBanda();

    expect(screen.getByText("Administración")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Invitar usuario" })).toBeTruthy();
  });

  test("un usuario normal no ve acciones de administración", async () => {
    simular({ esAdmin: false });
    await abrirBanda();

    expect(screen.queryByText("Administración")).toBeNull();
    expect(screen.queryByText("Invitar usuario")).toBeNull();
    expect(screen.getByRole("button", { name: "Integrantes: 3" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Técnicos: 1" })).toBeTruthy();
  });

  test("las filas del índice conservan la flecha y el título sin centrar", async () => {
    simular();
    await abrirBanda();

    // Integrantes, Técnicos e Invitar usuario
    expect(screen.getAllByText("›")).toHaveLength(3);
    expect(StyleSheet.flatten(screen.getByText("Integrantes").props.style).textAlign).toBeUndefined();
  });

  test("si no se cargan los integrantes no enseña un 0 engañoso", async () => {
    simular();
    mockListarIntegrantes.mockRejectedValue(new Error("fallo"));
    await abrirBanda();

    expect(screen.getByText("No se han podido cargar los nombres de la banda")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Integrantes" })).toBeTruthy();
  });
});

describe("Banda: Integrantes", () => {
  test.each([true, false])("lista los nombres sin correos, ids ni roles (admin: %s)", async (esAdmin) => {
    simular({ esAdmin });
    await abrirBanda();

    await fireEvent.press(screen.getByRole("button", { name: /^Integrantes/ }));

    expect(screen.getByText("Paco Gómez")).toBeTruthy();
    expect(screen.getByText("Kike Fuentes")).toBeTruthy();
    expect(screen.getByText("Integrante sin nombre")).toBeTruthy();
    expect(screen.queryByText(/@|id-|admin|administrador|usuario/i)).toBeNull();
  });

  test("los nombres siguen alineados a la izquierda", async () => {
    simular();
    await abrirBanda();

    await fireEvent.press(screen.getByRole("button", { name: /^Integrantes/ }));

    expect(StyleSheet.flatten(screen.getByText("Paco Gómez").props.style).textAlign).toBeUndefined();
  });

  test("usa la carga del contexto: una sola consulta, ninguna por persona", async () => {
    simular();
    await abrirBanda();

    await fireEvent.press(screen.getByRole("button", { name: /^Integrantes/ }));
    await fireEvent.press(screen.getByText("Volver a Banda"));
    await fireEvent.press(screen.getByRole("button", { name: /^Integrantes/ }));

    expect(mockListarIntegrantes).toHaveBeenCalledTimes(1);
  });
});

describe("Banda: Técnicos", () => {
  test("lista los técnicos sin ningún campo a la vista", async () => {
    simular();
    await abrirTecnicos();

    expect(screen.getByText("Personas de apoyo técnico de la banda.")).toBeTruthy();
    expect(screen.getByText("Pablo")).toBeTruthy();
    expect(screen.queryByLabelText("Nombre del técnico")).toBeNull();
    expect(screen.queryByText("Guardar técnico")).toBeNull();
  });

  test("el admin abre el detalle desde una fila centrada y sin flecha", async () => {
    simular();
    await abrirTecnicos();

    expect(screen.queryByText("›")).toBeNull();
    expect(StyleSheet.flatten(screen.getByText("Pablo").props.style).textAlign).toBe("center");

    await fireEvent.press(screen.getByRole("button", { name: "Pablo" }));

    expect(screen.getByRole("button", { name: "Editar técnico" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Eliminar técnico" })).toBeTruthy();
  });

  test("un usuario normal ve el nombre centrado, pero no puede abrir el detalle", async () => {
    simular({ esAdmin: false });
    await abrirTecnicos();

    expect(StyleSheet.flatten(screen.getByText("Pablo").props.style).textAlign).toBe("center");
    expect(screen.queryByRole("button", { name: "Pablo" })).toBeNull();

    await fireEvent.press(screen.getByText("Pablo"));

    expect(screen.queryByText("Editar técnico")).toBeNull();
    expect(screen.queryByText("Eliminar técnico")).toBeNull();
  });

  test("no hay Editar ni Eliminar en la lista", async () => {
    simular();
    await abrirTecnicos();

    expect(screen.queryByText(/editar/i)).toBeNull();
    expect(screen.queryByText(/eliminar/i)).toBeNull();
  });

  test("el admin añade un técnico: abre el formulario y guarda", async () => {
    simular();
    mockCrearTecnico.mockResolvedValue({ id: "t2", nombre: "Lucía" });
    await abrirTecnicos();

    await fireEvent.press(screen.getByText("+ Añadir técnico"));
    expect(screen.getByText("Nuevo técnico")).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText("Nombre del técnico"), "  Lucía ");
    await fireEvent.press(screen.getByText("Guardar técnico"));

    expect(mockCrearTecnico).toHaveBeenCalledWith("Lucía");
    expect(await screen.findByText("Lucía")).toBeTruthy();
    expect(screen.queryByLabelText("Nombre del técnico")).toBeNull();
  });

  test("Cancelar cierra el formulario sin guardar ni dejar lo escrito", async () => {
    simular();
    await abrirTecnicos();

    await fireEvent.press(screen.getByText("+ Añadir técnico"));
    await fireEvent.changeText(screen.getByLabelText("Nombre del técnico"), "Lucía");
    await fireEvent.press(screen.getByText("Cancelar"));

    expect(mockCrearTecnico).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Nombre del técnico")).toBeNull();

    await fireEvent.press(screen.getByText("+ Añadir técnico"));
    expect(screen.getByLabelText("Nombre del técnico").props.value).toBe("");
  });

  test("sin nombre avisa y no guarda", async () => {
    simular();
    await abrirTecnicos();

    await fireEvent.press(screen.getByText("+ Añadir técnico"));
    await fireEvent.press(screen.getByText("Guardar técnico"));

    expect(screen.getByText("El nombre es obligatorio")).toBeTruthy();
    expect(mockCrearTecnico).not.toHaveBeenCalled();
  });

  test("si falla al guardar, el formulario sigue abierto con el error", async () => {
    simular();
    mockCrearTecnico.mockRejectedValue(new Error("fallo"));
    await abrirTecnicos();

    await fireEvent.press(screen.getByText("+ Añadir técnico"));
    await fireEvent.changeText(screen.getByLabelText("Nombre del técnico"), "Lucía");
    await fireEvent.press(screen.getByText("Guardar técnico"));

    expect(await screen.findByText("No se ha podido guardar el técnico")).toBeTruthy();
    expect(screen.getByLabelText("Nombre del técnico").props.value).toBe("Lucía");
  });

  test("el admin edita desde el detalle y vuelve al detalle con el nombre nuevo", async () => {
    simular();
    mockActualizarTecnico.mockResolvedValue({ id: "t1", nombre: "Pablo Ruiz" });
    await abrirPablo();

    await fireEvent.press(screen.getByText("Editar técnico"));
    expect(screen.getByLabelText("Nombre del técnico").props.value).toBe("Pablo");

    await fireEvent.changeText(screen.getByLabelText("Nombre del técnico"), "Pablo Ruiz");
    await fireEvent.press(screen.getByText("Guardar cambios"));

    expect(mockActualizarTecnico).toHaveBeenCalledWith({ id: "t1", nombre: "Pablo Ruiz" });
    expect(await screen.findByText("Pablo Ruiz")).toBeTruthy();
    expect(screen.getByText("Eliminar técnico")).toBeTruthy();
  });

  test("Eliminar pide confirmación; Cancelar no borra nada", async () => {
    simular();
    const alerta = jest.spyOn(Alert, "alert");
    await abrirPablo();

    await fireEvent.press(screen.getByText("Eliminar técnico"));

    expect(alerta).toHaveBeenCalledTimes(1);
    expect(alerta.mock.calls[0][1]).toContain("Pablo");
    expect(mockEliminarTecnico).not.toHaveBeenCalled();
    expect(botonDeAlerta(alerta, "Cancelar").style).toBe("cancel");
    expect(botonDeAlerta(alerta, "Eliminar").style).toBe("destructive");
  });

  test("al confirmar se borra y vuelve a la lista vacía", async () => {
    simular();
    mockEliminarTecnico.mockResolvedValue();
    const alerta = jest.spyOn(Alert, "alert");
    await abrirPablo();

    await fireEvent.press(screen.getByText("Eliminar técnico"));
    await act(async () => {
      botonDeAlerta(alerta, "Eliminar").onPress?.();
    });

    expect(mockEliminarTecnico).toHaveBeenCalledWith("t1");
    expect(await screen.findByText("Todavía no hay técnicos")).toBeTruthy();
  });

  test("un técnico asignado a un evento no se borra y lo explica en su detalle", async () => {
    simular({ asignados: ["t1"] });
    const alerta = jest.spyOn(Alert, "alert");
    await abrirPablo();

    await fireEvent.press(screen.getByText("Eliminar técnico"));
    await act(async () => {
      botonDeAlerta(alerta, "Eliminar").onPress?.();
    });

    expect(mockEliminarTecnico).not.toHaveBeenCalled();
    expect(screen.getByText("No se puede eliminar a Pablo porque está asignado a 1 evento")).toBeTruthy();

    // El aviso es de ese intento: no se queda al volver a entrar
    await fireEvent.press(screen.getByText("Volver a técnicos"));
    await fireEvent.press(screen.getByRole("button", { name: "Pablo" }));
    expect(screen.queryByText(/No se puede eliminar/)).toBeNull();
  });

  test("Eliminar es discreto: sin relleno, en color de error, y Editar es la acción principal", async () => {
    simular();
    await abrirPablo();

    const eliminar = StyleSheet.flatten(screen.getByText("Eliminar técnico").props.style);
    const editar = StyleSheet.flatten(screen.getByRole("button", { name: "Editar técnico" }).props.style);
    const contenedor = StyleSheet.flatten(screen.getByRole("button", { name: "Eliminar técnico" }).props.style);

    expect(eliminar.color).toBeDefined();
    expect(contenedor.backgroundColor).toBeUndefined();
    expect(editar.backgroundColor).toBeDefined();
  });

  test("un usuario normal consulta la lista, sin añadir ni abrir técnicos", async () => {
    simular({ esAdmin: false });
    await abrirTecnicos();

    expect(screen.getByText("Pablo")).toBeTruthy();
    expect(screen.queryByText("+ Añadir técnico")).toBeNull();
    expect(screen.queryByRole("button", { name: "Pablo" })).toBeNull();

    await fireEvent.press(screen.getByText("Pablo"));
    expect(screen.queryByText("Editar técnico")).toBeNull();
    expect(screen.queryByText("Eliminar técnico")).toBeNull();
  });

  test.each([
    [true, "Añade a las personas que ayudan a la banda en los conciertos."],
    [false, "Cuando se añadan técnicos a la banda, aparecerán aquí."],
  ])("estado vacío (admin: %s)", async (esAdmin, detalle) => {
    simular({ esAdmin, tecnicos: [] });
    await abrirTecnicos();

    expect(screen.getByText("Todavía no hay técnicos")).toBeTruthy();
    expect(screen.getByText(detalle)).toBeTruthy();
  });

  test("segunda barrera: aunque se llame a las acciones, sin ser admin no llegan a la base", async () => {
    simular({ esAdmin: false });
    let contexto: ReturnType<typeof useTecnicosContext> | null = null;

    function Espia() {
      contexto = useTecnicosContext();
      return null;
    }

    await render(
      <TecnicosProvider>
        <Espia />
      </TecnicosProvider>
    );

    function acciones(): ReturnType<typeof useTecnicosContext> {
      if (contexto === null) {
        throw new Error("Falta el contexto");
      }

      return contexto;
    }

    await act(async () => {
      acciones().setNombre("Intruso");
    });
    await act(async () => {
      await acciones().guardarTecnico();
    });
    await act(async () => {
      acciones().prepararEdicion(PABLO);
    });
    await act(async () => {
      await acciones().guardarTecnico();
    });
    await act(async () => {
      await acciones().eliminarTecnico("t1");
    });

    expect(mockCrearTecnico).not.toHaveBeenCalled();
    expect(mockActualizarTecnico).not.toHaveBeenCalled();
    expect(mockEliminarTecnico).not.toHaveBeenCalled();
  });
});

describe("Banda: Invitar usuario", () => {
  async function abrirInvitar() {
    await abrirBanda();
    await fireEvent.press(screen.getByRole("button", { name: "Invitar usuario" }));
  }

  test("el admin abre el flujo existente, con Usuario por defecto", async () => {
    simular();
    await abrirInvitar();

    expect(screen.getByRole("radio", { name: "Usuario", checked: true })).toBeTruthy();
    expect(screen.getByText("Generar invitación")).toBeTruthy();
  });

  test("genera para la banda actual y comparte el enlace HTTPS", async () => {
    process.env.EXPO_PUBLIC_INVITE_BASE_URL = "https://mibanda.expo.app";
    simular();
    mockCrearInvitacion.mockResolvedValue({ token: TOKEN, expiraEn: "2026-11-10T10:00:00+00:00", rol: "admin" });
    const compartir = jest
      .spyOn(Share, "share")
      .mockResolvedValue({ action: Share.sharedAction, activityType: undefined });

    try {
      await abrirInvitar();
      await fireEvent.press(screen.getByRole("radio", { name: "Administrador" }));
      await fireEvent.press(screen.getByText("Generar invitación"));

      expect(mockCrearInvitacion).toHaveBeenCalledWith("b1", "admin");

      await fireEvent.press(screen.getByText("Compartir invitación"));

      const { message } = compartir.mock.calls[0][0] as { message: string };
      expect(message).toContain("IndiesPensables");
      expect(message).toContain(`https://mibanda.expo.app/invitacion?token=${TOKEN}`);
    } finally {
      delete process.env.EXPO_PUBLIC_INVITE_BASE_URL;
    }
  });

  test("Cancelar y Cerrar vuelven al índice de Banda", async () => {
    simular();
    mockCrearInvitacion.mockResolvedValue({ token: TOKEN, expiraEn: "2026-11-10T10:00:00+00:00", rol: "usuario" });
    await abrirInvitar();

    await fireEvent.press(screen.getByText("Cancelar"));
    expect(screen.getByText("Equipo")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Invitar usuario" }));
    await fireEvent.press(screen.getByText("Generar invitación"));
    await fireEvent.press(screen.getByText("Cerrar"));
    expect(screen.getByText("Equipo")).toBeTruthy();
  });

  test("si deja de ser admin con la vista abierta, vuelve al índice sin el flujo", async () => {
    simular();
    const { rerender } = await render(pantalla());
    await screen.findByText("Equipo");
    await fireEvent.press(screen.getByRole("button", { name: "Invitar usuario" }));

    simular({ esAdmin: false });
    await rerender(pantalla());

    expect(screen.queryByText("Generar invitación")).toBeNull();
    expect(screen.getByText("Equipo")).toBeTruthy();
  });
});

describe("Banda: botón Atrás de Android", () => {
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

  test("en el índice limpio no se intercepta", async () => {
    simular();
    await abrirBanda();

    expect(manejadores).toHaveLength(0);
    expect(await pulsarAtras()).toBe(false);
  });

  test("Integrantes → Banda", async () => {
    simular();
    await abrirBanda();
    await fireEvent.press(screen.getByRole("button", { name: /^Integrantes/ }));

    expect(await pulsarAtras()).toBe(true);
    expect(screen.getByText("Equipo")).toBeTruthy();
    expect(manejadores).toHaveLength(0);
  });

  test("Técnicos → Banda", async () => {
    simular();
    await abrirTecnicos();

    expect(await pulsarAtras()).toBe(true);
    expect(screen.getByText("Equipo")).toBeTruthy();
    expect(manejadores).toHaveLength(0);
  });

  test("Invitar usuario → Banda", async () => {
    simular();
    await abrirBanda();
    await fireEvent.press(screen.getByRole("button", { name: "Invitar usuario" }));

    expect(await pulsarAtras()).toBe(true);
    expect(screen.getByText("Equipo")).toBeTruthy();
    expect(manejadores).toHaveLength(0);
  });

  test("Edición → detalle → lista → Banda, sin guardar nada", async () => {
    simular();
    await abrirPablo();
    await fireEvent.press(screen.getByText("Editar técnico"));
    await fireEvent.changeText(screen.getByLabelText("Nombre del técnico"), "Otro");

    expect(await pulsarAtras()).toBe(true);
    expect(screen.getByText("Eliminar técnico")).toBeTruthy();

    expect(await pulsarAtras()).toBe(true);
    expect(screen.getByText("+ Añadir técnico")).toBeTruthy();

    expect(await pulsarAtras()).toBe(true);
    expect(screen.getByText("Equipo")).toBeTruthy();
    expect(mockActualizarTecnico).not.toHaveBeenCalled();
  });

  test("Alta de técnico → lista", async () => {
    simular();
    await abrirTecnicos();
    await fireEvent.press(screen.getByText("+ Añadir técnico"));

    expect(await pulsarAtras()).toBe(true);
    expect(screen.queryByLabelText("Nombre del técnico")).toBeNull();
    expect(screen.getByText("+ Añadir técnico")).toBeTruthy();
  });

  test("mientras se guarda, Atrás no hace nada", async () => {
    simular();
    let terminar: (tecnico: Tecnico) => void = () => {};
    mockCrearTecnico.mockReturnValue(
      new Promise((resolver) => {
        terminar = resolver;
      })
    );
    await abrirTecnicos();
    await fireEvent.press(screen.getByText("+ Añadir técnico"));
    await fireEvent.changeText(screen.getByLabelText("Nombre del técnico"), "Lucía");
    await fireEvent.press(screen.getByText("Guardar técnico"));

    expect(await pulsarAtras()).toBe(true);
    expect(screen.getByLabelText("Nombre del técnico")).toBeTruthy();

    await act(async () => {
      terminar({ id: "t2", nombre: "Lucía" });
    });
    expect(await screen.findByText("Lucía")).toBeTruthy();
  });

  test("con la otra pestaña a la vista, una vista abierta no intercepta Atrás", async () => {
    simular();
    const { rerender } = await render(pantalla());
    await screen.findByText("Equipo");
    await fireEvent.press(screen.getByRole("button", { name: /^Técnicos/ }));
    expect(manejadores).toHaveLength(1);

    mockEnFoco = false;
    await rerender(pantalla());
    expect(manejadores).toHaveLength(0);

    // Al volver a la pestaña, sigue en Técnicos
    mockEnFoco = true;
    await rerender(pantalla());
    expect(screen.getByText("+ Añadir técnico")).toBeTruthy();
    expect(manejadores).toHaveLength(1);
  });
});
