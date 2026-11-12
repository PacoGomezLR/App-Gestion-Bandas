import { fireEvent, render, screen } from "@testing-library/react-native";
import { page } from "react-native-calendars/src/dateutils";
import { StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { Colores } from "../../constants/theme";
import { CalendarioEventos } from "../CalendarioEventos";
import { SEMANAS_RESERVADAS } from "../CalendarioEventos.styles";

// Con el calendario real de la librería: aquí importan sus filas y su cabecera.
jest.mock("../../global.css", () => ({}));

// xdate no publica sus tipos
const XDate = jest.requireActual<new (...partes: (number | boolean)[]) => never>("xdate");

const ALTO_RESERVADO = 276;

// La de un Android con barra de navegación inferior
const ZONA_SEGURA_INFERIOR = 48;

const METRICAS = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 24, left: 0, right: 0, bottom: ZONA_SEGURA_INFERIOR },
};

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

const titulo = (mes: string) => screen.getByRole("button", { name: `Cambiar mes y año. ${mes}` });
const abrirSelector = (mes: string) => fireEvent.press(titulo(mes));
const elegir = (nombre: string) => fireEvent.press(screen.getByRole("radio", { name: nombre }));
const siguiente = () => fireEvent.press(screen.getByRole("button", { name: "Mes siguiente" }));
const anterior = () => fireEvent.press(screen.getByRole("button", { name: "Mes anterior" }));

async function pintar(onSeleccionarFecha: (fecha: string) => void = jest.fn(), fecha = "") {
  return render(
    <SafeAreaProvider initialMetrics={METRICAS}>
      <CalendarioEventos
        fecha={fecha}
        fechasConEventos={[]}
        onSeleccionarFecha={onSeleccionarFecha}
      />
    </SafeAreaProvider>
  );
}

// Viene de la librería: minHeight solo existe en la zona de días
function altosReservados(): number[] {
  const encontrados: number[] = [];

  function recorrer(nodo: unknown) {
    if (Array.isArray(nodo)) {
      nodo.forEach(recorrer);
      return;
    }

    if (typeof nodo !== "object" || nodo === null) {
      return;
    }

    const { props, children } = nodo as { props?: { style?: unknown }; children?: unknown };
    const estilo = StyleSheet.flatten(props?.style as object) as { minHeight?: number } | undefined;

    if (estilo?.minHeight === ALTO_RESERVADO) {
      encontrados.push(estilo.minHeight);
    }

    recorrer(children);
  }

  recorrer(screen.toJSON());

  return encontrados;
}

beforeEach(() => {
  fijarReloj(new Date(2026, 10, 5, 12, 0));
});

afterEach(() => {
  jest.useRealTimers();
});

describe("altura del calendario", () => {
  test("ningún mes necesita más de las 6 semanas reservadas, empezando en lunes", () => {
    const filas = new Set<number>();

    for (let anio = 2000; anio < 2100; anio += 1) {
      for (let mes = 0; mes < 12; mes += 1) {
        filas.add(page(new XDate(anio, mes, 1, 0, 0, 0, true), 1).length / 7);
      }
    }

    expect([...filas].sort()).toEqual([4, 5, 6]);
    expect(Math.max(...filas)).toBe(SEMANAS_RESERVADAS);
  });

  test("reserva 6 semanas de alto", async () => {
    await pintar();

    expect(altosReservados()).toEqual([ALTO_RESERVADO]);
  });

  test("un mes de 4 semanas y uno de 6 reservan lo mismo", async () => {
    await pintar();

    await abrirSelector("Noviembre 2026");
    await elegir("2027");
    // Febrero de 2027 empieza en lunes y tiene 28 días: 4 semanas
    await elegir("Febrero 2027");
    expect(screen.getByTestId("calendario.day_2027-02-28")).toBeTruthy();
    expect(screen.queryByTestId("calendario.day_2027-03-08")).toBeNull();
    expect(altosReservados()).toEqual([ALTO_RESERVADO]);

    await abrirSelector("Febrero 2027");
    await elegir("2026");
    // Agosto de 2026 empieza en sábado y tiene 31 días: 6 semanas
    await elegir("Agosto 2026");
    expect(screen.getByTestId("calendario.day_2026-08-31")).toBeTruthy();
    expect(altosReservados()).toEqual([ALTO_RESERVADO]);
  });
});

