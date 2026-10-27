import { fireEvent, render } from "@testing-library/react-native";
import type { Tecnico } from "../../types/tecnico";
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
  test("muestra los valores recibidos por props", async () => {
    const { getByDisplayValue, getByText, queryByText } = await render(
      <FormularioEvento
        titulo="Concierto en Málaga"
        tipo="concierto"
        estado="confirmado"
        fecha="2026-12-20"
        fechasConEventos={[]}
        tecnicos={[]}
        tecnicoIds={[]}
        error=""
        editando={false}
        onCambiarTitulo={jest.fn()}
        onCambiarTipo={jest.fn()}
        onCambiarEstado={jest.fn()}
        onSeleccionarFecha={jest.fn()}
        onAlternarTecnico={jest.fn()}
        onGuardar={jest.fn()}
        onCancelar={jest.fn()}
      />
    );

    expect(getByDisplayValue("Concierto en Málaga")).toBeTruthy();
    expect(getByText("Tipo de evento: concierto")).toBeTruthy();
    expect(getByText("Estado: confirmado")).toBeTruthy();
    expect(getByText("Fecha del calendario: 2026-12-20")).toBeTruthy();

    expect(getByText("Guardar evento")).toBeTruthy();
    expect(queryByText("Guardar cambios")).toBeNull();
    expect(queryByText("Cancelar")).toBeNull();
  });

  test("envía las acciones del formulario mediante callbacks", async () => {
    const onCambiarTitulo = jest.fn();
    const onCambiarTipo = jest.fn();
    const onCambiarEstado = jest.fn();
    const onGuardar = jest.fn();

    const { getByDisplayValue, getByText } = await render(
      <FormularioEvento
        titulo="Concierto inicial"
        tipo="concierto"
        estado="pendiente"
        fecha="2026-12-20"
        fechasConEventos={[]}
        tecnicos={[]}
        tecnicoIds={[]}
        error=""
        editando={false}
        onCambiarTitulo={onCambiarTitulo}
        onCambiarTipo={onCambiarTipo}
        onCambiarEstado={onCambiarEstado}
        onSeleccionarFecha={jest.fn()}
        onAlternarTecnico={jest.fn()}
        onGuardar={onGuardar}
        onCancelar={jest.fn()}
      />
    );

    await fireEvent.changeText(
      getByDisplayValue("Concierto inicial"),
      "Ensayo del viernes"
    );

    await fireEvent.press(getByText("Ensayo"));
    await fireEvent.press(getByText("Cancelado"));
    await fireEvent.press(getByText("Guardar evento"));

    expect(onCambiarTitulo).toHaveBeenCalledWith("Ensayo del viernes");
    expect(onCambiarTipo).toHaveBeenCalledWith("ensayo");
    expect(onCambiarEstado).toHaveBeenCalledWith("cancelado");
    expect(onGuardar).toHaveBeenCalledTimes(1);
  });

  test("muestra el mensaje de error", async () => {
    const { getByText } = await render(
      <FormularioEvento
        titulo=""
        tipo="concierto"
        estado="pendiente"
        fecha=""
        fechasConEventos={[]}
        tecnicos={[]}
        tecnicoIds={[]}
        error="El título y la fecha son obligatorios"
        editando={false}
        onCambiarTitulo={jest.fn()}
        onCambiarTipo={jest.fn()}
        onCambiarEstado={jest.fn()}
        onSeleccionarFecha={jest.fn()}
        onAlternarTecnico={jest.fn()}
        onGuardar={jest.fn()}
        onCancelar={jest.fn()}
      />
    );

    expect(
      getByText("El título y la fecha son obligatorios")
    ).toBeTruthy();
  });

  test("muestra Guardar cambios cuando está editando", async () => {
    const { getByText, queryByText } = await render(
      <FormularioEvento
        titulo="Ensayo general"
        tipo="ensayo"
        estado="pendiente"
        fecha="2026-10-02"
        fechasConEventos={[]}
        tecnicos={[]}
        tecnicoIds={[]}
        error=""
        editando={true}
        onCambiarTitulo={jest.fn()}
        onCambiarTipo={jest.fn()}
        onCambiarEstado={jest.fn()}
        onSeleccionarFecha={jest.fn()}
        onAlternarTecnico={jest.fn()}
        onGuardar={jest.fn()}
        onCancelar={jest.fn()}
      />
    );

    expect(getByText("Guardar cambios")).toBeTruthy();
    expect(queryByText("Guardar evento")).toBeNull();
  });

  test("permite cancelar cuando está editando", async () => {
    const onCancelar = jest.fn();

    const { getByText } = await render(
      <FormularioEvento
        titulo="Ensayo general"
        tipo="ensayo"
        estado="pendiente"
        fecha="2026-10-02"
        fechasConEventos={[]}
        tecnicos={[]}
        tecnicoIds={[]}
        error=""
        editando={true}
        onCambiarTitulo={jest.fn()}
        onCambiarTipo={jest.fn()}
        onCambiarEstado={jest.fn()}
        onSeleccionarFecha={jest.fn()}
        onAlternarTecnico={jest.fn()}
        onGuardar={jest.fn()}
        onCancelar={onCancelar}
      />
    );

    expect(getByText("Cancelar")).toBeTruthy();

    await fireEvent.press(getByText("Cancelar"));

    expect(onCancelar).toHaveBeenCalledTimes(1);
  });

  test("permite seleccionar y deseleccionar técnicos", async () => {
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
    const onAlternarTecnico = jest.fn();

    const { getByText } = await render(
      <FormularioEvento
        titulo="Ensayo general"
        tipo="ensayo"
        estado="pendiente"
        fecha="2026-10-02"
        fechasConEventos={[]}
        tecnicos={tecnicos}
        tecnicoIds={["1"]}
        error=""
        editando={false}
        onCambiarTitulo={jest.fn()}
        onCambiarTipo={jest.fn()}
        onCambiarEstado={jest.fn()}
        onSeleccionarFecha={jest.fn()}
        onAlternarTecnico={onAlternarTecnico}
        onGuardar={jest.fn()}
        onCancelar={jest.fn()}
      />
    );

    expect(getByText("Técnicos asignados")).toBeTruthy();
    expect(getByText("Carlos ✓")).toBeTruthy();
    expect(getByText("Miguel")).toBeTruthy();

    await fireEvent.press(getByText("Miguel"));

    expect(onAlternarTecnico).toHaveBeenCalledWith("2");

    await fireEvent.press(getByText("Carlos ✓"));

    expect(onAlternarTecnico).toHaveBeenCalledWith("1");
    expect(onAlternarTecnico).toHaveBeenCalledTimes(2);
  });
});
