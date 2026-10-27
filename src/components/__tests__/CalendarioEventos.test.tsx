import {
  fireEvent,
  render,
} from "@testing-library/react-native";

import { CalendarioEventos } from "../CalendarioEventos";

jest.mock("react-native-calendars", () => {
  const { Button, Text } = require("react-native");

  return {
    Calendar: ({
      onDayPress,
      markedDates,
    }: {
      onDayPress: (day: { dateString: string }) => void;
      markedDates: Record<
        string,
        { marked?: boolean; selected?: boolean }
      >;
    }) => (
      <>
        <Text testID="marked-dates">
          {JSON.stringify(markedDates)}
        </Text>

        <Button
          title="Seleccionar día de prueba"
          onPress={() =>
            onDayPress({
              dateString: "2026-12-24",
            })
          }
        />
      </>
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

    const { getByTestId, getByText } = render(
      <CalendarioEventos
        fecha="2026-12-20"
        fechasConEventos={[
          "2026-12-15",
          "2026-12-20",
        ]}
        onSeleccionarFecha={onSeleccionarFecha}
      />
    );

    expect(
      getByText("Fecha seleccionada: 20-12-2026")
    ).toBeTruthy();

    const fechasMarcadas = JSON.parse(
      getByTestId("marked-dates").props.children
    );

    expect(fechasMarcadas["2026-12-15"]).toEqual({
      marked: true,
    });

    expect(fechasMarcadas["2026-12-20"]).toEqual({
      marked: true,
      selected: true,
    });

    fireEvent.press(
      getByText("Seleccionar día de prueba")
    );

    expect(onSeleccionarFecha).toHaveBeenCalledTimes(1);

    expect(onSeleccionarFecha).toHaveBeenCalledWith(
      "2026-12-24"
    );
  });
});
