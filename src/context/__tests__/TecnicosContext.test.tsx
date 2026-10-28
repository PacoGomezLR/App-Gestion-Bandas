import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { Button, Text, TextInput, View } from "react-native";

import { EventosProvider, useEventosContext } from "../EventosContext";
import {
  TecnicosProvider,
  useTecnicosContext,
} from "../TecnicosContext";

function renderizarConProviders(contenido: ReactElement) {
  return render(
    <EventosProvider>
      <TecnicosProvider>{contenido}</TecnicosProvider>
    </EventosProvider>
  );
}

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

// Asigna técnicos a eventos usando solo la API pública de EventosContext
function ConsumidorEventos() {
  const { eventos, prepararEdicion, alternarTecnico, guardarEvento } =
    useEventosContext();

  return (
    <View>
      {eventos.map((evento) => (
        <View key={evento.id}>
          <Text>
            Evento {evento.id}: {evento.tecnicoIds.join(",") || "sin técnicos"}
          </Text>
          <Button
            title={`Editar evento ${evento.id}`}
            onPress={() => prepararEdicion(evento)}
          />
        </View>
      ))}
      <Button title="Asignar Carlos" onPress={() => alternarTecnico("1")} />
      <Button title="Guardar evento" onPress={guardarEvento} />
    </View>
  );
}

function ConsumidorTecnicos() {
  const { tecnicos, eliminarTecnico, errorEliminacion } =
    useTecnicosContext();

  return (
    <View>
      <Text>Total técnicos: {tecnicos.length}</Text>
      {tecnicos.map((tecnico) => (
        <Text key={tecnico.id}>Técnico: {tecnico.nombre}</Text>
      ))}
      <Text>
        {errorEliminacion !== "" ? errorEliminacion : "Sin error de eliminación"}
      </Text>
      <Button title="Eliminar Carlos" onPress={() => eliminarTecnico("1")} />
    </View>
  );
}

function ConsumidorSinProvider() {
  useTecnicosContext();

  return null;
}

async function asignarCarlosAlEvento(eventoId: string) {
  await fireEvent.press(screen.getByText(`Editar evento ${eventoId}`));
  await fireEvent.press(screen.getByText("Asignar Carlos"));
  await fireEvent.press(screen.getByText("Guardar evento"));
}

describe("TecnicosContext", () => {
  test("comparte la misma lista de técnicos entre consumidores", async () => {
    const { getByPlaceholderText, getByText } = await renderizarConProviders(
      <>
        <ConsumidorA />
        <ConsumidorB />
      </>
    );

    expect(getByText("Total en B: 2")).toBeTruthy();

    await fireEvent.changeText(getByPlaceholderText("Nombre en A"), "Lucía");
    await fireEvent.press(getByText("Crear desde A"));

    expect(getByText("Total en B: 3")).toBeTruthy();
    expect(getByText("B ve a Lucía")).toBeTruthy();
  });

  test("permite eliminar un técnico sin eventos", async () => {
    const { getByText, queryByText } = await renderizarConProviders(
      <ConsumidorTecnicos />
    );

    expect(getByText("Total técnicos: 2")).toBeTruthy();

    await fireEvent.press(getByText("Eliminar Carlos"));

    expect(getByText("Total técnicos: 1")).toBeTruthy();
    expect(queryByText("Técnico: Carlos")).toBeNull();
    expect(getByText("Técnico: Miguel")).toBeTruthy();
    expect(getByText("Sin error de eliminación")).toBeTruthy();
  });

  test("impide eliminar un técnico asignado a un evento", async () => {
    const { getByText } = await renderizarConProviders(
      <>
        <ConsumidorEventos />
        <ConsumidorTecnicos />
      </>
    );

    await asignarCarlosAlEvento("1");

    expect(getByText("Evento 1: 1")).toBeTruthy();

    await fireEvent.press(getByText("Eliminar Carlos"));

    expect(getByText("Técnico: Carlos")).toBeTruthy();
    expect(getByText("Total técnicos: 2")).toBeTruthy();
    expect(
      getByText("No se puede eliminar a Carlos porque está asignado a 1 evento")
    ).toBeTruthy();
    expect(getByText("Evento 1: 1")).toBeTruthy();
  });

  test("indica en plural cuando el técnico está asignado a varios eventos", async () => {
    const { getByText } = await renderizarConProviders(
      <>
        <ConsumidorEventos />
        <ConsumidorTecnicos />
      </>
    );

    await asignarCarlosAlEvento("1");
    await asignarCarlosAlEvento("2");

    expect(getByText("Evento 1: 1")).toBeTruthy();
    expect(getByText("Evento 2: 1")).toBeTruthy();

    await fireEvent.press(getByText("Eliminar Carlos"));

    expect(getByText("Técnico: Carlos")).toBeTruthy();
    expect(
      getByText("No se puede eliminar a Carlos porque está asignado a 2 eventos")
    ).toBeTruthy();
    expect(getByText("Evento 1: 1")).toBeTruthy();
    expect(getByText("Evento 2: 1")).toBeTruthy();
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
