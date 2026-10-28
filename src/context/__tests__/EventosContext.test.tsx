import { fireEvent, render } from "@testing-library/react-native";
import { Button, Text, View } from "react-native";

import {
  EventosProvider,
  useEventosContext,
} from "../EventosContext";

function ConsumidorA() {
  const { setTitulo, setFecha, guardarEvento } = useEventosContext();

  return (
    <View>
      <Button
        title="Rellenar en A"
        onPress={() => {
          setTitulo("Concierto compartido");
          setFecha("2026-12-31");
        }}
      />
      <Button title="Guardar en A" onPress={guardarEvento} />
    </View>
  );
}

function ConsumidorB() {
  const { eventos } = useEventosContext();

  return (
    <View>
      <Text>Total en B: {eventos.length}</Text>
      {eventos.map((evento) => (
        <Text key={evento.id}>{evento.titulo}</Text>
      ))}
    </View>
  );
}

function ConsumidorSinProvider() {
  useEventosContext();

  return null;
}

describe("EventosContext", () => {
  test("comparte la misma lista de eventos entre consumidores", async () => {
    const { getByText, queryByText } = await render(
      <EventosProvider>
        <ConsumidorA />
        <ConsumidorB />
      </EventosProvider>
    );

    expect(getByText("Total en B: 3")).toBeTruthy();
    expect(queryByText("Concierto compartido")).toBeNull();

    await fireEvent.press(getByText("Rellenar en A"));
    await fireEvent.press(getByText("Guardar en A"));

    expect(getByText("Total en B: 4")).toBeTruthy();
    expect(getByText("Concierto compartido")).toBeTruthy();
  });

  test("falla si se usa fuera del provider", async () => {
    // React registra el error lanzado durante el render; se silencia para no ensuciar la salida
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await expect(render(<ConsumidorSinProvider />)).rejects.toThrow(
      "useEventosContext debe usarse dentro de EventosProvider"
    );

    consoleError.mockRestore();
  });
});
