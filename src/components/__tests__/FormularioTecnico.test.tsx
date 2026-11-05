import { fireEvent, render } from "@testing-library/react-native";
import { FormularioTecnico } from "../FormularioTecnico";

// constants/theme importa global.css, que Jest no puede interpretar
jest.mock("../../global.css", () => ({}));

describe("FormularioTecnico", () => {
  test("muestra los datos recibidos y envía las acciones mediante callbacks", async () => {
    const onCambiarNombre = jest.fn();
    const onGuardar = jest.fn();

    const { getByDisplayValue, getByText } = await render(
      <FormularioTecnico
        nombre="Carlos"
        error="El nombre es obligatorio"
        editando={false}
        procesando={false}
        onCambiarNombre={onCambiarNombre}
        onGuardar={onGuardar}
        onCancelar={jest.fn()}
      />
    );

    expect(getByDisplayValue("Carlos")).toBeTruthy();
    expect(getByText("El nombre es obligatorio")).toBeTruthy();
    expect(getByText("Nuevo técnico")).toBeTruthy();

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
        procesando={false}
        onCambiarNombre={jest.fn()}
        onGuardar={jest.fn()}
        onCancelar={jest.fn()}
      />
    );

    expect(getByText("Editar técnico")).toBeTruthy();
    expect(getByText("Guardar cambios")).toBeTruthy();
    expect(queryByText("Guardar técnico")).toBeNull();
  });

  test("permite cancelar también al crear", async () => {
    const onCancelar = jest.fn();

    const { getByText } = await render(
      <FormularioTecnico
        nombre=""
        error=""
        editando={false}
        procesando={false}
        onCambiarNombre={jest.fn()}
        onGuardar={jest.fn()}
        onCancelar={onCancelar}
      />
    );

    expect(getByText("Cancelar")).toBeTruthy();

    await fireEvent.press(getByText("Cancelar"));

    expect(onCancelar).toHaveBeenCalledTimes(1);
  });

  test("bloquea el formulario mientras procesa", async () => {
    const onGuardar = jest.fn();
    const onCancelar = jest.fn();

    const { getByLabelText, getByRole, getByText } = await render(
      <FormularioTecnico
        nombre="Carlos"
        error=""
        editando={true}
        procesando={true}
        onCambiarNombre={jest.fn()}
        onGuardar={onGuardar}
        onCancelar={onCancelar}
      />
    );

    expect(getByLabelText("Nombre del técnico").props.editable).toBe(false);
    expect(getByRole("button", { name: "Guardar cambios", disabled: true })).toBeTruthy();
    expect(getByRole("button", { name: "Cancelar", disabled: true })).toBeTruthy();

    await fireEvent.press(getByText("Guardar cambios"));
    await fireEvent.press(getByText("Cancelar"));

    expect(onGuardar).not.toHaveBeenCalled();
    expect(onCancelar).not.toHaveBeenCalled();
  });
});
