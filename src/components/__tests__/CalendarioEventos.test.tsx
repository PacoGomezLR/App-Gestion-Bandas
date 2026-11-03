import {
  fireEvent,
  render,
} from "@testing-library/react-native";

import { CalendarioEventos } from "../CalendarioEventos";
import { crearMarcaNoDisponible } from "../CalendarioEventos.styles";

// Las marcas tal cual las recibe la librería (sin pasar por JSON), para
// comprobar que se pueden mutar como hace react-native-calendars
interface MarcaRecibida {
  marked?: boolean;
  selected?: boolean;
  customStyles?: { container: Record<string, unknown> };
}

let mockUltimasMarcas: Record<string, MarcaRecibida> = {};

// constants/theme importa global.css, que Jest no puede interpretar
jest.mock("../../global.css", () => ({}));

jest.mock("react-native-calendars", () => {
  const { Button, Text } = require("react-native");

  return {
    Calendar: ({
      onDayPress,
      markedDates,
      markingType,
    }: {
      onDayPress: (day: { dateString: string }) => void;
      markedDates: Record<string, MarcaRecibida>;
      markingType?: string;
    }) => {
      mockUltimasMarcas = markedDates;

      return (
      <>
        <Text testID="marking-type">{markingType}</Text>
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
      );
    },
    LocaleConfig: {
      locales: {},
      defaultLocale: "",
    },
  };
});

