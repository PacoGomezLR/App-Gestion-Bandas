import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";
import { Alert, type AlertButton, BackHandler, Platform, StyleSheet } from "react-native";

import Index from "../../app/index";
import { useBandaContext } from "../../context/BandaContext";
import { useIntegrantesContext } from "../../context/IntegrantesContext";
import { useTecnicosContext } from "../../context/TecnicosContext";
import { useEventos } from "../../hooks/useEventos";
import type { IndisponibilidadUsuario } from "../../types/disponibilidad";
import type { Evento } from "../../types/evento";

// Pantalla Calendario completa con estado real: useEventos de verdad y una
// disponibilidad en memoria. Solo se simulan Supabase, la sesión y el calendario.

// "Hoy" fijo para que próximas fechas e historial sean deterministas
jest.mock("../../utils/fechas", () => ({
  ...jest.requireActual("../../utils/fechas"),
  fechaDeHoy: () => "2026-11-10",
}));

// constants/theme importa global.css, que Jest no puede interpretar
let mockEnFoco = true;

jest.mock("expo-router", () => ({ useIsFocused: () => mockEnFoco }));

jest.mock("../../global.css", () => ({}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));

// El calendario real no se puede pulsar día a día en Jest: un botón por día
// y un texto con las marcas (punto / anillo) que recibe
jest.mock("react-native-calendars", () => {
  const { Button, Text } = require("react-native");
  const dias = ["2026-11-14", "2026-11-21", "2026-11-30"];

  return {
    Calendar: ({
      onDayPress,
      markedDates,
    }: {
      onDayPress: (day: { dateString: string }) => void;
      markedDates: Record<string, object>;
    }) => (
      <>
        <Text testID="marked-dates">{JSON.stringify(markedDates)}</Text>
        {dias.map((dia) => (
          <Button key={dia} title={`Día ${dia}`} onPress={() => onDayPress({ dateString: dia })} />
        ))}
      </>
    ),
    LocaleConfig: { locales: {}, defaultLocale: "" },
  };
});

jest.mock("../../components/BotonCerrarSesion", () => {
  const { Text } = require("react-native");
  return { BotonCerrarSesion: () => <Text>Cerrar sesión</Text> };
});

jest.mock("../../context/BandaContext", () => ({ useBandaContext: jest.fn() }));
jest.mock("../../context/TecnicosContext", () => ({ useTecnicosContext: jest.fn() }));
jest.mock("../../context/IntegrantesContext", () => ({ useIntegrantesContext: jest.fn() }));
jest.mock("../../context/EventosContext", () => ({
  useEventosContext: () => mockUsarEventos(),
}));
jest.mock("../../context/DisponibilidadContext", () => ({
  useDisponibilidadContext: () => mockUsarDisponibilidad(),
}));

let mockEventosIniciales: Evento[] = [];
let mockErrorEliminacion: { eventoId: string; mensaje: string } | null = null;
let mockIndisponibilidadesIniciales: IndisponibilidadUsuario[] = [];
const mockPersistirEvento = jest.fn(async (evento: Evento, _esNuevo: boolean) => evento);
const mockMarcarNoDisponible = jest.fn((_fecha: string) => {});
const mockMarcarDisponible = jest.fn((_fecha: string) => {});

// El mismo hook que usa EventosContext, con el estado dentro de la pantalla
function mockUsarEventos() {
  const estado = useEventos({
    datosIniciales: mockEventosIniciales,
    persistirEvento: mockPersistirEvento,
    eliminarEventoPersistido: async () => true,
  });

  return {
    ...estado,
    cargando: false,
    errorPersistencia: "",
    errorEliminacion: mockErrorEliminacion,
    cachesEvento: {},
    cargandoCaches: false,
    errorCaches: "",
  };
}

// Disponibilidad en memoria con la misma interfaz que DisponibilidadContext
function mockUsarDisponibilidad() {
  const [lista, setLista] = useState(mockIndisponibilidadesIniciales);

  return {
    indisponibilidades: lista,
    usuarioActualId: "yo",
    cargando: false,
    procesando: false,
    errorPersistencia: "",
    marcarNoDisponible: async (fecha: string) => {
      mockMarcarNoDisponible(fecha);
      setLista((actual) => [...actual, { id: `n-${fecha}`, bandaId: "b1", usuarioId: "yo", fecha }]);
      return true;
    },
    marcarDisponible: async (fecha: string) => {
      mockMarcarDisponible(fecha);
      setLista((actual) => actual.filter((i) => !(i.usuarioId === "yo" && i.fecha === fecha)));
      return true;
    },
  };
}

const mockUseBandaContext = jest.mocked(useBandaContext);
const mockUseTecnicosContext = jest.mocked(useTecnicosContext);
const mockUseIntegrantesContext = jest.mocked(useIntegrantesContext);

function evento(id: string, fecha: string, lugar: string, estado: Evento["estado"] = "pendiente"): Evento {
  return {
    id,
    titulo: `Ensayo ${lugar}`,
    tipo: "ensayo",
    fecha,
    hora: "",
    lugar,
    notas: "",
    estado,
    tecnicoIds: [],
    googleMapsUrl: null,
  };
}

