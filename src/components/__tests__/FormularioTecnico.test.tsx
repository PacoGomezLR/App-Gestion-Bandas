import { fireEvent, render } from "@testing-library/react-native";
import { FormularioTecnico } from "../FormularioTecnico";

describe("FormularioTecnico", () => {
  test("muestra los datos recibidos y envía las acciones mediante callbacks", async () => {
    const onCambiarNombre = jest.fn();
    const onGuardar = jest.fn();

    const { getByDisplayValue, getByText, queryByText } = await render(
      <FormularioTecnico
        nombre="Carlos"
        error="El nombre es obligatorio"
        editando={false}
        onCambiarNombre={onCambiarNombre}
        onGuardar={onGuardar}
        onCancelar={jest.fn()}
      />
    );

    expect(getByDisplayValue("Carlos")).toBeTruthy();
    expect(getByText("El nombre es obligatorio")).toBeTruthy();
    expect(queryByText("Cancelar")).toBeNull();

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
        onCancelar={jest.fn()}
      />
    );

    expect(getByText("Guardar cambios")).toBeTruthy();
    expect(queryByText("Guardar técnico")).toBeNull();
  });

  test("permite cancelar cuando está editando", async () => {
    const onCancelar = jest.fn();

    const { getByText } = await render(
      <FormularioTecnico
        nombre="Carlos"
        error=""
        editando={true}
        onCambiarNombre={jest.fn()}
        onGuardar={jest.fn()}
        onCancelar={onCancelar}
      />
    );

    expect(getByText("Cancelar")).toBeTruthy();

    await fireEvent.press(getByText("Cancelar"));

    expect(onCancelar).toHaveBeenCalledTimes(1);
  });
});
