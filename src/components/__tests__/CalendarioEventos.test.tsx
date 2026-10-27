import {
  fireEvent,
  render,
} from "@testing-library/react-native";

import { CalendarioEventos } from "../CalendarioEventos";

jest.mock("react-native-calendars", () => {
  const { Button } = require("react-native");

  return {
    Calendar: ({
      onDayPress,
    }: {
      onDayPress: (day: { dateString: string }) => void;
    }) => (
      <Button
        title="Seleccionar día de prueba"
        onPress={() =>
          onDayPress({
            dateString: "2026-12-24",
          })
        }
      />
    ),
    LocaleConfig: {
      locales: {},
      defaultLocale: "",
    },
  };
});

describe("CalendarioEventos", () => {
  test("muestra la fecha formateada y avisa al pulsar un día", () => {
    const onSeleccionarFecha = jest.fn();

    const { getByText } = render(
      <CalendarioEventos
        fecha="2026-12-20"
        onSeleccionarFecha={onSeleccionarFecha}
      />
    );

    expect(
      getByText("Fecha seleccionada: 20-12-2026")
    ).toBeTruthy();

    fireEvent.press(
      getByText("Seleccionar día de prueba")
    );

    expect(onSeleccionarFecha).toHaveBeenCalledTimes(1);

    expect(onSeleccionarFecha).toHaveBeenCalledWith(
      "2026-12-24"
    );
  });
});
