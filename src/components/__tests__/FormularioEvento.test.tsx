import { fireEvent, render } from "@testing-library/react-native";
import { FormularioEvento } from "../FormularioEvento";

jest.mock("../CalendarioEventos", () => {
  const { Text } = require("react-native");

  return {
    CalendarioEventos: ({ fecha }: { fecha: string }) => (
      <Text>Fecha del calendario: {fecha}</Text>
    ),
  };
});

describe("FormularioEvento", () => {
  test("muestra los valores recibidos por props", () => {
    const { getByDisplayValue, getByText, queryByText } = render(
      <FormularioEvento
        titulo="Concierto en Málaga"
        tipo="concierto"
        estado="confirmado"
        fecha="2026-12-20"
        error=""
        editando={false}
        onCambiarTitulo={jest.fn()}
        onCambiarTipo={jest.fn()}
        onCambiarEstado={jest.fn()}
        onSeleccionarFecha={jest.fn()}
        onGuardar={jest.fn()}
      />
    );

    expect(getByDisplayValue("Concierto en Málaga")).toBeTruthy();
    expect(getByText("Tipo de evento: concierto")).toBeTruthy();
    expect(getByText("Estado: confirmado")).toBeTruthy();
    expect(getByText("Fecha del calendario: 2026-12-20")).toBeTruthy();

    expect(getByText("Guardar evento")).toBeTruthy();
    expect(queryByText("Guardar cambios")).toBeNull();
  });

  test("envía las acciones del formulario mediante callbacks", () => {
    const onCambiarTitulo = jest.fn();
    const onCambiarTipo = jest.fn();
    const onCambiarEstado = jest.fn();
    const onGuardar = jest.fn();

    const { getByDisplayValue, getByText } = render(
      <FormularioEvento
        titulo="Concierto inicial"
        tipo="concierto"
        estado="pendiente"
        fecha="2026-12-20"
        error=""
        editando={false}
        onCambiarTitulo={onCambiarTitulo}
        onCambiarTipo={onCambiarTipo}
        onCambiarEstado={onCambiarEstado}
        onSeleccionarFecha={jest.fn()}
        onGuardar={onGuardar}
      />
    );

    fireEvent.changeText(
      getByDisplayValue("Concierto inicial"),
      "Ensayo del viernes"
    );

    fireEvent.press(getByText("Ensayo"));
    fireEvent.press(getByText("Cancelado"));
    fireEvent.press(getByText("Guardar evento"));

    expect(onCambiarTitulo).toHaveBeenCalledWith("Ensayo del viernes");
    expect(onCambiarTipo).toHaveBeenCalledWith("ensayo");
    expect(onCambiarEstado).toHaveBeenCalledWith("cancelado");
    expect(onGuardar).toHaveBeenCalledTimes(1);
  });

  test("muestra el mensaje de error", () => {
    const { getByText } = render(
      <FormularioEvento
        titulo=""
        tipo="concierto"
        estado="pendiente"
        fecha=""
        error="El título y la fecha son obligatorios"
        editando={false}
        onCambiarTitulo={jest.fn()}
        onCambiarTipo={jest.fn()}
        onCambiarEstado={jest.fn()}
        onSeleccionarFecha={jest.fn()}
        onGuardar={jest.fn()}
      />
    );

    expect(
      getByText("El título y la fecha son obligatorios")
    ).toBeTruthy();
  });

  test("muestra Guardar cambios cuando está editando", () => {
    const { getByText, queryByText } = render(
      <FormularioEvento
        titulo="Ensayo general"
        tipo="ensayo"
        estado="pendiente"
        fecha="2026-10-02"
        error=""
        editando={true}
        onCambiarTitulo={jest.fn()}
        onCambiarTipo={jest.fn()}
        onCambiarEstado={jest.fn()}
        onSeleccionarFecha={jest.fn()}
        onGuardar={jest.fn()}
      />
    );

    expect(getByText("Guardar cambios")).toBeTruthy();
    expect(queryByText("Guardar evento")).toBeNull();
  });
});
