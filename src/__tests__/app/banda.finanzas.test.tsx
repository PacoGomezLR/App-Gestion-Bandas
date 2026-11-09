import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Alert, type AlertButton, BackHandler, Platform } from "react-native";

import BandaScreen from "../../app/banda";
import { useBandaContext } from "../../context/BandaContext";
import { useEventosContext } from "../../context/EventosContext";
import { useIntegrantesContext } from "../../context/IntegrantesContext";
import { useTecnicosContext } from "../../context/TecnicosContext";
import type { Evento } from "../../types/evento";
import type { DatosMovimiento, MovimientoFinanciero } from "../../types/finanzas";

// FinanzasProvider y todas las pantallas son los reales: solo se simula el
// repositorio, para comprobar lo que llegaría a Supabase.

let mockEnFoco = true;

jest.mock("expo-router", () => ({ useIsFocused: () => mockEnFoco }));

jest.mock("../../global.css", () => ({}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));
jest.mock("expo-linking", () => ({ createURL: (ruta: string) => `mibanda://${ruta}` }));

// El calendario real no se puede pulsar día a día en Jest: un botón por día
jest.mock("react-native-calendars", () => {
  const { Button, Text } = jest.requireActual<typeof import("react-native")>("react-native");

  return {
    Calendar: ({
      current,
      onDayPress,
    }: {
      current: string;
      onDayPress: (dia: { dateString: string }) => void;
    }) => (
      <>
        <Text>Calendario en {current}</Text>
        <Button title="Día 2026-10-31" onPress={() => onDayPress({ dateString: "2026-10-31" })} />
      </>
    ),
    LocaleConfig: { locales: {}, defaultLocale: "" },
  };
});

jest.mock("../../components/BotonCerrarSesion", () => {
  const { Text } = jest.requireActual<typeof import("react-native")>("react-native");

  return { BotonCerrarSesion: () => <Text>Cerrar sesión</Text> };
});

jest.mock("../../context/BandaContext", () => ({ useBandaContext: jest.fn() }));
jest.mock("../../context/EventosContext", () => ({ useEventosContext: jest.fn() }));
jest.mock("../../context/IntegrantesContext", () => ({ useIntegrantesContext: jest.fn() }));
jest.mock("../../context/TecnicosContext", () => ({ useTecnicosContext: jest.fn() }));

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
const mockUseEventosContext = jest.mocked(useEventosContext);
const mockUseIntegrantesContext = jest.mocked(useIntegrantesContext);
const mockUseTecnicosContext = jest.mocked(useTecnicosContext);

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

const ENSAYO: Evento = { ...BODA, id: "e2", tipo: "ensayo", lugar: "", fecha: "2026-11-21" };

const CONCIERTO: MovimientoFinanciero = {
  id: "m1",
  tipo: "ingreso",
  importeCentimos: 80000,
  concepto: "Concierto Córdoba",
  categoria: "concierto",
  fecha: "2026-11-14",
  eventoId: "e1",
  notas: "Pagado en efectivo",
  creadoEn: "2026-11-15T10:00:00+00:00",
};

const GASOLINA: MovimientoFinanciero = {
  id: "m2",
  tipo: "gasto",
  importeCentimos: 3550,
  concepto: "Gasolina",
  categoria: "transporte",
  fecha: "2026-10-20",
  eventoId: null,
  notas: null,
  creadoEn: "2026-10-20T10:00:00+00:00",
};

interface Opciones {
  esAdmin?: boolean;
  movimientos?: MovimientoFinanciero[];
  errorEventos?: string;
}

function simular({ esAdmin = true, movimientos = [CONCIERTO, GASOLINA], errorEventos = "" }: Opciones = {}) {
  mockUseBandaContext.mockReturnValue({
    bandaActual: { id: "b1", nombre: "IndiesPensables" },
    esAdmin,
  } as unknown as ReturnType<typeof useBandaContext>);

  mockUseEventosContext.mockReturnValue({
    cargando: false,
    eventos: [BODA, ENSAYO],
    errorPersistencia: errorEventos,
  } as unknown as ReturnType<typeof useEventosContext>);

  mockUseIntegrantesContext.mockReturnValue({
    integrantes: [],
    cargando: false,
    errorPersistencia: "",
  } as unknown as ReturnType<typeof useIntegrantesContext>);

  mockUseTecnicosContext.mockReturnValue({
    tecnicos: [],
    cargando: false,
    errorPersistencia: "",
  } as unknown as ReturnType<typeof useTecnicosContext>);

  mockListar.mockResolvedValue(movimientos);
  mockCrear.mockImplementation(async (datos) => ({
    ...datos,
    id: "nuevo",
    creadoEn: "2026-11-20T10:00:00+00:00",
  }));
  mockActualizar.mockImplementation(async (id, datos) => ({
    ...datos,
    id,
    creadoEn: "2026-11-15T10:00:00+00:00",
  }));
  mockEliminar.mockResolvedValue();
}

