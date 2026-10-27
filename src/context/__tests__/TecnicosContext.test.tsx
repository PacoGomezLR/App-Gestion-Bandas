import { fireEvent, render } from "@testing-library/react-native";
import { Button, Text, TextInput, View } from "react-native";

import {
  TecnicosProvider,
  useTecnicosContext,
} from "../TecnicosContext";

function ConsumidorA() {
  const { nombre, setNombre, guardarTecnico } = useTecnicosContext();

  return (
    <View>
      <TextInput
        placeholder="Nombre en A"
        value={nombre}
        onChangeText={setNombre}
      />
      <Button title="Crear desde A" onPress={guardarTecnico} />
    </View>
  );
}

function ConsumidorB() {
  const { tecnicos } = useTecnicosContext();

  return (
    <View>
      <Text>Total en B: {tecnicos.length}</Text>
      {tecnicos.map((tecnico) => (
        <Text key={tecnico.id}>B ve a {tecnico.nombre}</Text>
      ))}
    </View>
  );
}

function ConsumidorSinProvider() {
  useTecnicosContext();

  return null;
}

describe("TecnicosContext", () => {
  test("comparte la misma lista de técnicos entre consumidores", async () => {
    const { getByPlaceholderText, getByText } = await render(
      <TecnicosProvider>
        <ConsumidorA />
        <ConsumidorB />
      </TecnicosProvider>
    );

    expect(getByText("Total en B: 2")).toBeTruthy();

    await fireEvent.changeText(getByPlaceholderText("Nombre en A"), "Lucía");
    await fireEvent.press(getByText("Crear desde A"));

    expect(getByText("Total en B: 3")).toBeTruthy();
    expect(getByText("B ve a Lucía")).toBeTruthy();
  });

  test("falla si se usa fuera del provider", async () => {
    // React registra el error lanzado durante el render; se silencia para no ensuciar la salida
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await expect(render(<ConsumidorSinProvider />)).rejects.toThrow(
      "useTecnicosContext debe usarse dentro de TecnicosProvider"
    );

    consoleError.mockRestore();
  });
});
