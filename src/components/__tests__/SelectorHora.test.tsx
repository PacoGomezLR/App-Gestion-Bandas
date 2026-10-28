import type { DateTimePickerProps } from "@expo/ui/community/datetime-picker";
import { act, fireEvent, render } from "@testing-library/react-native";
import {
  convertirDateAHora,
  convertirHoraADate,
  SelectorHora,
} from "../SelectorHora";

// Guarda las props con las que se monta el selector nativo
const mockSelectorNativo = jest.fn((_props: DateTimePickerProps) => undefined);

jest.mock("@expo/ui/community/datetime-picker", () => {
  const { Text } = require("react-native");

  return {
    __esModule: true,
    default: (props: DateTimePickerProps) => {
      mockSelectorNativo(props);
      return <Text>Selector nativo abierto</Text>;
    },
  };
});

function propsSelectorNativo(): DateTimePickerProps {
  const llamada = mockSelectorNativo.mock.lastCall;

  if (!llamada) {
    throw new Error("El selector nativo no se ha montado");
  }

  return llamada[0];
}

// Simula que el usuario confirma una hora en el diálogo
async function elegirHora(horas: number, minutos: number) {
  const fecha = new Date(2026, 11, 20, horas, minutos, 0, 0);

  await act(() => {
    propsSelectorNativo().onValueChange?.(
      { nativeEvent: { timestamp: fecha.getTime(), utcOffset: 0 } },
      fecha
    );
  });
}

beforeEach(() => {
  mockSelectorNativo.mockClear();
});