describe("cabecera", () => {
  test("título y flechas son botones que un lector de pantalla puede alcanzar", async () => {
    await pintar();

    // getByRole ignora lo que está oculto a la accesibilidad
    expect(screen.getByRole("button", { name: "Mes anterior" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mes siguiente" })).toBeTruthy();
    expect(titulo("Noviembre 2026")).toBeTruthy();
  });

  test("la semana empieza en lunes, con los nombres en español", async () => {
    await pintar();

    const dias = screen
      .getAllByText(/^(Lun|Mar|Mié|Jue|Vie|Sáb|Dom)\.$/, { includeHiddenElements: true })
      .map((nodo) => nodo.props.children);

    expect(dias).toEqual(["Lun.", "Mar.", "Mié.", "Jue.", "Vie.", "Sáb.", "Dom."]);
  });
});

describe("flechas", () => {
  test("siguen moviendo de mes en mes, también tras un salto", async () => {
    await pintar();

    await siguiente();
    expect(titulo("Diciembre 2026")).toBeTruthy();

    await anterior();
    await anterior();
    expect(titulo("Octubre 2026")).toBeTruthy();

    await abrirSelector("Octubre 2026");
    await elegir("Marzo 2026");
    await siguiente();

    expect(titulo("Abril 2026")).toBeTruthy();
  });
});

describe("selector de mes y año", () => {
  test("el título es un botón y abre el selector; antes no hay nada abierto", async () => {
    await pintar();

    expect(screen.queryByText("Elegir mes y año")).toBeNull();

    await abrirSelector("Noviembre 2026");

    expect(screen.getByText("Elegir mes y año")).toBeTruthy();
    expect(screen.getByText("Año")).toBeTruthy();
    expect(screen.getByText("Mes")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ir a hoy" })).toBeTruthy();
  });

  test("el mes y el año visibles salen marcados, con ✓ además del color", async () => {
    await pintar();
    await abrirSelector("Noviembre 2026");

    expect(screen.getByRole("radio", { name: "2026" }).props.accessibilityState.checked).toBe(true);
    expect(screen.getByRole("radio", { name: "2025" }).props.accessibilityState.checked).toBe(false);
    expect(
      screen.getByRole("radio", { name: "Noviembre 2026" }).props.accessibilityState.checked
    ).toBe(true);
    expect(
      screen.getByRole("radio", { name: "Marzo 2026" }).props.accessibilityState.checked
    ).toBe(false);
    expect(screen.getAllByText("✓")).toHaveLength(2);
  });

  test("muestra los 12 meses abreviados", async () => {
    await pintar();
    await abrirSelector("Noviembre 2026");

    for (const mes of ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]) {
      expect(screen.getByText(mes)).toBeTruthy();
    }
  });

  test("elegir año no cierra ni cambia nada hasta elegir mes", async () => {
    await pintar();
    await abrirSelector("Noviembre 2026");

    await elegir("2030");

    expect(screen.getByText("Elegir mes y año")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "2030" }).props.accessibilityState.checked).toBe(true);
    expect(titulo("Noviembre 2026")).toBeTruthy();
  });

  test("elegir mes salta a ese mes y año, y cierra", async () => {
    await pintar();
    await abrirSelector("Noviembre 2026");

    await elegir("2030");
    await elegir("Marzo 2030");

    expect(screen.queryByText("Elegir mes y año")).toBeNull();
    expect(titulo("Marzo 2030")).toBeTruthy();
    expect(screen.getByTestId("calendario.day_2030-03-15")).toBeTruthy();
  });

  test("los años no tienen tope: la lista se recentra y no se pintan todos", async () => {
    await pintar();
    await abrirSelector("Noviembre 2026");

    expect(screen.queryByRole("radio", { name: "2040" })).toBeNull();

    await elegir("2036");
    await elegir("2046");
    await elegir("2056");

    expect(screen.getByRole("radio", { name: "2056" })).toBeTruthy();
    expect(screen.getAllByRole("radio").length).toBe(21 + 12);

    await elegir("2046");
    await elegir("2036");
    await elegir("2026");
    await elegir("2016");
    await elegir("2006");

    expect(screen.getByRole("radio", { name: "1996" })).toBeTruthy();
  });

  test("pedir dos veces el mismo mes funciona aunque antes se haya movido con las flechas", async () => {
    await pintar();

    await abrirSelector("Noviembre 2026");
    await elegir("Marzo 2026");
    await siguiente();

    await abrirSelector("Abril 2026");
    await elegir("Marzo 2026");

    expect(titulo("Marzo 2026")).toBeTruthy();
  });

  test("Ir a hoy vuelve al mes actual", async () => {
    await pintar();

    await abrirSelector("Noviembre 2026");
    await elegir("2030");
    await elegir("Marzo 2030");

    await abrirSelector("Marzo 2030");
    await fireEvent.press(screen.getByRole("button", { name: "Ir a hoy" }));

    expect(screen.queryByText("Elegir mes y año")).toBeNull();
    expect(titulo("Noviembre 2026")).toBeTruthy();
  });

  test("Ir a hoy funciona tras cambiar año y mes dentro del selector", async () => {
    await pintar();
    await abrirSelector("Noviembre 2026");
    await elegir("2030");
    await elegir("Marzo 2030");
    await fireEvent.press(screen.getByRole("button", { name: "Mes siguiente" }));

    await abrirSelector("Abril 2030");
    await elegir("2031");
    await fireEvent.press(screen.getByRole("button", { name: "Ir a hoy" }));

    expect(titulo("Noviembre 2026")).toBeTruthy();
  });

  test("Ir a hoy deja libre la barra de navegación del móvil", async () => {
    await pintar();
    await abrirSelector("Noviembre 2026");

    const panel = StyleSheet.flatten(screen.getByTestId("panel-mes-anio").props.style);

    expect(panel.paddingBottom).toBeGreaterThan(ZONA_SEGURA_INFERIOR);
  });

  test("el panel llega hasta el borde, así el margen es igual en todos los móviles", async () => {
    await pintar();
    await abrirSelector("Noviembre 2026");

    const modal = screen.getByTestId("selector-mes-anio", { includeHiddenElements: true });

    expect(modal.props.navigationBarTranslucent).toBe(true);
    expect(modal.props.statusBarTranslucent).toBe(true);
  });

  test("Ir a hoy es un botón visible y cómodo, sin competir como relleno principal", async () => {
    await pintar();
    await abrirSelector("Noviembre 2026");

    const estilo = StyleSheet.flatten(screen.getByRole("button", { name: "Ir a hoy" }).props.style);
    const panel = StyleSheet.flatten(screen.getByTestId("panel-mes-anio").props.style);

    expect(estilo.minHeight).toBeGreaterThanOrEqual(44);
    // Con el mismo fondo que el panel parecería un texto suelto
    expect(estilo.backgroundColor).not.toBe(panel.backgroundColor);
    expect(estilo.backgroundColor).not.toBe(Colores.primary);
  });

  test("tocar fuera lo cierra sin cambiar de mes", async () => {
    await pintar();
    await abrirSelector("Noviembre 2026");
    await elegir("2030");

    // El panel es modal: el fondo no recibe el foco del lector, que cierra con Atrás
    await fireEvent.press(
      screen.getByLabelText("Cerrar selector de mes y año", { includeHiddenElements: true })
    );

    expect(screen.queryByText("Elegir mes y año")).toBeNull();
    expect(titulo("Noviembre 2026")).toBeTruthy();
  });

  test("Atrás de Android lo cierra sin cambiar de mes", async () => {
    await pintar();
    await abrirSelector("Noviembre 2026");

    await fireEvent(
      screen.getByTestId("selector-mes-anio", { includeHiddenElements: true }),
      "requestClose"
    );

    expect(screen.queryByText("Elegir mes y año")).toBeNull();
    expect(titulo("Noviembre 2026")).toBeTruthy();
  });

  test("cada grupo se anuncia y cada opción tiene su nombre completo", async () => {
    await pintar();
    await abrirSelector("Noviembre 2026");

    expect(screen.getByLabelText("Año").props.accessibilityRole).toBe("radiogroup");
    expect(screen.getByLabelText("Mes").props.accessibilityRole).toBe("radiogroup");
    expect(screen.getByRole("radio", { name: "Enero 2026" })).toBeTruthy();
  });
});

describe("selección de días", () => {
  test("pulsar un día sigue avisando con su fecha, también tras un salto", async () => {
    const onSeleccionarFecha = jest.fn();

    await pintar(onSeleccionarFecha);
    await abrirSelector("Noviembre 2026");
    await elegir("Marzo 2026");

    await fireEvent.press(screen.getByTestId("calendario.day_2026-03-15"));

    expect(onSeleccionarFecha).toHaveBeenCalledWith("2026-03-15");
  });

  test("cambiar de mes no toca el día seleccionado", async () => {
    const onSeleccionarFecha = jest.fn();

    await pintar(onSeleccionarFecha, "2026-11-20");

    await abrirSelector("Noviembre 2026");
    await elegir("Marzo 2026");
    await abrirSelector("Marzo 2026");
    await fireEvent.press(screen.getByRole("button", { name: "Ir a hoy" }));

    expect(onSeleccionarFecha).not.toHaveBeenCalled();
    expect(screen.getByText("Fecha seleccionada: 20-11-2026")).toBeTruthy();
  });
});
