import { fireEvent, render } from "@testing-library/react-native";
import type { Tecnico } from "../../types/tecnico";
import { ListaTecnicos } from "../ListaTecnicos";

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

describe("ListaTecnicos", () => {
  test("muestra los técnicos recibidos", async () => {
    const { getByText } = await render(
      <ListaTecnicos
        tecnicos={tecnicos}
        onEditar={jest.fn()}
        onEliminar={jest.fn()}
      />
    );

    expect(getByText("Carlos")).toBeTruthy();
    expect(getByText("Miguel")).toBeTruthy();
  });

  test("llama a onEditar con el técnico correcto", async () => {
    const onEditar = jest.fn();

    const { getAllByText } = await render(
      <ListaTecnicos
        tecnicos={tecnicos}
        onEditar={onEditar}
        onEliminar={jest.fn()}
      />
    );

    await fireEvent.press(getAllByText("Editar")[1]);

    expect(onEditar).toHaveBeenCalledTimes(1);
    expect(onEditar).toHaveBeenCalledWith(tecnicos[1]);
  });

  test("llama a onEliminar con el id correcto", async () => {
    const onEliminar = jest.fn();

    const { getAllByText } = await render(
      <ListaTecnicos
        tecnicos={tecnicos}
        onEditar={jest.fn()}
        onEliminar={onEliminar}
      />
    );

    await fireEvent.press(getAllByText("Eliminar")[0]);

    expect(onEliminar).toHaveBeenCalledTimes(1);
    expect(onEliminar).toHaveBeenCalledWith("1");
  });
});
