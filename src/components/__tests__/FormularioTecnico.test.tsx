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
});
