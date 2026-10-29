import { fireEvent, render } from "@testing-library/react-native";
import type { Miembro } from "../../types/miembro";
import { ListaMiembros } from "../ListaMiembros";

const miembros: Miembro[] = [
  { id: "1", nombre: "Ana" },
  { id: "2", nombre: "Bruno" },
];

describe("ListaMiembros", () => {
  test("muestra los miembros y avisa al pulsar Editar y Eliminar", async () => {
    const onEditar = jest.fn();
    const onEliminar = jest.fn();

    const { getByText, getAllByText } = await render(
      <ListaMiembros
        miembros={miembros}
        procesando={false}
        puedeEditar
        onEditar={onEditar}
        onEliminar={onEliminar}
      />
    );

    expect(getByText("Ana")).toBeTruthy();
    expect(getByText("Bruno")).toBeTruthy();

    await fireEvent.press(getAllByText("Editar")[1]);
    await fireEvent.press(getAllByText("Eliminar")[0]);

    expect(onEditar).toHaveBeenCalledWith(miembros[1]);
    expect(onEliminar).toHaveBeenCalledWith("1");
  });

  test("deshabilita Editar y Eliminar mientras procesa", async () => {
    const onEditar = jest.fn();
    const onEliminar = jest.fn();

    const { getAllByRole, getAllByText } = await render(
      <ListaMiembros
        miembros={miembros}
        procesando={true}
        puedeEditar
        onEditar={onEditar}
        onEliminar={onEliminar}
      />
    );

    expect(getAllByRole("button", { name: "Editar", disabled: true })).toHaveLength(2);
    expect(getAllByRole("button", { name: "Eliminar", disabled: true })).toHaveLength(2);

    await fireEvent.press(getAllByText("Editar")[0]);
    await fireEvent.press(getAllByText("Eliminar")[0]);

    expect(onEditar).not.toHaveBeenCalled();
    expect(onEliminar).not.toHaveBeenCalled();
  });

  test("sin permiso de edición muestra los nombres sin Editar ni Eliminar", async () => {
    const { getByText, queryByText } = await render(
      <ListaMiembros
        miembros={miembros}
        procesando={false}
        puedeEditar={false}
        onEditar={jest.fn()}
        onEliminar={jest.fn()}
      />
    );

    expect(getByText("Ana")).toBeTruthy();
    expect(getByText("Bruno")).toBeTruthy();
    expect(queryByText("Editar")).toBeNull();
    expect(queryByText("Eliminar")).toBeNull();
    expect(queryByText(/admin|usuario|solo lectura/i)).toBeNull();
  });
});
