import { fireEvent, render } from "@testing-library/react-native";
import type { Evento } from "../../types/evento";
import type { Tecnico } from "../../types/tecnico";
import { ListaEventos } from "../ListaEventos";

const tecnicos: Tecnico[] = [
  {
    id: "1",
    nombre: "Carlos",
  },
  {
    id: "2",
    nombre: "Miguel",
  },
];

const eventos: Evento[] = [
  {
    id: "1",
    titulo: "Concierto en Sevilla",
    tipo: "concierto",
    fecha: "2026-11-15",
    estado: "confirmado",
    tecnicoIds: ["1", "2"],
  },
  {
    id: "2",
    titulo: "Ensayo general",
    tipo: "ensayo",
    fecha: "2026-11-20",
    estado: "pendiente",
    tecnicoIds: [],
  },
];

describe("ListaEventos", () => {
  test("muestra los eventos recibidos", async () => {
    const onEliminar = jest.fn();
    const onEditar = jest.fn();

    const { getByText } = await render(
      <ListaEventos
        eventos={eventos}
        tecnicos={tecnicos}
        procesando={false}
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
        tecnicos={tecnicos}
        procesando={false}
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
        tecnicos={tecnicos}
        procesando={false}
        onEliminar={onEliminar}
        onEditar={onEditar}
      />
    );

    await fireEvent.press(getAllByText("Editar")[1]);

    expect(onEditar).toHaveBeenCalledTimes(1);
    expect(onEditar).toHaveBeenCalledWith(eventos[1]);
  });

  test("muestra los técnicos asignados a cada evento", async () => {
    const { getByText } = await render(
      <ListaEventos
        eventos={eventos}
        tecnicos={tecnicos}
        procesando={false}
        onEliminar={jest.fn()}
        onEditar={jest.fn()}
      />
    );

    expect(getByText("Técnicos: Carlos, Miguel")).toBeTruthy();
    expect(getByText("Técnicos: Sin asignar")).toBeTruthy();
  });

  test("ignora los ids que no corresponden a ningún técnico", async () => {
    const eventoConIdInexistente: Evento = {
      ...eventos[0],
      tecnicoIds: ["1", "99"],
    };

    const { getByText } = await render(
      <ListaEventos
        eventos={[eventoConIdInexistente]}
        tecnicos={tecnicos}
        procesando={false}
        onEliminar={jest.fn()}
        onEditar={jest.fn()}
      />
    );

    expect(getByText("Técnicos: Carlos")).toBeTruthy();
  });

  test("deshabilita Editar y Eliminar mientras procesa", async () => {
    const onEliminar = jest.fn();
    const onEditar = jest.fn();

    const { getAllByRole, getAllByText } = await render(
      <ListaEventos
        eventos={eventos}
        tecnicos={tecnicos}
        procesando={true}
        onEliminar={onEliminar}
        onEditar={onEditar}
      />
    );

    expect(getAllByRole("button", { name: "Editar", disabled: true })).toHaveLength(2);
    expect(getAllByRole("button", { name: "Eliminar", disabled: true })).toHaveLength(2);

    await fireEvent.press(getAllByText("Editar")[0]);
    await fireEvent.press(getAllByText("Eliminar")[0]);

    expect(onEditar).not.toHaveBeenCalled();
    expect(onEliminar).not.toHaveBeenCalled();
  });
});