// Desordenados a propósito. Hoy es 2026-11-10
const AGENDA: Evento[] = [
  evento("f6", "2027-01-10", "F6"),
  evento("p1", "2026-11-01", "Pasado1"),
  evento("f2", "2026-11-21", "F2"),
  evento("hoy", "2026-11-10", "Hoy"),
  evento("f7", "2027-02-01", "F7"),
  evento("p2", "2026-10-15", "Pasado2"),
  evento("f4", "2026-12-05", "F4"),
  evento("f1", "2026-11-14", "F1"),
  evento("ayer", "2026-11-09", "Ayer"),
  evento("f5", "2026-12-20", "F5"),
  evento("f3", "2026-11-30", "F3"),
];

interface Escenario {
  esAdmin?: boolean;
  eventos?: Evento[];
  indisponibilidades?: IndisponibilidadUsuario[];
}

function simular({ esAdmin = true, eventos = [], indisponibilidades = [] }: Escenario = {}) {
  mockEventosIniciales = eventos;
  mockIndisponibilidadesIniciales = indisponibilidades;

  mockUseBandaContext.mockReturnValue({
    bandas: [],
    bandaActual: { id: "b1", nombre: "Cathaline", creadaPor: "u0", creadaEn: "2026-01-01" },
    pertenenciaActual: { bandaId: "b1", usuarioId: "yo", rol: esAdmin ? "admin" : "usuario", creadaEn: "2026-01-01" },
    cargando: false,
    errorCarga: "",
    error: "",
    esAdmin,
    crearBanda: jest.fn(),
    seleccionarBanda: jest.fn(),
    recargarBandas: jest.fn(),
  });

  mockUseTecnicosContext.mockReturnValue({
    tecnicos: [{ id: "t1", nombre: "Carlos" }],
    nombre: "",
    error: "",
    tecnicoEditandoId: null,
    setNombre: jest.fn(),
    reemplazarTecnicos: jest.fn(),
    guardarTecnico: jest.fn(),
    prepararEdicion: jest.fn(),
    cancelarEdicion: jest.fn(),
    eliminarTecnico: jest.fn(),
    errorEliminacion: "",
    procesando: false,
    cargando: false,
    errorPersistencia: "",
  });

  mockUseIntegrantesContext.mockReturnValue({
    integrantes: [
      { usuarioId: "yo", nombreVisible: "Paco Gómez" },
      { usuarioId: "otro", nombreVisible: "Kike Fuentes" },
    ],
    nombresPorUsuario: { yo: "Paco Gómez", otro: "Kike Fuentes" },
    cargando: false,
    errorPersistencia: "",
  });
}

// Orden en el que aparecen unos textos en la pantalla
async function elegirTipo(nombre: string) {
  await fireEvent.press(screen.getByRole("button", { name: /^Tipo de evento:/ }));
  await fireEvent.press(screen.getByRole("radio", { name: nombre }));
}

function estaEnOrden(textos: string[]) {
  const renderizado = JSON.stringify(screen.toJSON());
  const lista = textos.map((texto) => renderizado.indexOf(texto));

  expect(lista.every((posicion) => posicion >= 0)).toBe(true);
  expect([...lista].sort((a, b) => a - b)).toEqual(lista);
}

function marcas(): Record<string, { marked?: boolean; selected?: boolean; customStyles?: object }> {
  return JSON.parse(screen.getByTestId("marked-dates").props.children);
}

// En Android, Button pone su título en mayúsculas: se busca sin distinguir
async function tocarDia(dia: string) {
  await fireEvent.press(screen.getByText(new RegExp(`^Día ${dia}$`, "i")));
}