async function abrirFinanzas() {
  const resultado = await render(<BandaScreen />);

  await fireEvent.press(screen.getByRole("button", { name: "Finanzas" }));
  await screen.findByText(/Bote actual|No se han podido/);

  return resultado;
}

async function abrirMovimientos() {
  const resultado = await abrirFinanzas();

  await fireEvent.press(screen.getByRole("button", { name: "Movimientos" }));

  return resultado;
}

async function abrirAlta() {
  await abrirFinanzas();
  await fireEvent.press(screen.getByText("+ Añadir movimiento"));
}

async function abrirDetalle() {
  const resultado = await abrirMovimientos();

  await fireEvent.press(screen.getByRole("button", { name: /^Concierto Córdoba/ }));

  return resultado;
}

async function elegir(opcion: string) {
  await fireEvent.press(screen.getByRole("radio", { name: opcion }));
}

async function rellenarGasto() {
  await elegir("Gasto");
  await fireEvent.changeText(screen.getByLabelText("Importe"), "12,50");
  await fireEvent.changeText(screen.getByLabelText("Concepto"), "  Peaje  ");
  await elegir("Transporte");
}

function botonDeAlerta(espia: jest.SpyInstance, texto: string): AlertButton {
  const botones = espia.mock.calls[0][2] as AlertButton[];
  const boton = botones.find((actual) => actual.text === texto);

  if (boton === undefined) {
    throw new Error(`Falta el botón ${texto}`);
  }

  return boton;
}

