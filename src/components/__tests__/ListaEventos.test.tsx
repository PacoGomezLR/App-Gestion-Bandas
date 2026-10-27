import { fireEvent, render } from "@testing-library/react-native";
import type { Evento } from "../../types/evento";
import { ListaEventos } from "../ListaEventos";

const eventos: Evento[] = [
  {
    id: "1",
    titulo: "Concierto en Sevilla",
    tipo: "concierto",
    fecha: "2026-11-15",
    estado: "confirmado",
  },
  {
    id: "2",
    titulo: "Ensayo general",
    tipo: "ensayo",
    fecha: "2026-11-20",
    estado: "pendiente",
  },
];

describe("ListaEventos", () => {
  test("muestra los eventos recibidos", async () => {
    const onEliminar = jest.fn();
    const onEditar = jest.fn();

    const { getByText } = await render(
      <ListaEventos
        eventos={eventos}
        onEliminar={onEliminar}
        onEditar={onEditar}
      />
    );

    expect(getByText("Concierto en Sevilla")).toBeTruthy();
    expect(getByText("Ensayo general")).toBeTruthy();

    expect(getByText("15-11-2026")).toBeTruthy();
    expect(getByText("20-11-2026")).toBeTruthy();

    expect(getByText("confirmado")).toBeTruthy();
    expect(getByText("pendiente")).toBeTruthy();
  });

  test("llama a onEliminar con el id correcto", async () => {
    const onEliminar = jest.fn();
    const onEditar = jest.fn();

    const { getAllByText } = await render(
      <ListaEventos
        eventos={eventos}
        onEliminar={onEliminar}
        onEditar={onEditar}
      />
    );

    await fireEvent.press(getAllByText("Eliminar")[0]);

    expect(onEliminar).toHaveBeenCalledTimes(1);
    expect(onEliminar).toHaveBeenCalledWith("1");
  });

  test("llama a onEditar con el evento correcto", async () => {
    const onEliminar = jest.fn();
    const onEditar = jest.fn();

    const { getAllByText } = await render(
      <ListaEventos
        eventos={eventos}
        onEliminar={onEliminar}
        onEditar={onEditar}
      />
    );

    await fireEvent.press(getAllByText("Editar")[1]);

    expect(onEditar).toHaveBeenCalledTimes(1);
    expect(onEditar).toHaveBeenCalledWith(eventos[1]);
  });
});