async function elegir(opcion: "Disponible" | "No disponible") {
  await fireEvent.press(screen.getByRole("radio", { name: opcion }));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Calendario: próximas fechas, todas e historial", () => {
  test("el inicio muestra solo las 5 fechas futuras más próximas, en orden", async () => {
    simular({ eventos: AGENDA });
    await render(<Index />);

    expect(screen.getByText("Próximas fechas")).toBeTruthy();
    // Hoy cuenta como próxima; después, de la más próxima a la más lejana
    estaEnOrden(["Ensayo Hoy", "Ensayo F1", "Ensayo F2", "Ensayo F3", "Ensayo F4"]);
    expect(screen.queryByText("Ensayo F5")).toBeNull();
    expect(screen.queryByText("Ensayo F6")).toBeNull();
    // Nada del pasado en el inicio
    for (const pasado of ["Ensayo Ayer", "Ensayo Pasado1", "Ensayo Pasado2"]) {
      expect(screen.queryByText(pasado)).toBeNull();
    }
  });

  test("Ver todas las fechas muestra todas las futuras sin mezclar las pasadas", async () => {
    simular({ eventos: AGENDA });
    await render(<Index />);

    await fireEvent.press(screen.getByText("Ver todas las fechas"));

    expect(screen.getByText("Todas las fechas")).toBeTruthy();
    estaEnOrden([
      "Ensayo Hoy",
      "Ensayo F1",
      "Ensayo F2",
      "Ensayo F3",
      "Ensayo F4",
      "Ensayo F5",
      "Ensayo F6",
      "Ensayo F7",
    ]);
    expect(screen.queryByText("Ensayo Ayer")).toBeNull();
    expect(screen.queryByText("Ensayo Pasado1")).toBeNull();
    // El historial no se ve por defecto: es un acceso secundario
    expect(screen.getByText("Consultar historial")).toBeTruthy();
  });

  test("Consultar historial muestra solo las pasadas, de la más reciente a la más antigua", async () => {
    simular({ eventos: AGENDA });
    await render(<Index />);

    await fireEvent.press(screen.getByText("Ver todas las fechas"));
    await fireEvent.press(screen.getByText("Consultar historial"));

    expect(screen.getByText("Historial")).toBeTruthy();
    estaEnOrden(["Ensayo Ayer", "Ensayo Pasado1", "Ensayo Pasado2"]);
    expect(screen.queryByText("Ensayo Hoy")).toBeNull();
    expect(screen.queryByText("Ensayo F1")).toBeNull();

    // Se vuelve atrás sin perder nada
    await fireEvent.press(screen.getByText("Volver a todas las fechas"));
    expect(screen.getByText("Todas las fechas")).toBeTruthy();
    await fireEvent.press(screen.getByText("Volver al calendario"));
    expect(screen.getByText("Próximas fechas")).toBeTruthy();
  });

  test("los eventos antiguos son los mismos datos: no se mueven ni se guardan de nuevo", async () => {
    simular({ eventos: AGENDA });
    await render(<Index />);

    await fireEvent.press(screen.getByText("Ver todas las fechas"));
    await fireEvent.press(screen.getByText("Consultar historial"));

    expect(mockPersistirEvento).not.toHaveBeenCalled();
    // El historial lee la misma lista: al abrir una tarjeta se ve su detalle de siempre
    await fireEvent.press(screen.getByText("Ensayo Ayer"));
    expect(screen.getAllByText("09/11/2026")).toHaveLength(2);
    expect(screen.getByText("Técnico")).toBeTruthy();
  });

  test("sin eventos no muestra ni Ver todas las fechas ni Consultar historial", async () => {
    simular();
    await render(<Index />);

    expect(screen.getByText("No hay próximas fechas")).toBeTruthy();
    expect(screen.queryByText("Ver todas las fechas")).toBeNull();
    expect(screen.queryByText("Consultar historial")).toBeNull();
  });

  test("solo con futuras: Ver todas las fechas, y en Todas no hay historial que consultar", async () => {
    simular({ eventos: [evento("f1", "2026-11-14", "F1")] });
    await render(<Index />);

    expect(screen.getByText("Ver todas las fechas")).toBeTruthy();
    expect(screen.queryByText("Consultar historial")).toBeNull();

    await fireEvent.press(screen.getByText("Ver todas las fechas"));
    expect(screen.queryByText("Consultar historial")).toBeNull();
  });

  test("con futuras y pasadas: el inicio lleva a Todas, y desde ahí al historial", async () => {
    simular({ eventos: AGENDA });
    await render(<Index />);

    expect(screen.getByText("Ver todas las fechas")).toBeTruthy();
    // En el inicio el historial no compite con la agenda
    expect(screen.queryByText("Consultar historial")).toBeNull();

    await fireEvent.press(screen.getByText("Ver todas las fechas"));
    expect(screen.getByText("Consultar historial")).toBeTruthy();
  });

  test("solo con pasadas: el inicio lleva directamente al historial, sin rodeos", async () => {
    simular({ eventos: [evento("p1", "2026-11-01", "Pasado1")] });
    await render(<Index />);

    expect(screen.getByText("No hay próximas fechas")).toBeTruthy();
    expect(screen.queryByText("Ver todas las fechas")).toBeNull();

    await fireEvent.press(screen.getByText("Consultar historial"));

    expect(screen.getByText("Historial")).toBeTruthy();
    expect(screen.getByText("Ensayo Pasado1")).toBeTruthy();
    // Volver regresa al calendario, que es de donde se vino
    await fireEvent.press(screen.getByText("Volver al calendario"));
    expect(screen.getByText("Próximas fechas")).toBeTruthy();
  });

  test("un usuario normal consulta todo pero no puede editar ni eliminar", async () => {
    simular({ esAdmin: false, eventos: AGENDA });
    await render(<Index />);

    await fireEvent.press(screen.getByText("Ensayo F1"));
    expect(screen.queryByText("Editar evento")).toBeNull();
    expect(screen.queryByText("Eliminar evento")).toBeNull();

    await fireEvent.press(screen.getByText("Ver todas las fechas"));
    await fireEvent.press(screen.getByText("Consultar historial"));
    await fireEvent.press(screen.getByText("Ensayo Ayer"));
    expect(screen.queryByText("Editar evento")).toBeNull();
    // No se enseña el rol
    expect(screen.queryByText(/admin|usuario|solo lectura/i)).toBeNull();
  });

  test("el Calendario ofrece Cerrar sesión", async () => {
    simular();
    await render(<Index />);

    expect(screen.getByText("Cerrar sesión")).toBeTruthy();
  });
});