// Solo Date: las promesas y los temporizadores de la prueba siguen funcionando
function fijarReloj(ahora: Date) {
  jest.useFakeTimers({
    now: ahora,
    doNotFake: [
      "hrtime",
      "nextTick",
      "performance",
      "queueMicrotask",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "requestIdleCallback",
      "cancelIdleCallback",
      "setImmediate",
      "clearImmediate",
      "setInterval",
      "clearInterval",
      "setTimeout",
      "clearTimeout",
    ],
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockEnFoco = true;
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("Finanzas: permisos", () => {
  test("un admin la ve en Administración", async () => {
    simular();
    await render(<BandaScreen />);

    expect(screen.getByText("Administración")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Invitar usuario" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Finanzas" })).toBeTruthy();
  });

  test("un usuario normal no ve ni rastro y no se pide ningún dato", async () => {
    simular({ esAdmin: false });
    await render(<BandaScreen />);

    expect(screen.queryByText("Finanzas")).toBeNull();
    expect(screen.queryByText("Administración")).toBeNull();
    expect(screen.queryByText(/€/)).toBeNull();
    expect(mockRepositorioPedido).not.toHaveBeenCalled();
    expect(mockListar).not.toHaveBeenCalled();
  });

  test("abrir Banda no consulta las finanzas ni siquiera a un admin", async () => {
    simular();
    await render(<BandaScreen />);

    expect(mockListar).not.toHaveBeenCalled();
  });

  test("si pierde el rol con Finanzas abierta vuelve a Banda sin ningún importe", async () => {
    simular();
    const { rerender } = await abrirFinanzas();

    expect(screen.getByText("Bote actual")).toBeTruthy();

    simular({ esAdmin: false });
    await rerender(<BandaScreen />);

    expect(screen.getByText("Equipo")).toBeTruthy();
    expect(screen.queryByText("Bote actual")).toBeNull();
    expect(screen.queryByText(/€/)).toBeNull();
  });
});

describe("Finanzas: pantalla principal", () => {
  test("el bote y los totales salen de los movimientos", async () => {
    simular();
    await abrirFinanzas();

    expect(screen.getByText("764,50 €")).toBeTruthy();
    expect(screen.getByLabelText(/^Ingresos totales: 800,00/)).toBeTruthy();
    expect(screen.getByLabelText(/^Gastos totales: 35,50/)).toBeTruthy();
    expect(screen.getByText("+800,00 €")).toBeTruthy();
    expect(screen.getByText("-35,50 €")).toBeTruthy();
    expect(mockListar).toHaveBeenCalledTimes(1);
  });

  test("Bote negativo: se muestra y no se bloquea", async () => {
    simular({ movimientos: [GASOLINA] });
    await abrirFinanzas();

    expect(screen.getAllByText("-35,50 €").length).toBeGreaterThan(0);
    expect(screen.getByText("+ Añadir movimiento")).toBeTruthy();
  });

  test("solo enseña los cinco últimos", async () => {
    simular({
      movimientos: Array.from({ length: 7 }, (_, indice) => ({
        ...GASOLINA,
        id: `m${indice}`,
        concepto: `Gasto ${indice}`,
        fecha: `2026-10-1${indice}`,
      })),
    });
    await abrirFinanzas();

    expect(screen.getByText("Gasto 6")).toBeTruthy();
    expect(screen.getByText("Gasto 2")).toBeTruthy();
    expect(screen.queryByText("Gasto 1")).toBeNull();
  });

  test("sin movimientos: 0,00 € y una invitación a empezar", async () => {
    simular({ movimientos: [] });
    await abrirFinanzas();

    expect(screen.getAllByText("0,00 €").length).toBeGreaterThan(0);
    expect(screen.getByText("Todavía no hay movimientos")).toBeTruthy();
    expect(
      screen.getByText(
        "Añade el primer ingreso o gasto para empezar a llevar las cuentas de la banda."
      )
    ).toBeTruthy();
  });

  test("un fallo de carga nunca parece un saldo real", async () => {
    simular();
    mockListar.mockRejectedValue(new Error("fallo"));
    await abrirFinanzas();

    expect(screen.getByText("No se han podido cargar los movimientos")).toBeTruthy();
    expect(screen.queryByText(/€/)).toBeNull();
    expect(screen.queryByText("Bote actual")).toBeNull();
    expect(screen.queryByText("+ Añadir movimiento")).toBeNull();
  });

  test("Reintentar vuelve a cargar", async () => {
    simular();
    mockListar.mockRejectedValueOnce(new Error("fallo"));
    await abrirFinanzas();

    await fireEvent.press(screen.getByText("Reintentar"));

    expect(await screen.findByText("764,50 €")).toBeTruthy();
  });
});

describe("Finanzas: nuevo movimiento", () => {
  test("no hay ningún tipo elegido al abrir", async () => {
    simular();
    await abrirAlta();

    expect(screen.getByRole("radio", { name: "Ingreso" }).props.accessibilityState.checked).toBe(false);
    expect(screen.getByRole("radio", { name: "Gasto" }).props.accessibilityState.checked).toBe(false);
    expect(screen.getByText(/Elige primero si es un ingreso o un gasto/)).toBeTruthy();
  });

  test("guardar sin tipo se rechaza con un mensaje", async () => {
    simular();
    await abrirAlta();

    await fireEvent.changeText(screen.getByLabelText("Importe"), "12");
    await fireEvent.press(screen.getByText("Guardar movimiento"));

    expect(screen.getByText("Elige si es un ingreso o un gasto")).toBeTruthy();
    expect(mockCrear).not.toHaveBeenCalled();
  });

  test("crea un gasto con céntimos, fecha de hoy y sin evento", async () => {
    fijarReloj(new Date(2026, 10, 5, 12, 0));
    simular();
    await abrirAlta();
    await rellenarGasto();

    await fireEvent.press(screen.getByText("Guardar movimiento"));

    expect(mockCrear).toHaveBeenCalledWith({
      tipo: "gasto",
      importeCentimos: 1250,
      concepto: "Peaje",
      categoria: "transporte",
      fecha: "2026-11-05",
      eventoId: null,
      notas: null,
    });
    // Vuelve a Finanzas con el bote recalculado
    expect(await screen.findByText("752,00 €")).toBeTruthy();
  });

  test("crea un ingreso con evento y notas, y suma al bote", async () => {
    simular();
    await abrirAlta();

    await elegir("Ingreso");
    await fireEvent.changeText(screen.getByLabelText("Importe"), "100");
    await fireEvent.changeText(screen.getByLabelText("Concepto"), "Merchandising en la boda");
    await elegir("Merchandising");
    await fireEvent.press(screen.getByRole("button", { name: "Evento relacionado: Ninguno" }));
    await elegir("14/11/2026 · Boda Córdoba");
    await fireEvent.changeText(screen.getByLabelText("Notas"), " Camisetas ");
    await fireEvent.press(screen.getByText("Guardar movimiento"));

    expect(mockCrear).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: "ingreso",
        importeCentimos: 10000,
        categoria: "merchandising",
        eventoId: "e1",
        notas: "Camisetas",
      })
    );
    expect(await screen.findByText("864,50 €")).toBeTruthy();
  });

  test("las categorías dependen del tipo", async () => {
    simular();
    await abrirAlta();

    await elegir("Ingreso");
    expect(screen.getByRole("radio", { name: "Saldo inicial" })).toBeTruthy();
    expect(screen.queryByRole("radio", { name: "Transporte" })).toBeNull();

    await elegir("Gasto");
    expect(screen.getByRole("radio", { name: "Local / ensayo" })).toBeTruthy();
    expect(screen.queryByRole("radio", { name: "Saldo inicial" })).toBeNull();
  });

  test("cada categoría nueva aparece solo en su tipo y se guarda con su identificador", async () => {
    simular();
    await abrirAlta();

    await elegir("Gasto");
    expect(screen.queryByRole("radio", { name: "Sobrante concierto" })).toBeNull();

    await elegir("Ingreso");
    expect(screen.queryByRole("radio", { name: "Alquiler furgoneta" })).toBeNull();

    await fireEvent.changeText(screen.getByLabelText("Importe"), "50");
    await fireEvent.changeText(screen.getByLabelText("Concepto"), "Sobró del bolo");
    await elegir("Sobrante concierto");
    await fireEvent.press(screen.getByText("Guardar movimiento"));

    expect(mockCrear).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "ingreso", categoria: "sobrante_concierto", importeCentimos: 5000 })
    );
  });

  test("Alquiler furgoneta se guarda como gasto", async () => {
    simular();
    await abrirAlta();

    await elegir("Gasto");
    await fireEvent.changeText(screen.getByLabelText("Importe"), "120");
    await fireEvent.changeText(screen.getByLabelText("Concepto"), "Furgoneta del sábado");
    await elegir("Alquiler furgoneta");
    await fireEvent.press(screen.getByText("Guardar movimiento"));

    expect(mockCrear).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "gasto", categoria: "alquiler_furgoneta", importeCentimos: 12000 })
    );
  });

  test("el bote inicial es un ingreso normal de categoría Saldo inicial", async () => {
    simular({ movimientos: [] });
    await abrirAlta();

    await elegir("Ingreso");
    await fireEvent.changeText(screen.getByLabelText("Importe"), "800");
    await fireEvent.changeText(screen.getByLabelText("Concepto"), "Saldo inicial");
    await elegir("Saldo inicial");
    await fireEvent.press(screen.getByText("Guardar movimiento"));

    expect(mockCrear).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "ingreso", categoria: "saldo_inicial", importeCentimos: 80000 })
    );
  });

  test("Cancelar no crea nada", async () => {
    simular();
    await abrirAlta();
    await rellenarGasto();

    await fireEvent.press(screen.getByText("Cancelar"));

    expect(mockCrear).not.toHaveBeenCalled();
    expect(screen.getByText("Bote actual")).toBeTruthy();
  });

  test("al reabrir tras cancelar el formulario está limpio", async () => {
    simular();
    await abrirAlta();
    await rellenarGasto();

    await fireEvent.press(screen.getByText("Cancelar"));
    await fireEvent.press(screen.getByText("+ Añadir movimiento"));

    expect(screen.getByLabelText("Importe").props.value).toBe("");
  });

  test("no permite dos envíos y avisa de que está guardando", async () => {
    let terminar: (creado: MovimientoFinanciero) => void = () => {};
    simular();
    mockCrear.mockReturnValue(
      new Promise((resolver) => {
        terminar = resolver;
      })
    );
    await abrirAlta();
    await rellenarGasto();

    await fireEvent.press(screen.getByText("Guardar movimiento"));

    const boton = screen.getByRole("button", { name: "Guardando..." });

    expect(boton.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(boton);
    expect(mockCrear).toHaveBeenCalledTimes(1);

    await act(async () => {
      terminar({ ...GASOLINA, id: "nuevo" });
    });
  });

  test("si falla, sigue abierto con lo escrito y con el error", async () => {
    simular();
    mockCrear.mockRejectedValue(new Error("fallo"));
    await abrirAlta();
    await rellenarGasto();

    await fireEvent.press(screen.getByText("Guardar movimiento"));

    expect(await screen.findByText("No se ha podido guardar el movimiento")).toBeTruthy();
    expect(screen.getByLabelText("Importe").props.value).toBe("12,50");
    expect(screen.getByLabelText("Concepto").props.value).toBe("  Peaje  ");
    expect(screen.getByRole("radio", { name: "Transporte" }).props.accessibilityState.checked).toBe(true);
  });

  test("el error del servidor no sobrevive a cerrar el formulario", async () => {
    simular();
    mockCrear.mockRejectedValue(new Error("fallo"));
    await abrirAlta();
    await rellenarGasto();
    await fireEvent.press(screen.getByText("Guardar movimiento"));
    await screen.findByText("No se ha podido guardar el movimiento");

    await fireEvent.press(screen.getByText("Cancelar"));
    await fireEvent.press(screen.getByText("+ Añadir movimiento"));

    expect(screen.queryByText("No se ha podido guardar el movimiento")).toBeNull();
  });
});

