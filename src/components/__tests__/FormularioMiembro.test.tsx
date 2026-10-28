import { fireEvent, render } from "@testing-library/react-native";
import { FormularioMiembro } from "../FormularioMiembro";

describe("FormularioMiembro", () => {
  test("muestra los datos, el error y envía las acciones mediante callbacks", async () => {
    const onCambiarNombre = jest.fn();
    const onGuardar = jest.fn();

    const { getByDisplayValue, getByText, queryByText } = await render(
      <FormularioMiembro
        nombre="Ana"
        error="El nombre es obligatorio"
        editando={false}
        procesando={false}
        onCambiarNombre={onCambiarNombre}
        onGuardar={onGuardar}
        onCancelar={jest.fn()}
      />
    );

    expect(getByDisplayValue("Ana")).toBeTruthy();
    expect(getByText("El nombre es obligatorio")).toBeTruthy();
    expect(queryByText("Cancelar")).toBeNull();

    await fireEvent.changeText(getByDisplayValue("Ana"), "Carla");
    await fireEvent.press(getByText("Guardar músico"));

    expect(onCambiarNombre).toHaveBeenCalledWith("Carla");
    expect(onGuardar).toHaveBeenCalledTimes(1);
  });

  test("en edición muestra Guardar cambios y permite cancelar", async () => {
    const onCancelar = jest.fn();

    const { getByText, queryByText } = await render(
      <FormularioMiembro
        nombre="Ana"
        error=""
        editando={true}
        procesando={false}
        onCambiarNombre={jest.fn()}
        onGuardar={jest.fn()}
        onCancelar={onCancelar}
      />
    );

    expect(getByText("Guardar cambios")).toBeTruthy();
    expect(queryByText("Guardar músico")).toBeNull();

    await fireEvent.press(getByText("Cancelar"));

    expect(onCancelar).toHaveBeenCalledTimes(1);
  });

  test("bloquea el formulario mientras procesa", async () => {
    const onGuardar = jest.fn();
    const onCancelar = jest.fn();

    const { getByPlaceholderText, getByRole, getByText } = await render(
      <FormularioMiembro
        nombre="Ana"
        error=""
        editando={true}
        procesando={true}
        onCambiarNombre={jest.fn()}
        onGuardar={onGuardar}
        onCancelar={onCancelar}
      />
    );

    expect(getByPlaceholderText("Nombre del músico").props.editable).toBe(false);
    expect(getByRole("button", { name: "Guardar cambios", disabled: true })).toBeTruthy();
    expect(getByRole("button", { name: "Cancelar", disabled: true })).toBeTruthy();

    await fireEvent.press(getByText("Guardar cambios"));
    await fireEvent.press(getByText("Cancelar"));

    expect(onGuardar).not.toHaveBeenCalled();
    expect(onCancelar).not.toHaveBeenCalled();
  });
});