describe("Calendario: panel del día", () => {
  test("al entrar la vista está limpia: sin panel ni formularios", async () => {
    simular({ eventos: AGENDA });
    await render(<Index />);

    expect(screen.queryByText("Tu disponibilidad")).toBeNull();
    expect(screen.queryByText("+ Crear evento")).toBeNull();
    expect(screen.queryByText("Guardar evento")).toBeNull();
    // Ningún día seleccionado
    expect(Object.values(marcas()).some((marca) => marca.selected === true)).toBe(false);
  });

  test("tocar un día abre su panel justo debajo del calendario", async () => {
    simular({ eventos: AGENDA });
    await render(<Index />);

    await tocarDia("2026-11-21");

    expect(screen.getByText("21-11-2026")).toBeTruthy();
    expect(marcas()["2026-11-21"].selected).toBe(true);
    // Calendario → panel → próximas fechas
    estaEnOrden(["marked-dates", "Tu disponibilidad", "Próximas fechas"]);
  });

  test.each([
    ["usuario", false],
    ["admin", true],
  ])("un %s se marca no disponible un día sin eventos: solo se guarda al pulsar Guardar disponibilidad", async (_, esAdmin) => {
    simular({ esAdmin });
    await render(<Index />);

    await tocarDia("2026-11-21");
    expect(screen.getByRole("radio", { name: "Disponible", checked: true })).toBeTruthy();
    // Sin cambios no hay nada que guardar
    expect(screen.getByRole("button", { name: "Guardar disponibilidad", disabled: true })).toBeTruthy();

    await elegir("No disponible");

    // Elegir la opción no guarda nada
    expect(mockMarcarNoDisponible).not.toHaveBeenCalled();
    expect(marcas()["2026-11-21"].customStyles).toBeUndefined();

    await fireEvent.press(screen.getByRole("button", { name: "Guardar disponibilidad" }));

    expect(mockMarcarNoDisponible).toHaveBeenCalledWith("2026-11-21");
    // El panel se cierra y el día queda con el anillo
    expect(screen.queryByText("Tu disponibilidad")).toBeNull();
    expect(marcas()["2026-11-21"].customStyles).toBeDefined();
  });

  test("Descartar cambios no guarda, cierra el panel y descarta la elección", async () => {
    simular();
    await render(<Index />);

    await tocarDia("2026-11-21");
    await elegir("No disponible");
    await fireEvent.press(screen.getByRole("button", { name: "Descartar cambios" }));

    expect(mockMarcarNoDisponible).not.toHaveBeenCalled();
    expect(screen.queryByText("Tu disponibilidad")).toBeNull();

    // Al volver a abrirlo, sigue como estaba guardado
    await tocarDia("2026-11-21");
    expect(screen.getByRole("radio", { name: "Disponible", checked: true })).toBeTruthy();
  });

  test("quien ya estaba no disponible puede volver a estar disponible", async () => {
    simular({
      esAdmin: false,
      indisponibilidades: [{ id: "i1", bandaId: "b1", usuarioId: "yo", fecha: "2026-11-14" }],
    });
    await render(<Index />);

    await tocarDia("2026-11-14");
    expect(screen.getByRole("radio", { name: "No disponible", checked: true })).toBeTruthy();

    await elegir("Disponible");
    await fireEvent.press(screen.getByRole("button", { name: "Guardar disponibilidad" }));

    expect(mockMarcarDisponible).toHaveBeenCalledWith("2026-11-14");
    expect(marcas()["2026-11-14"]?.customStyles).toBeUndefined();
  });

  test.each([
    ["usuario", false],
    ["admin", true],
  ])("un %s ve los nombres de quien no puede, pero solo gestiona lo suyo", async (_, esAdmin) => {
    simular({
      esAdmin,
      indisponibilidades: [
        { id: "i1", bandaId: "b1", usuarioId: "otro", fecha: "2026-11-14" },
        { id: "i2", bandaId: "b1", usuarioId: "yo", fecha: "2026-11-14" },
      ],
    });
    await render(<Index />);

    await tocarDia("2026-11-14");

    expect(screen.getByText("⚠ 2 no disponibles")).toBeTruthy();
    expect(screen.getByText("Kike Fuentes")).toBeTruthy();
    expect(screen.getByText("Paco Gómez")).toBeTruthy();
    // Un único grupo de opciones: el propio
    expect(screen.getAllByRole("radio")).toHaveLength(2);

    await elegir("Disponible");
    await fireEvent.press(screen.getByRole("button", { name: "Guardar disponibilidad" }));

    // Solo se desmarca mi día; Kike sigue no disponible
    expect(mockMarcarDisponible).toHaveBeenCalledWith("2026-11-14");
    await tocarDia("2026-11-14");
    expect(screen.getByText("⚠ 1 no disponible")).toBeTruthy();
    expect(screen.getByText("Kike Fuentes")).toBeTruthy();
  });

  test("sin nadie no disponible no aparece ningún aviso vacío", async () => {
    simular();
    await render(<Index />);

    await tocarDia("2026-11-21");

    expect(screen.queryByText(/^⚠/)).toBeNull();
  });

  test("un día con evento muestra el evento en el panel, y el calendario punto y anillo", async () => {
    simular({
      eventos: [evento("f1", "2026-11-14", "Lucena", "confirmado")],
      indisponibilidades: [{ id: "i1", bandaId: "b1", usuarioId: "otro", fecha: "2026-11-14" }],
    });
    await render(<Index />);

    expect(marcas()["2026-11-14"]).toMatchObject({ marked: true, customStyles: { container: { borderWidth: 2 } } });

    await tocarDia("2026-11-14");

    expect(screen.getByText("Eventos de este día")).toBeTruthy();
    // En el panel y en las próximas fechas
    expect(screen.getAllByText("Ensayo Lucena")).toHaveLength(2);
    expect(screen.getByText("⚠ 1 no disponible")).toBeTruthy();
  });

  test("solo el admin ve + Crear evento", async () => {
    simular({ esAdmin: false });
    await render(<Index />);
    await tocarDia("2026-11-21");
    expect(screen.queryByText("+ Crear evento")).toBeNull();
  });

  test("Crear evento despliega el formulario con la fecha elegida, y Cancelar vuelve al panel", async () => {
    simular();
    await render(<Index />);

    await tocarDia("2026-11-21");
    expect(screen.queryByText("Guardar evento")).toBeNull();

    await fireEvent.press(screen.getByText("+ Crear evento"));

    expect(screen.getByLabelText("Fecha: 21-11-2026")).toBeTruthy();
    // Las acciones del evento siguen siendo Cancelar y Guardar evento
    expect(screen.getByText("Guardar evento")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeTruthy();
    // Desplegado justo debajo de Crear evento (que queda inactivo), antes de la disponibilidad
    expect(screen.getByRole("button", { name: "+ Crear evento", disabled: true })).toBeTruthy();
    estaEnOrden(["+ Crear evento", "Tipo de evento", "Guardar evento", "Tu disponibilidad"]);

    await fireEvent.press(screen.getByRole("button", { name: "Cancelar" }));

    expect(mockPersistirEvento).not.toHaveBeenCalled();
    expect(screen.queryByText("Guardar evento")).toBeNull();
    expect(screen.getByText("Tu disponibilidad")).toBeTruthy();
    expect(screen.getByText("21-11-2026")).toBeTruthy();
  });

  test("Guardar evento usa el flujo de siempre (título automático) y cierra el panel", async () => {
    simular();
    await render(<Index />);

    await tocarDia("2026-11-21");
    await fireEvent.press(screen.getByText("+ Crear evento"));
    await fireEvent.changeText(screen.getByLabelText("Lugar"), "Montilla");
    await elegirTipo("Concierto abierto");
    await fireEvent.press(screen.getByText("Guardar evento"));

    expect(mockPersistirEvento).toHaveBeenCalledWith(
      expect.objectContaining({
        fecha: "2026-11-21",
        lugar: "Montilla",
        estado: "pendiente",
        titulo: "Concierto abierto Montilla 21/11/2026",
      }),
      true,
      undefined
    );
    expect(screen.queryByText("Tu disponibilidad")).toBeNull();
    // Ya aparece en las próximas fechas
    expect(screen.getByText("Concierto abierto Montilla")).toBeTruthy();
  });

  test("un evento pendiente con conflictos se guarda sin aviso", async () => {
    const alerta = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    simular({ indisponibilidades: [{ id: "i1", bandaId: "b1", usuarioId: "otro", fecha: "2026-11-21" }] });
    await render(<Index />);

    await tocarDia("2026-11-21");
    await fireEvent.press(screen.getByText("+ Crear evento"));
    await elegirTipo("Concierto abierto");
    await fireEvent.press(screen.getByText("Guardar evento"));

    expect(alerta).not.toHaveBeenCalled();
    expect(mockPersistirEvento).toHaveBeenCalledTimes(1);
    alerta.mockRestore();
  });

  test("confirmar con conflictos avisa con los nombres; Cancelar no guarda y Confirmar igualmente sí", async () => {
    const alerta = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    simular({
      indisponibilidades: [
        { id: "i1", bandaId: "b1", usuarioId: "otro", fecha: "2026-11-21" },
        { id: "i2", bandaId: "b1", usuarioId: "yo", fecha: "2026-11-21" },
      ],
    });
    await render(<Index />);

    await tocarDia("2026-11-21");
    await fireEvent.press(screen.getByText("+ Crear evento"));
    await fireEvent.press(screen.getByRole("radio", { name: "Confirmado" }));
    await elegirTipo("Concierto abierto");
    await fireEvent.press(screen.getByText("Guardar evento"));

    expect(alerta).toHaveBeenCalledTimes(1);
    const [titulo, mensaje, botones] = alerta.mock.calls[0];
    expect(titulo).toBe("Integrantes no disponibles");
    expect(mensaje).toContain("Hay 2 integrantes que han marcado esta fecha como no disponible");
    expect(mensaje).toContain("Kike Fuentes\nPaco Gómez");

    (botones as AlertButton[]).find(({ text }) => text === "Cancelar")?.onPress?.();
    expect(mockPersistirEvento).not.toHaveBeenCalled();
    // El formulario sigue abierto tal como estaba
    expect(screen.getByText("Guardar evento")).toBeTruthy();

    await fireEvent.press(screen.getByText("Guardar evento"));
    const segundo = alerta.mock.calls[1][2] as AlertButton[];
    await act(async () => {
      segundo.find(({ text }) => text === "Confirmar igualmente")?.onPress?.();
    });

    expect(mockPersistirEvento).toHaveBeenCalledWith(
      expect.objectContaining({ estado: "confirmado" }),
      true,
      undefined
    );
    alerta.mockRestore();
  });

  test("el admin edita desde una tarjeta: el formulario se abre en el panel de su día", async () => {
    simular({ eventos: AGENDA });
    await render(<Index />);

    await fireEvent.press(screen.getByText("Ensayo F2"));
    await fireEvent.press(screen.getByText("Editar evento"));

    // En la cabecera del panel y en el formulario
    expect(screen.getAllByText("21-11-2026")).toHaveLength(2);
    expect(screen.getByLabelText("Fecha: 21-11-2026")).toBeTruthy();
    expect(screen.getByText("Guardar cambios")).toBeTruthy();

    await fireEvent.press(screen.getByText("Guardar cambios"));
    expect(mockPersistirEvento).toHaveBeenCalledWith(
      expect.objectContaining({ id: "f2" }),
      false,
      undefined
    );
  });
});

describe("Calendario: botón Atrás de Android", () => {
  // BackHandler simulado: se guardan los manejadores registrados y se puede
  // "pulsar" Atrás. Devuelve true si la pantalla lo ha interceptado.
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
    mockEnFoco = true;
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

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("en el inicio limpio no se intercepta: Android hace lo de siempre", async () => {
    simular({ eventos: AGENDA });
    await render(<Index />);

    expect(manejadores).toHaveLength(0);
    expect(await pulsarAtras()).toBe(false);
  });

  test("Historial → Todas las fechas → Inicio", async () => {
    simular({ eventos: AGENDA });
    await render(<Index />);

    await fireEvent.press(screen.getByText("Ver todas las fechas"));
    await fireEvent.press(screen.getByText("Consultar historial"));
    expect(screen.getByText("Historial")).toBeTruthy();

    // No sale de la app ni salta al inicio
    expect(await pulsarAtras()).toBe(true);
    expect(screen.getByText("Todas las fechas")).toBeTruthy();

    expect(await pulsarAtras()).toBe(true);
    expect(screen.getByText("Próximas fechas")).toBeTruthy();

    // Ya en el inicio limpio, deja de interceptar
    expect(manejadores).toHaveLength(0);
  });

  test("el historial abierto desde el inicio vuelve al inicio", async () => {
    simular({ eventos: [evento("p1", "2026-11-01", "Pasado1")] });
    await render(<Index />);

    await fireEvent.press(screen.getByText("Consultar historial"));

    expect(await pulsarAtras()).toBe(true);
    expect(screen.getByText("Próximas fechas")).toBeTruthy();
  });

  test("con el panel del día abierto, Atrás lo cierra y descarta el borrador", async () => {
    simular();
    await render(<Index />);

    await tocarDia("2026-11-21");
    await elegir("No disponible");

    expect(await pulsarAtras()).toBe(true);

    expect(screen.queryByText("Tu disponibilidad")).toBeNull();
    expect(mockMarcarNoDisponible).not.toHaveBeenCalled();
    expect(manejadores).toHaveLength(0);

    // El borrador no se guardó
    await tocarDia("2026-11-21");
    expect(screen.getByRole("radio", { name: "Disponible", checked: true })).toBeTruthy();
  });

  test("Formulario de evento → panel del día → inicio limpio", async () => {
    simular();
    await render(<Index />);

    await tocarDia("2026-11-21");
    await fireEvent.press(screen.getByText("+ Crear evento"));
    await fireEvent.changeText(screen.getByLabelText("Lugar"), "Montilla");

    expect(await pulsarAtras()).toBe(true);
    // Vuelve al panel del mismo día, sin guardar nada
    expect(screen.queryByText(/^Guardar evento$/i)).toBeNull();
    expect(screen.getByText("Tu disponibilidad")).toBeTruthy();
    expect(screen.getByText("21-11-2026")).toBeTruthy();
    expect(mockPersistirEvento).not.toHaveBeenCalled();

    expect(await pulsarAtras()).toBe(true);
    expect(screen.queryByText("Tu disponibilidad")).toBeNull();
    expect(manejadores).toHaveLength(0);
  });

  test("con otra pestaña a la vista, una vista abierta no intercepta Atrás", async () => {
    simular({ eventos: AGENDA });
    const { rerender } = await render(<Index />);

    await fireEvent.press(screen.getByText("Ver todas las fechas"));
    expect(manejadores).toHaveLength(1);

    mockEnFoco = false;
    await rerender(<Index />);
    expect(manejadores).toHaveLength(0);

    // Al volver a la pestaña, sigue donde estaba
    mockEnFoco = true;
    await rerender(<Index />);
    expect(manejadores).toHaveLength(1);
    expect(await pulsarAtras()).toBe(true);
    expect(screen.getByText("Próximas fechas")).toBeTruthy();
  });

  test("los botones visibles siguen funcionando igual", async () => {
    simular({ eventos: AGENDA });
    await render(<Index />);

    await fireEvent.press(screen.getByText("Ver todas las fechas"));
    await fireEvent.press(screen.getByText("Volver al calendario"));

    expect(screen.getByText("Próximas fechas")).toBeTruthy();
  });
});

describe("Calendario: orden y botones del panel del día", () => {
  test("el admin ve + Crear evento arriba; Tu disponibilidad cierra el panel", async () => {
    simular({
      eventos: [evento("f1", "2026-11-14", "Lucena")],
      indisponibilidades: [{ id: "i1", bandaId: "b1", usuarioId: "otro", fecha: "2026-11-14" }],
    });
    await render(<Index />);

    await tocarDia("2026-11-14");

    estaEnOrden([
      "14-11-2026",
      "+ Crear evento",
      "Eventos de este día",
      "No disponibles",
      "Tu disponibilidad",
      "Descartar cambios",
      "Guardar disponibilidad",
      "Próximas fechas",
    ]);
  });

  test("un usuario normal no ve Crear evento y su panel empieza por el contenido del día", async () => {
    simular({ esAdmin: false, eventos: [evento("f1", "2026-11-14", "Lucena")] });
    await render(<Index />);

    await tocarDia("2026-11-14");

    expect(screen.queryByText("+ Crear evento")).toBeNull();
    estaEnOrden(["14-11-2026", "Eventos de este día", "Tu disponibilidad"]);
  });

  test("la disponibilidad ya no usa los genéricos Guardar ni Cancelar", async () => {
    simular();
    await render(<Index />);

    await tocarDia("2026-11-21");

    expect(screen.queryByRole("button", { name: "Guardar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancelar" })).toBeNull();
    expect(screen.getByRole("button", { name: "Descartar cambios" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guardar disponibilidad", disabled: true })).toBeTruthy();
  });

  test("opciones y botones de disponibilidad centrados, con el mismo tamaño", async () => {
    simular();
    await render(<Index />);

    await tocarDia("2026-11-21");

    const grupo = StyleSheet.flatten(screen.getByTestId("opciones-disponibilidad").props.style);
    expect(grupo).toMatchObject({ flexDirection: "row", justifyContent: "center", width: "100%" });

    // Las dos opciones: mismo flex y misma altura, contenido centrado
    const [disponible, noDisponible] = screen.getAllByRole("radio").map((opcion) => StyleSheet.flatten(opcion.props.style));
    for (const opcion of [disponible, noDisponible]) {
      expect(opcion).toMatchObject({ flex: 1, minHeight: 48, justifyContent: "center", alignItems: "center" });
    }

    // Los dos botones, uno debajo de otro, a todo el ancho del grupo y con el texto centrado
    const acciones = StyleSheet.flatten(screen.getByTestId("acciones-disponibilidad").props.style);
    expect(acciones).toMatchObject({ width: "100%" });
    expect(acciones.flexDirection).toBeUndefined();
    for (const nombre of ["Descartar cambios", "Guardar disponibilidad"]) {
      const boton = StyleSheet.flatten(screen.getByRole("button", { name: nombre }).props.style);
      expect(boton).toMatchObject({ alignSelf: "stretch", alignItems: "center", minHeight: 52 });
      expect(StyleSheet.flatten(screen.getByText(nombre).props.style).textAlign).toBe("center");
    }
  });

  test("jerarquía: Crear evento relleno, Guardar disponibilidad tonal y Descartar cambios solo texto", async () => {
    simular();
    await render(<Index />);

    await tocarDia("2026-11-21");

    const crear = StyleSheet.flatten(screen.getByRole("button", { name: "+ Crear evento" }).props.style);
    const guardar = StyleSheet.flatten(screen.getByRole("button", { name: "Guardar disponibilidad" }).props.style);
    const descartar = StyleSheet.flatten(screen.getByRole("button", { name: "Descartar cambios" }).props.style);

    expect(crear.backgroundColor).toBeDefined();
    expect(guardar.backgroundColor).toBeDefined();
    expect(guardar.backgroundColor).not.toBe(crear.backgroundColor);
    expect(descartar.backgroundColor).toBe("transparent");
  });
});

describe("Calendario: la gestión de la banda vive en la pestaña Banda", () => {
  test("ni el admin ni un usuario normal ven Gestionar banda", async () => {
    simular();
    const { unmount } = await render(<Index />);

    expect(screen.queryByText("Gestionar banda")).toBeNull();
    expect(screen.queryByText("+ Invitar usuario")).toBeNull();
    await unmount();

    simular({ esAdmin: false });
    await render(<Index />);

    expect(screen.queryByText("Gestionar banda")).toBeNull();
  });
});

describe("Calendario: evento con movimientos financieros", () => {
  const MENSAJE = "No se puede eliminar este evento porque tiene movimientos financieros asociados.";

  afterEach(() => {
    mockErrorEliminacion = null;
  });

  test("el motivo se ve junto al evento y no arriba de la pantalla", async () => {
    mockErrorEliminacion = { eventoId: "f2", mensaje: MENSAJE };
    simular({ eventos: [evento("f2", "2027-11-21", "F2")] });
    await render(<Index />);

    expect(screen.queryByText(MENSAJE)).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: /^Ver detalles de Ensayo F2/ }));

    expect(screen.getByText(MENSAJE)).toBeTruthy();
    expect(screen.getByText("Eliminar evento")).toBeTruthy();
  });
});

describe("Calendario: caché acordado", () => {
  async function abrirFormulario() {
    await render(<Index />);
    await fireEvent.press(screen.getByText("Día 2026-11-21"));
    await fireEvent.press(screen.getByText("+ Crear evento"));
  }

  test("el admin ve el campo al crear", async () => {
    simular();
    await abrirFormulario();

    expect(screen.getByLabelText("Caché acordado")).toBeTruthy();
  });

  test("el admin ve el campo al editar", async () => {
    simular({ eventos: [evento("f2", "2027-11-21", "F2")] });
    await render(<Index />);

    await fireEvent.press(screen.getByRole("button", { name: /^Ver detalles de Ensayo F2/ }));
    await fireEvent.press(screen.getByText("Editar evento"));

    expect(screen.getByLabelText("Caché acordado")).toBeTruthy();
  });

  test("el admin ve el bloque económico en el detalle", async () => {
    simular({ eventos: [evento("f2", "2027-11-21", "F2")] });
    await render(<Index />);

    await fireEvent.press(screen.getByRole("button", { name: /^Ver detalles de Ensayo F2/ }));

    expect(screen.getByText("Caché")).toBeTruthy();
    expect(screen.getByText("Sin caché registrado")).toBeTruthy();
  });

  test("un usuario normal consulta el evento sin ningún dato económico", async () => {
    simular({ esAdmin: false, eventos: [evento("f2", "2027-11-21", "F2")] });
    await render(<Index />);

    await fireEvent.press(screen.getByRole("button", { name: /^Ver detalles de Ensayo F2/ }));

    expect(screen.getByText("Técnico")).toBeTruthy();
    expect(screen.getByText("Estado")).toBeTruthy();
    expect(screen.queryByText("Caché")).toBeNull();
    expect(screen.queryByLabelText("Caché acordado")).toBeNull();
  });
});

describe("Calendario: tipo de evento obligatorio", () => {
  async function abrirAlta() {
    await render(<Index />);
    await tocarDia("2026-11-21");
    await fireEvent.press(screen.getByText("+ Crear evento"));
  }

  test("al crear no hay ningún tipo elegido", async () => {
    simular();
    await abrirAlta();

    expect(screen.getByRole("button", { name: "Tipo de evento: Selecciona un tipo" })).toBeTruthy();
  });

  test("guardar sin tipo no persiste, avisa y conserva lo escrito", async () => {
    simular();
    await abrirAlta();
    await fireEvent.changeText(screen.getByLabelText("Lugar"), "Montilla");

    await fireEvent.press(screen.getByText("Guardar evento"));

    expect(mockPersistirEvento).not.toHaveBeenCalled();
    expect(screen.getByText("Selecciona un tipo de evento.")).toBeTruthy();
    expect(screen.getByLabelText("Lugar").props.value).toBe("Montilla");
  });

  test("elegir tipo quita el aviso y entonces guarda ese tipo", async () => {
    simular();
    await abrirAlta();
    await fireEvent.press(screen.getByText("Guardar evento"));

    await elegirTipo("Boda");

    expect(screen.queryByText("Selecciona un tipo de evento.")).toBeNull();
    expect(screen.getByRole("button", { name: "Tipo de evento: Boda" })).toBeTruthy();

    await fireEvent.press(screen.getByText("Guardar evento"));

    expect(mockPersistirEvento).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "boda", titulo: "Boda 21/11/2026" }),
      true,
      undefined
    );
  });

  test("al crear otro después, vuelve a empezar sin tipo", async () => {
    simular();
    await abrirAlta();
    await elegirTipo("Boda");
    await fireEvent.press(screen.getByText("Guardar evento"));

    await tocarDia("2026-11-21");
    await fireEvent.press(screen.getByText("+ Crear evento"));

    expect(screen.getByRole("button", { name: "Tipo de evento: Selecciona un tipo" })).toBeTruthy();
  });

  test("al editar enseña su tipo y guarda sin volver a elegirlo", async () => {
    simular({ eventos: [evento("f2", "2027-11-21", "F2")] });
    await render(<Index />);
    await fireEvent.press(screen.getByRole("button", { name: /^Ver detalles de Ensayo F2/ }));
    await fireEvent.press(screen.getByText("Editar evento"));

    expect(screen.getByRole("button", { name: "Tipo de evento: Ensayo" })).toBeTruthy();

    await fireEvent.press(screen.getByText("Guardar cambios"));

    expect(mockPersistirEvento).toHaveBeenCalledWith(
      expect.objectContaining({ id: "f2", tipo: "ensayo" }),
      false,
      undefined
    );
    expect(screen.queryByText("Selecciona un tipo de evento.")).toBeNull();
  });
});

