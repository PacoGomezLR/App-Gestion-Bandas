import { fireEvent, render } from "@testing-library/react-native";
import { FormularioTecnico } from "../FormularioTecnico";

describe("FormularioTecnico", () => {
  test("muestra los datos recibidos y envía las acciones mediante callbacks", async () => {
    const onCambiarNombre = jest.fn();
    const onGuardar = jest.fn();

    const { getByDisplayValue, getByText } = await render(
      <FormularioTecnico
        nombre="Carlos"
        error="El nombre es obligatorio"
        editando={false}
        onCambiarNombre={onCambiarNombre}
        onGuardar={onGuardar}
      />
    );

    expect(getByDisplayValue("Carlos")).toBeTruthy();
    expect(getByText("El nombre es obligatorio")).toBeTruthy();

    await fireEvent.changeText(getByDisplayValue("Carlos"), "Lucía");
    await fireEvent.press(getByText("Guardar técnico"));

    expect(onCambiarNombre).toHaveBeenCalledWith("Lucía");
    expect(onGuardar).toHaveBeenCalledTimes(1);
  });

  test("muestra Guardar cambios cuando está editando", async () => {
    const { getByText, queryByText } = await render(
      <FormularioTecnico
        nombre="Carlos"
        error=""
        editando={true}
        onCambiarNombre={jest.fn()}
        onGuardar={jest.fn()}
      />
    );

    expect(getByText("Guardar cambios")).toBeTruthy();
    expect(queryByText("Guardar técnico")).toBeNull();
  });
});