describe("SelectorHora", () => {
  test("sin hora muestra solo Hora y no permite quitarla", async () => {
    const { getByText, queryByText, getByRole } = await render(
      <SelectorHora hora="" onCambiarHora={jest.fn()} />
    );

    expect(getByText("Hora")).toBeTruthy();
    expect(queryByText("Seleccionar hora")).toBeNull();
    // Visualmente solo pone Hora, pero el nombre accesible es descriptivo
    expect(getByRole("button", { name: "Elegir hora" })).toBeTruthy();
    expect(queryByText("Quitar hora")).toBeNull();
    expect(queryByText("Selector nativo abierto")).toBeNull();
  });

  test("con hora muestra Hora, la hora y la acción Quitar hora", async () => {
    const { getByText, getByRole, queryByText } = await render(
      <SelectorHora hora="20:30" onCambiarHora={jest.fn()} />
    );

    expect(getByText("Hora")).toBeTruthy();
    expect(getByText("20:30")).toBeTruthy();
    expect(queryByText("Seleccionar hora")).toBeNull();
    expect(getByRole("button", { name: "Cambiar hora. Hora actual 20:30" })).toBeTruthy();
    expect(getByRole("button", { name: "Quitar hora" })).toBeTruthy();
  });

  test("al pulsar la fila Hora abre el selector nativo en diálogo de 24 horas", async () => {
    const { getByText } = await render(
      <SelectorHora hora="" onCambiarHora={jest.fn()} />
    );

    await fireEvent.press(getByText("Hora"));

    expect(getByText("Selector nativo abierto")).toBeTruthy();
    expect(propsSelectorNativo()).toMatchObject({
      mode: "time",
      presentation: "dialog",
      is24Hour: true,
    });
  });

  test("al pulsar la fila con 20:30 abre el selector con la hora existente", async () => {
    const { getByText } = await render(
      <SelectorHora hora="20:30" onCambiarHora={jest.fn()} />
    );

    await fireEvent.press(getByText("20:30"));

    expect(getByText("Selector nativo abierto")).toBeTruthy();
    const valor = propsSelectorNativo().value;
    expect(valor.getHours()).toBe(20);
    expect(valor.getMinutes()).toBe(30);
  });

  test("al elegir 09:05 envía la hora con cero inicial y cierra el selector", async () => {
    const onCambiarHora = jest.fn();
    const { getByText, queryByText } = await render(
      <SelectorHora hora="" onCambiarHora={onCambiarHora} />
    );

    await fireEvent.press(getByText("Hora"));
    await elegirHora(9, 5);

    expect(onCambiarHora).toHaveBeenCalledTimes(1);
    expect(onCambiarHora).toHaveBeenCalledWith("09:05");
    expect(queryByText("Selector nativo abierto")).toBeNull();
  });

  test("al elegir medianoche envía 00:00", async () => {
    const onCambiarHora = jest.fn();
    const { getByText } = await render(
      <SelectorHora hora="20:30" onCambiarHora={onCambiarHora} />
    );

    await fireEvent.press(getByText("20:30"));
    await elegirHora(0, 0);

    expect(onCambiarHora).toHaveBeenCalledWith("00:00");
  });

  test("al cancelar no cambia la hora y cierra el selector", async () => {
    const onCambiarHora = jest.fn();
    const { getByText, queryByText } = await render(
      <SelectorHora hora="20:30" onCambiarHora={onCambiarHora} />
    );

    await fireEvent.press(getByText("20:30"));
    await act(() => {
      propsSelectorNativo().onDismiss?.();
    });

    expect(onCambiarHora).not.toHaveBeenCalled();
    expect(queryByText("Selector nativo abierto")).toBeNull();
    expect(getByText("20:30")).toBeTruthy();
  });

  test("Quitar hora envía una hora vacía sin abrir el selector", async () => {
    const onCambiarHora = jest.fn();
    const { getByText, queryByText } = await render(
      <SelectorHora hora="20:30" onCambiarHora={onCambiarHora} />
    );

    await fireEvent.press(getByText("Quitar hora"));

    expect(onCambiarHora).toHaveBeenCalledWith("");
    expect(queryByText("Selector nativo abierto")).toBeNull();
  });

  test("deshabilitado no abre el selector ni permite quitar la hora", async () => {
    const onCambiarHora = jest.fn();
    const { getByText, getByRole, queryByText } = await render(
      <SelectorHora hora="20:30" onCambiarHora={onCambiarHora} disabled />
    );

    expect(
      getByRole("button", { name: "Cambiar hora. Hora actual 20:30", disabled: true })
    ).toBeTruthy();
    expect(getByRole("button", { name: "Quitar hora", disabled: true })).toBeTruthy();

    await fireEvent.press(getByText("Hora"));
    await fireEvent.press(getByText("20:30"));
    await fireEvent.press(getByText("Quitar hora"));

    expect(onCambiarHora).not.toHaveBeenCalled();
    expect(queryByText("Selector nativo abierto")).toBeNull();
    expect(mockSelectorNativo).not.toHaveBeenCalled();
  });
});

describe("conversión de hora", () => {
  test("convierte HH:MM a un Date local con esa hora", () => {
    for (const [hora, horas, minutos] of [
      ["09:05", 9, 5],
      ["00:00", 0, 0],
      ["23:59", 23, 59],
    ] as const) {
      const fecha = convertirHoraADate(hora);

      expect(fecha.getHours()).toBe(horas);
      expect(fecha.getMinutes()).toBe(minutos);
      expect(fecha.getSeconds()).toBe(0);
    }
  });

  test("sin hora usa la hora actual sin segundos ni milisegundos", () => {
    const fecha = convertirHoraADate("");

    expect(fecha.getSeconds()).toBe(0);
    expect(fecha.getMilliseconds()).toBe(0);
  });

  test("convierte un Date a HH:MM con la hora local y cero inicial", () => {
    expect(convertirDateAHora(new Date(2026, 0, 1, 9, 5))).toBe("09:05");
    expect(convertirDateAHora(new Date(2026, 0, 1, 20, 30))).toBe("20:30");
    expect(convertirDateAHora(new Date(2026, 0, 1, 0, 0))).toBe("00:00");
    expect(convertirDateAHora(new Date(2026, 0, 1, 23, 59))).toBe("23:59");
  });
});