describe("Calendario: ayuda para crear eventos", () => {
  const AYUDA = "Para crear un evento, pulsa un día del calendario.";

  test("un admin ve la ayuda justo encima del calendario, después del título", async () => {
    simular();
    await render(<Index />);

    expect(screen.getByText(AYUDA)).toBeTruthy();
    expect(screen.getByTestId("ayuda-calendario")).toBeTruthy();
    estaEnOrden(["Calendario", "Cathaline", AYUDA, "marked-dates"]);
  });

  test("un usuario normal no la ve", async () => {
    simular({ esAdmin: false });
    await render(<Index />);

    expect(screen.queryByText(AYUDA)).toBeNull();
    expect(screen.queryByTestId("ayuda-calendario")).toBeNull();
  });
});

describe("Calendario: enlace de Google Maps", () => {
  async function abrirAlta() {
    await render(<Index />);
    await tocarDia("2026-11-21");
    await fireEvent.press(screen.getByText("+ Crear evento"));
    await elegirTipo("Boda");
  }

  test("el admin lo ve al crear y se guarda con el evento", async () => {
    simular();
    await abrirAlta();

    await fireEvent.changeText(screen.getByLabelText("Lugar"), "Caseta Municipal");
    await fireEvent.changeText(
      screen.getByLabelText("Enlace de Google Maps"),
      " https://maps.app.goo.gl/AbCdEf123 "
    );
    await fireEvent.press(screen.getByText("Guardar evento"));

    expect(mockPersistirEvento).toHaveBeenCalledWith(
      expect.objectContaining({
        lugar: "Caseta Municipal",
        googleMapsUrl: "https://maps.app.goo.gl/AbCdEf123",
      }),
      true,
      undefined
    );
  });

  test("un enlace ajeno no se guarda y se explica junto al formulario", async () => {
    simular();
    await abrirAlta();

    await fireEvent.changeText(screen.getByLabelText("Enlace de Google Maps"), "https://ejemplo.com");
    await fireEvent.press(screen.getByText("Guardar evento"));

    expect(mockPersistirEvento).not.toHaveBeenCalled();
    expect(screen.getByText("Introduce un enlace válido de Google Maps.")).toBeTruthy();
  });

  test("un usuario normal no tiene formulario, pero sí el botón del evento", async () => {
    simular({
      esAdmin: false,
      eventos: [{ ...evento("f2", "2027-11-21", "F2"), googleMapsUrl: "https://maps.app.goo.gl/x" }],
    });
    await render(<Index />);

    await fireEvent.press(screen.getByRole("button", { name: /^Ver detalles de Ensayo F2/ }));

    expect(screen.getByText("Abrir en Google Maps")).toBeTruthy();
    expect(screen.queryByText("Editar evento")).toBeNull();
    expect(screen.queryByLabelText("Enlace de Google Maps")).toBeNull();
  });
});