describe("CalendarioEventos", () => {
  test("muestra la fecha formateada y avisa al pulsar un día", async () => {
    const onSeleccionarFecha = jest.fn();

    const { getByTestId, getByText } = await render(
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

    await fireEvent.press(
      getByText("Seleccionar día de prueba")
    );

    expect(onSeleccionarFecha).toHaveBeenCalledTimes(1);

    expect(onSeleccionarFecha).toHaveBeenCalledWith(
      "2026-12-24"
    );
  });

  test("señala con un anillo los días con algún integrante no disponible", async () => {
    const { getByTestId } = await render(
      <CalendarioEventos
        fecha=""
        fechasConEventos={[]}
        noDisponiblesPorFecha={{ "2026-11-14": 2 }}
        onSeleccionarFecha={jest.fn()}
      />
    );

    // custom permite el anillo sin perder el punto de los eventos
    expect(getByTestId("marking-type").props.children).toBe("custom");

    const marca = JSON.parse(getByTestId("marked-dates").props.children)["2026-11-14"];

    expect(marca.marked).toBeUndefined();
    expect(marca.customStyles.container).toMatchObject({ borderWidth: 2 });
    expect(marca.customStyles.container.borderColor).toBeDefined();
    // También se anuncia con texto para lectores de pantalla
    expect(marca.accessibilityLabel).toBe("14-11-2026: 2 no disponibles");
  });

  test("un día con evento e indisponibilidad muestra el punto y el anillo a la vez", async () => {
    const { getByTestId } = await render(
      <CalendarioEventos
        fecha=""
        fechasConEventos={["2026-11-14", "2026-11-20"]}
        noDisponiblesPorFecha={{ "2026-11-14": 1 }}
        onSeleccionarFecha={jest.fn()}
      />
    );

    const marcas = JSON.parse(getByTestId("marked-dates").props.children);

    expect(marcas["2026-11-14"].marked).toBe(true);
    expect(marcas["2026-11-14"].customStyles.container).toMatchObject({ borderWidth: 2 });
    expect(marcas["2026-11-14"].accessibilityLabel).toBe("14-11-2026: 1 no disponible, con evento");
    // Solo evento: igual que siempre, sin anillo
    expect(marcas["2026-11-20"]).toEqual({ marked: true });
  });

  test("el día seleccionado con conflicto conserva la selección y el anillo", async () => {
    const { getByTestId } = await render(
      <CalendarioEventos
        fecha="2026-11-14"
        fechasConEventos={[]}
        noDisponiblesPorFecha={{ "2026-11-14": 1 }}
        onSeleccionarFecha={jest.fn()}
      />
    );

    const marca = JSON.parse(getByTestId("marked-dates").props.children)["2026-11-14"];

    expect(marca.selected).toBe(true);
    expect(marca.customStyles.container).toMatchObject({ borderWidth: 2 });
    // El texto mantiene el color de la selección para leerse bien
    expect(marca.customStyles.text.color).toBeUndefined();
  });

  test("los nombres nunca van en el calendario: solo el anillo y su etiqueta accesible", async () => {
    const { getByTestId, queryByText } = await render(
      <CalendarioEventos
        fecha="2026-11-14"
        fechasConEventos={[]}
        noDisponiblesPorFecha={{ "2026-11-14": 2 }}
        onSeleccionarFecha={jest.fn()}
      />
    );

    expect(queryByText(/⚠/)).toBeNull();
    expect(JSON.parse(getByTestId("marked-dates").props.children)["2026-11-14"].accessibilityLabel).toBe(
      "14-11-2026: 2 no disponibles"
    );
  });

  test("sin conflictos no hay aviso ni anillos", async () => {
    const { getByTestId, queryByText } = await render(
      <CalendarioEventos
        fecha="2026-11-15"
        fechasConEventos={["2026-11-15"]}
        onSeleccionarFecha={jest.fn()}
      />
    );

    expect(queryByText(/no disponible/)).toBeNull();
    expect(JSON.parse(getByTestId("marked-dates").props.children)).toEqual({
      "2026-11-15": { marked: true, selected: true },
    });
  });

  test("customStyles.container es un objeto plano con borderRadius que la librería puede mutar", async () => {
    await render(
      <CalendarioEventos
        fecha="2026-11-14"
        fechasConEventos={["2026-11-14"]}
        noDisponiblesPorFecha={{ "2026-11-14": 1, "2026-11-20": 2 }}
        onSeleccionarFecha={jest.fn()}
      />
    );

    const contenedor = mockUltimasMarcas["2026-11-14"].customStyles?.container;
    const otro = mockUltimasMarcas["2026-11-20"].customStyles?.container;

    // Ya trae borderRadius: react-native-calendars no necesita añadirlo
    expect(contenedor).toMatchObject({ borderWidth: 2, borderRadius: 16 });
    // No está congelado (como un estilo de StyleSheet.create): se puede escribir
    expect(Object.isFrozen(contenedor)).toBe(false);
    expect(Object.isExtensible(contenedor)).toBe(true);
    expect(() => {
      // Lo mismo que hace la librería en getContainerStyle
      if (contenedor !== undefined) {
        contenedor.borderRadius = contenedor.borderRadius ?? 16;
        contenedor.propiedadNueva = true;
      }
    }).not.toThrow();
    // Cada día recibe su propio objeto
    expect(contenedor).not.toBe(otro);
  });

  test("crearMarcaNoDisponible devuelve objetos nuevos y extensibles en cada llamada", () => {
    const colores = { conflict: "#C2410C" } as Parameters<typeof crearMarcaNoDisponible>[0];
    const primera = crearMarcaNoDisponible(colores, false);
    const segunda = crearMarcaNoDisponible(colores, false);

    expect(primera.container).not.toBe(segunda.container);
    expect(Object.isExtensible(primera.container)).toBe(true);
    expect(Object.isExtensible(primera.text)).toBe(true);
    expect(primera.container.borderRadius).toBe(16);
  });

  test("el anillo usa el color de conflicto del tema claro y del oscuro", () => {
    const { Colors } = jest.requireActual<typeof import("@/constants/theme")>("@/constants/theme");

    expect(crearMarcaNoDisponible(Colors.light, false).container.borderColor).toBe(Colors.light.conflict);
    expect(crearMarcaNoDisponible(Colors.dark, false).container.borderColor).toBe(Colors.dark.conflict);
    expect(Colors.light.conflict).not.toBe(Colors.dark.conflict);
  });
});