describe("Finanzas: fechas", () => {
  test("un movimiento nuevo trae hoy, en formato de la app", async () => {
    fijarReloj(new Date(2026, 10, 5, 12, 0));
    simular();
    await abrirAlta();

    expect(screen.getByRole("button", { name: "Fecha: 05/11/2026" })).toBeTruthy();
  });

  test("usa el día local justo después de medianoche", async () => {
    fijarReloj(new Date(2026, 10, 6, 0, 30));
    simular();
    await abrirAlta();

    expect(screen.getByRole("button", { name: "Fecha: 06/11/2026" })).toBeTruthy();
  });

  test("se puede cambiar a otro día", async () => {
    fijarReloj(new Date(2026, 10, 5, 12, 0));
    simular();
    await abrirAlta();
    await rellenarGasto();

    await fireEvent.press(screen.getByRole("button", { name: "Fecha: 05/11/2026" }));
    await fireEvent.press(screen.getByText("Día 2026-10-31"));

    expect(screen.getByRole("button", { name: "Fecha: 31/10/2026" })).toBeTruthy();

    await fireEvent.press(screen.getByText("Guardar movimiento"));

    expect(mockCrear).toHaveBeenCalledWith(expect.objectContaining({ fecha: "2026-10-31" }));
  });

  test("editar conserva la fecha y abre el calendario en ella", async () => {
    fijarReloj(new Date(2026, 11, 25, 12, 0));
    simular();
    await abrirDetalle();
    await fireEvent.press(screen.getByText("Editar movimiento"));

    await fireEvent.press(screen.getByRole("button", { name: "Fecha: 14/11/2026" }));
    expect(screen.getByText("Calendario en 2026-11-14")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Fecha: 14/11/2026" }));
    await fireEvent.press(screen.getByText("Guardar cambios"));

    expect(mockActualizar).toHaveBeenCalledWith(
      "m1",
      expect.objectContaining({ fecha: "2026-11-14" })
    );
  });
});

describe("Finanzas: evento relacionado", () => {
  test("ofrece los eventos de la banda ya cargados, sin repetir la fecha ni consultar nada", async () => {
    simular();
    await abrirAlta();

    await fireEvent.press(screen.getByRole("button", { name: "Evento relacionado: Ninguno" }));

    expect(screen.getByRole("radio", { name: "Ninguno" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "14/11/2026 · Boda Córdoba" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "21/11/2026 · Ensayo" })).toBeTruthy();
    expect(screen.getAllByRole("radio", { name: /·/ })).toHaveLength(2);
  });

  test("se puede quitar el evento de un movimiento", async () => {
    simular();
    await abrirDetalle();
    await fireEvent.press(screen.getByText("Editar movimiento"));

    await fireEvent.press(
      screen.getByRole("button", { name: "Evento relacionado: 14/11/2026 · Boda Córdoba" })
    );
    await elegir("Ninguno");
    await fireEvent.press(screen.getByText("Guardar cambios"));

    expect(mockActualizar).toHaveBeenCalledWith("m1", expect.objectContaining({ eventoId: null }));
  });

  test("si los eventos no cargan, avisa y deja guardar sin evento", async () => {
    simular({ errorEventos: "No se han podido cargar los eventos" });
    await abrirAlta();

    expect(screen.getByText("No se han podido cargar los eventos")).toBeTruthy();

    await rellenarGasto();
    await fireEvent.press(screen.getByText("Guardar movimiento"));

    expect(mockCrear).toHaveBeenCalledTimes(1);
  });

  test("la base rechaza un evento que ya no existe y se explica", async () => {
    const { ErrorRepositorio } = jest.requireActual<
      typeof import("../../services/supabase/errores")
    >("../../services/supabase/errores");

    simular();
    mockCrear.mockRejectedValue(new ErrorRepositorio("en_uso"));
    await abrirAlta();
    await rellenarGasto();
    await fireEvent.press(screen.getByText("Guardar movimiento"));

    expect(await screen.findByText("El evento relacionado ya no existe")).toBeTruthy();
  });
});

describe("Finanzas: historial y detalle", () => {
  test("agrupa por mes y en orden descendente", async () => {
    simular();
    await abrirMovimientos();

    const textos = screen
      .getAllByText(/Noviembre 2026|Octubre 2026|Concierto Córdoba|Gasolina/)
      .map((nodo) => nodo.props.children);

    expect(textos).toEqual(["Noviembre 2026", "Concierto Córdoba", "Octubre 2026", "Gasolina"]);
  });

  test("cada fila es un botón con concepto, tipo, importe y fecha", async () => {
    simular();
    await abrirMovimientos();

    expect(
      screen.getByRole("button", { name: /^Gasolina, gasto de 35,50.€, 20\/10\/2026$/ })
    ).toBeTruthy();
  });

  test("no hay Editar ni Eliminar en la lista", async () => {
    simular();
    await abrirMovimientos();

    expect(screen.queryByText(/Editar/)).toBeNull();
    expect(screen.queryByText(/Eliminar/)).toBeNull();
  });

  test("el detalle enseña todos los datos con el evento y la fecha económica", async () => {
    simular();
    await abrirDetalle();

    expect(screen.getByText("Concierto Córdoba")).toBeTruthy();
    expect(screen.getByText("+800,00 €")).toBeTruthy();
    expect(screen.getByLabelText("Tipo: Ingreso")).toBeTruthy();
    expect(screen.getByLabelText("Categoría: Concierto")).toBeTruthy();
    expect(screen.getByLabelText("Fecha: 14/11/2026")).toBeTruthy();
    expect(screen.getByLabelText("Evento: 14/11/2026 · Boda Córdoba")).toBeTruthy();
    expect(screen.getByLabelText("Notas: Pagado en efectivo")).toBeTruthy();
    // creadoEn es del día 15: no debe aparecer como fecha
    expect(screen.queryByText("15/11/2026")).toBeNull();
    expect(screen.getByRole("button", { name: "Editar movimiento" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Eliminar movimiento" })).toBeTruthy();
  });

  test("sin evento ni notas esas líneas no aparecen", async () => {
    simular();
    await abrirMovimientos();
    await fireEvent.press(screen.getByRole("button", { name: /^Gasolina/ }));

    expect(screen.queryByLabelText(/^Evento:/)).toBeNull();
    expect(screen.queryByLabelText(/^Notas:/)).toBeNull();
  });

  test("un evento que ya no está cargado no rompe el detalle", async () => {
    simular({ movimientos: [{ ...CONCIERTO, eventoId: "borrado" }] });
    await abrirDetalle();

    expect(screen.getByLabelText("Evento: Evento no disponible")).toBeTruthy();
  });

  test("desde los últimos movimientos vuelve a Finanzas", async () => {
    simular();
    await abrirFinanzas();
    await fireEvent.press(screen.getByRole("button", { name: /^Gasolina/ }));

    await fireEvent.press(screen.getByText("Volver a Finanzas"));

    expect(screen.getByText("Bote actual")).toBeTruthy();
  });
});

describe("Finanzas: edición", () => {
  test("carga los datos, permite corregirlos y vuelve al detalle", async () => {
    simular();
    await abrirDetalle();
    await fireEvent.press(screen.getByText("Editar movimiento"));

    expect(screen.getByText("Editar movimiento")).toBeTruthy();
    expect(screen.getByLabelText("Importe").props.value).toBe("800,00");
    expect(screen.getByLabelText("Concepto").props.value).toBe("Concierto Córdoba");
    expect(screen.getByRole("radio", { name: "Ingreso" }).props.accessibilityState.checked).toBe(true);

    await fireEvent.changeText(screen.getByLabelText("Importe"), "900");
    await fireEvent.changeText(screen.getByLabelText("Concepto"), "Concierto Montilla");
    await fireEvent.press(screen.getByText("Guardar cambios"));

    expect(mockActualizar).toHaveBeenCalledWith("m1", {
      tipo: "ingreso",
      importeCentimos: 90000,
      concepto: "Concierto Montilla",
      categoria: "concierto",
      fecha: "2026-11-14",
      eventoId: "e1",
      notas: "Pagado en efectivo",
    });
    expect(await screen.findByText("+900,00 €")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Editar movimiento" })).toBeTruthy();
  });

  test("puede cambiar de ingreso a gasto, y exige una categoría válida", async () => {
    simular();
    await abrirDetalle();
    await fireEvent.press(screen.getByText("Editar movimiento"));

    await elegir("Gasto");
    await fireEvent.press(screen.getByText("Guardar cambios"));

    expect(screen.getByText("Elige una categoría")).toBeTruthy();
    expect(mockActualizar).not.toHaveBeenCalled();

    await elegir("Material");
    await fireEvent.press(screen.getByText("Guardar cambios"));

    expect(mockActualizar).toHaveBeenCalledWith(
      "m1",
      expect.objectContaining({ tipo: "gasto", categoria: "material" })
    );
  });

  test("Cancelar no guarda y vuelve al detalle", async () => {
    simular();
    await abrirDetalle();
    await fireEvent.press(screen.getByText("Editar movimiento"));
    await fireEvent.changeText(screen.getByLabelText("Importe"), "1");

    await fireEvent.press(screen.getByText("Cancelar"));

    expect(mockActualizar).not.toHaveBeenCalled();
    expect(screen.getByText("+800,00 €")).toBeTruthy();
  });

  test("si falla, conserva lo escrito con su propio mensaje", async () => {
    simular();
    mockActualizar.mockRejectedValue(new Error("fallo"));
    await abrirDetalle();
    await fireEvent.press(screen.getByText("Editar movimiento"));
    await fireEvent.changeText(screen.getByLabelText("Importe"), "900");

    await fireEvent.press(screen.getByText("Guardar cambios"));

    expect(await screen.findByText("No se han podido guardar los cambios")).toBeTruthy();
    expect(screen.getByLabelText("Importe").props.value).toBe("900");
  });
});

describe("Finanzas: eliminación", () => {
  test("pide confirmación con el texto acordado y Eliminar es destructivo", async () => {
    const alerta = jest.spyOn(Alert, "alert");
    simular();
    await abrirDetalle();

    await fireEvent.press(screen.getByText("Eliminar movimiento"));

    expect(alerta.mock.calls[0][0]).toBe("¿Eliminar movimiento?");
    expect(alerta.mock.calls[0][1]).toBe("Esta acción modificará el bote y los informes.");
    expect(botonDeAlerta(alerta, "Cancelar").style).toBe("cancel");
    expect(botonDeAlerta(alerta, "Eliminar").style).toBe("destructive");
    expect(mockEliminar).not.toHaveBeenCalled();
  });

  test("Cancelar en la confirmación no elimina", async () => {
    const alerta = jest.spyOn(Alert, "alert");
    simular();
    await abrirDetalle();

    await fireEvent.press(screen.getByText("Eliminar movimiento"));

    expect(botonDeAlerta(alerta, "Cancelar").onPress).toBeUndefined();
    expect(mockEliminar).not.toHaveBeenCalled();
    expect(screen.getByText("+800,00 €")).toBeTruthy();
  });

  test("Eliminar borra, vuelve a la lista y cambia el bote", async () => {
    const alerta = jest.spyOn(Alert, "alert");
    simular();
    await abrirDetalle();
    await fireEvent.press(screen.getByText("Eliminar movimiento"));

    await act(async () => {
      botonDeAlerta(alerta, "Eliminar").onPress?.();
    });

    expect(mockEliminar).toHaveBeenCalledWith("m1");
    await waitFor(() => expect(screen.queryByText("Concierto Córdoba")).toBeNull());
    expect(screen.getByText("Gasolina")).toBeTruthy();

    await fireEvent.press(screen.getByText("Volver a Finanzas"));

    expect(screen.getAllByText("-35,50 €").length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/^Ingresos totales: 0,00/)).toBeTruthy();
  });

  test("si falla, sigue en el detalle con el error", async () => {
    const alerta = jest.spyOn(Alert, "alert");
    simular();
    mockEliminar.mockRejectedValue(new Error("fallo"));
    await abrirDetalle();
    await fireEvent.press(screen.getByText("Eliminar movimiento"));

    await act(async () => {
      botonDeAlerta(alerta, "Eliminar").onPress?.();
    });

    expect(await screen.findByText("No se ha podido eliminar el movimiento")).toBeTruthy();
    expect(screen.getByText("+800,00 €")).toBeTruthy();
  });
});

describe("Finanzas: informes", () => {
  async function abrirInformes() {
    fijarReloj(new Date(2026, 10, 25, 12, 0));
    await abrirFinanzas();
    await fireEvent.press(screen.getByRole("button", { name: "Informes" }));
  }

  async function generar(periodo: string, tipo: string) {
    await elegir(periodo);
    await elegir(tipo);
    await fireEvent.press(screen.getByText("Generar informe"));
  }

  test("no enseña nada hasta generar", async () => {
    simular();
    await abrirInformes();

    expect(screen.getByRole("radio", { name: "Este mes" }).props.accessibilityState.checked).toBe(true);
    expect(screen.queryByText(/Saldo al cierre/)).toBeNull();
  });

  test("ofrece los cuatro periodos y los cuatro informes", async () => {
    simular();
    await abrirInformes();

    for (const opcion of [
      "Este mes",
      "Mes anterior",
      "Este año",
      "Todo",
      "Resumen financiero",
      "Por eventos",
      "Por categorías",
      "Evolución del bote",
    ]) {
      expect(screen.getByRole("radio", { name: opcion })).toBeTruthy();
    }
  });

  test("resumen financiero del mes", async () => {
    simular();
    await abrirInformes();
    await generar("Este mes", "Resumen financiero");

    expect(screen.getByText("Noviembre 2026")).toBeTruthy();
    expect(screen.getByLabelText(/^Saldo inicial: -35,50/)).toBeTruthy();
    expect(screen.getByLabelText(/^Ingresos: 800,00/)).toBeTruthy();
    expect(screen.getByLabelText(/^Gastos: 0,00/)).toBeTruthy();
    expect(screen.getByLabelText(/^Resultado del periodo: 800,00/)).toBeTruthy();
    expect(screen.getByLabelText(/^Saldo al cierre: 764,50/)).toBeTruthy();
  });

  test("por eventos: los movimientos sin evento se ven aparte", async () => {
    simular();
    await abrirInformes();
    await generar("Todo", "Por eventos");

    expect(screen.getByText("Rentabilidad por eventos")).toBeTruthy();
    expect(screen.getByText("14/11/2026 · Boda Córdoba")).toBeTruthy();
    expect(screen.getByText("Sin evento asociado")).toBeTruthy();
    expect(screen.getByLabelText(/^Resultado: 800,00/)).toBeTruthy();
    expect(screen.getByLabelText(/^Resultado: -35,50/)).toBeTruthy();
  });

  test("por categorías: ingresos y gastos separados", async () => {
    simular();
    await abrirInformes();
    await generar("Todo", "Por categorías");

    expect(screen.getByText("Ingresos por categoría")).toBeTruthy();
    expect(screen.getByText("Gastos por categoría")).toBeTruthy();
    expect(screen.getByLabelText(/^Concierto: 800,00/)).toBeTruthy();
    expect(screen.getByLabelText(/^Transporte: 35,50/)).toBeTruthy();
  });

  test("evolución del bote: saldo al cierre de cada mes", async () => {
    simular();
    await abrirInformes();
    await generar("Todo", "Evolución del bote");

    expect(screen.getByLabelText(/^Octubre 2026: -35,50/)).toBeTruthy();
    expect(screen.getByLabelText(/^Noviembre 2026: 764,50/)).toBeTruthy();
  });

  test("resumen sin movimientos en el periodo: el saldo anterior sigue a la vista", async () => {
    simular({ movimientos: [{ ...GASOLINA, tipo: "ingreso", categoria: "saldo_inicial", importeCentimos: 120000 }] });
    await abrirInformes();
    await generar("Este mes", "Resumen financiero");

    expect(screen.getByText("Noviembre 2026")).toBeTruthy();
    expect(screen.getByLabelText(/^Saldo inicial: 1\.200,00/)).toBeTruthy();
    expect(screen.getByLabelText(/^Ingresos: 0,00/)).toBeTruthy();
    expect(screen.getByLabelText(/^Gastos: 0,00/)).toBeTruthy();
    expect(screen.getByLabelText(/^Resultado del periodo: 0,00/)).toBeTruthy();
    expect(screen.getByLabelText(/^Saldo al cierre: 1\.200,00/)).toBeTruthy();
    expect(screen.getByText("No hubo movimientos durante este periodo.")).toBeTruthy();
    expect(screen.queryByText("No hay movimientos en este periodo.")).toBeNull();
  });

  test("resumen de una banda sin ningún movimiento: ceros y el aviso", async () => {
    simular({ movimientos: [] });
    await abrirInformes();
    await generar("Todo", "Resumen financiero");

    expect(screen.getByLabelText(/^Saldo inicial: 0,00/)).toBeTruthy();
    expect(screen.getByLabelText(/^Saldo al cierre: 0,00/)).toBeTruthy();
    expect(screen.getByText("No hay movimientos en este periodo.")).toBeTruthy();
    expect(screen.queryByText("No hubo movimientos durante este periodo.")).toBeNull();
  });

  test("resumen con movimientos: sin ningún aviso", async () => {
    simular();
    await abrirInformes();
    await generar("Este mes", "Resumen financiero");

    expect(screen.queryByText(/movimientos (en|durante) este periodo/)).toBeNull();
  });

  test("los otros informes sin movimientos siguen con un mensaje, sin ceros ni gráficos", async () => {
    simular({ movimientos: [GASOLINA] });
    await abrirInformes();

    for (const tipo of ["Por eventos", "Por categorías", "Evolución del bote"]) {
      await generar("Este mes", tipo);

      expect(screen.getByText("No hay movimientos en este periodo.")).toBeTruthy();
      expect(screen.queryByText(/€/)).toBeNull();
    }
  });

  test("sin ningún movimiento tampoco falla", async () => {
    simular({ movimientos: [] });
    await abrirInformes();
    await generar("Todo", "Evolución del bote");

    expect(screen.getByText("No hay movimientos en este periodo.")).toBeTruthy();
  });

  test("generar no hace llamadas de red", async () => {
    simular();
    await abrirInformes();
    await generar("Todo", "Resumen financiero");
    await generar("Este año", "Por categorías");

    expect(mockListar).toHaveBeenCalledTimes(1);
  });
});

describe("Finanzas: botón Atrás de Android", () => {
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

  test("Finanzas → Banda", async () => {
    simular();
    await abrirFinanzas();

    expect(await pulsarAtras()).toBe(true);
    expect(screen.getByText("Equipo")).toBeTruthy();
    expect(manejadores).toHaveLength(0);
  });

  test("Edición → detalle → movimientos → Finanzas → Banda", async () => {
    simular();
    await abrirDetalle();
    await fireEvent.press(screen.getByText("Editar movimiento"));

    expect(await pulsarAtras()).toBe(true);
    expect(screen.getByRole("button", { name: "Editar movimiento" })).toBeTruthy();

    expect(await pulsarAtras()).toBe(true);
    expect(screen.getByText("Volver a Finanzas")).toBeTruthy();
    expect(screen.getByText("Octubre 2026")).toBeTruthy();

    expect(await pulsarAtras()).toBe(true);
    expect(screen.getByText("Bote actual")).toBeTruthy();

    expect(await pulsarAtras()).toBe(true);
    expect(screen.getByText("Equipo")).toBeTruthy();
  });

  test("Nuevo movimiento → Finanzas", async () => {
    simular();
    await abrirAlta();

    expect(await pulsarAtras()).toBe(true);
    expect(screen.getByText("Bote actual")).toBeTruthy();
    expect(mockCrear).not.toHaveBeenCalled();
  });

  test("Informes → Finanzas", async () => {
    simular();
    await abrirFinanzas();
    await fireEvent.press(screen.getByRole("button", { name: "Informes" }));

    expect(await pulsarAtras()).toBe(true);
    expect(screen.getByText("Bote actual")).toBeTruthy();
  });

  test("mientras guarda no se va del formulario", async () => {
    let terminar: (creado: MovimientoFinanciero) => void = () => {};
    simular();
    mockCrear.mockReturnValue(
      new Promise((resolver) => {
        terminar = resolver;
      })
    );
    await abrirAlta();
    await rellenarGasto();
    await fireEvent.press(screen.getByText("Guardar movimiento"));

    expect(await pulsarAtras()).toBe(true);
    expect(screen.getByText("Nuevo movimiento")).toBeTruthy();

    await act(async () => {
      terminar({ ...GASOLINA, id: "nuevo" });
    });
  });

  test("con otra pestaña a la vista no se intercepta y Finanzas sigue donde estaba", async () => {
    simular();
    const { rerender } = await abrirDetalle();

    expect(manejadores).toHaveLength(1);

    mockEnFoco = false;
    await rerender(<BandaScreen />);

    expect(manejadores).toHaveLength(0);
    expect(await pulsarAtras()).toBe(false);
    expect(screen.getByRole("button", { name: "Editar movimiento" })).toBeTruthy();

    mockEnFoco = true;
    await rerender(<BandaScreen />);

    expect(manejadores).toHaveLength(1);
    expect(await pulsarAtras()).toBe(true);
    expect(screen.getByText("Octubre 2026")).toBeTruthy();
  });
});
