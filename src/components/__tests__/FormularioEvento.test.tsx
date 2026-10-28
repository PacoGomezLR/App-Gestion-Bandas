import { fireEvent, render } from "@testing-library/react-native";
import type { Miembro } from "../../types/miembro";
import type { Tecnico } from "../../types/tecnico";
import { FormularioEvento } from "../FormularioEvento";

jest.mock("../CalendarioEventos", () => {
  const { Button, Text } = require("react-native");

  return {
    CalendarioEventos: ({
      fecha,
      onSeleccionarFecha,
    }: {
      fecha: string;
      onSeleccionarFecha: (fecha: string) => void;
    }) => (
      <>
        <Text>Fecha del calendario: {fecha}</Text>
        <Button
          title="Elegir día de prueba"
          onPress={() => onSeleccionarFecha("2026-12-24")}
        />
      </>
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
        miembros={[]}
        miembroIds={[]}
        error=""
        editando={false}
        procesando={false}
        onCambiarTitulo={jest.fn()}
        onCambiarTipo={jest.fn()}
        onCambiarEstado={jest.fn()}
        onSeleccionarFecha={jest.fn()}
        onAlternarTecnico={jest.fn()}
        onAlternarMiembro={jest.fn()}
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
        miembros={[]}
        miembroIds={[]}
        error=""
        editando={false}
        procesando={false}
        onCambiarTitulo={onCambiarTitulo}
        onCambiarTipo={onCambiarTipo}
        onCambiarEstado={onCambiarEstado}
        onSeleccionarFecha={jest.fn()}
        onAlternarTecnico={jest.fn()}
        onAlternarMiembro={jest.fn()}
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
        miembros={[]}
        miembroIds={[]}
        error="El título y la fecha son obligatorios"
        editando={false}
        procesando={false}
        onCambiarTitulo={jest.fn()}
        onCambiarTipo={jest.fn()}
        onCambiarEstado={jest.fn()}
        onSeleccionarFecha={jest.fn()}
        onAlternarTecnico={jest.fn()}
        onAlternarMiembro={jest.fn()}
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
        miembros={[]}
        miembroIds={[]}
        error=""
        editando={true}
        procesando={false}
        onCambiarTitulo={jest.fn()}
        onCambiarTipo={jest.fn()}
        onCambiarEstado={jest.fn()}
        onSeleccionarFecha={jest.fn()}
        onAlternarTecnico={jest.fn()}
        onAlternarMiembro={jest.fn()}
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
        miembros={[]}
        miembroIds={[]}
        error=""
        editando={true}
        procesando={false}
        onCambiarTitulo={jest.fn()}
        onCambiarTipo={jest.fn()}
        onCambiarEstado={jest.fn()}
        onSeleccionarFecha={jest.fn()}
        onAlternarTecnico={jest.fn()}
        onAlternarMiembro={jest.fn()}
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
        miembros={[]}
        miembroIds={[]}
        error=""
        editando={false}
        procesando={false}
        onCambiarTitulo={jest.fn()}
        onCambiarTipo={jest.fn()}
        onCambiarEstado={jest.fn()}
        onSeleccionarFecha={jest.fn()}
        onAlternarTecnico={onAlternarTecnico}
        onAlternarMiembro={jest.fn()}
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

  test("bloquea todos los controles mientras procesa", async () => {
    const onCambiarTitulo = jest.fn();
    const onCambiarTipo = jest.fn();
    const onCambiarEstado = jest.fn();
    const onSeleccionarFecha = jest.fn();
    const onAlternarTecnico = jest.fn();
    const onAlternarMiembro = jest.fn();
    const onGuardar = jest.fn();
    const onCancelar = jest.fn();

    const { getByPlaceholderText, getByRole, getByText } = await render(
      <FormularioEvento
        titulo="Ensayo general"
        tipo="ensayo"
        estado="pendiente"
        fecha="2026-10-02"
        fechasConEventos={[]}
        tecnicos={[{ id: "1", nombre: "Carlos" }]}
        tecnicoIds={[]}
        miembros={[{ id: "1", nombre: "Paco" }]}
        miembroIds={[]}
        error=""
        editando={true}
        procesando={true}
        onCambiarTitulo={onCambiarTitulo}
        onCambiarTipo={onCambiarTipo}
        onCambiarEstado={onCambiarEstado}
        onSeleccionarFecha={onSeleccionarFecha}
        onAlternarTecnico={onAlternarTecnico}
        onAlternarMiembro={onAlternarMiembro}
        onGuardar={onGuardar}
        onCancelar={onCancelar}
      />
    );

    expect(getByPlaceholderText("Título del evento").props.editable).toBe(false);

    for (const boton of [
      "Concierto",
      "Ensayo",
      "Reunión",
      "Otro",
      "Carlos",
      "Paco",
      "Guardar cambios",
      "Cancelar",
      "Pendiente",
      "Confirmado",
      "Cancelado",
    ]) {
      expect(getByRole("button", { name: boton, disabled: true })).toBeTruthy();
      await fireEvent.press(getByText(boton));
    }

    // El calendario no se deshabilita, pero la fecha elegida se ignora
    await fireEvent.press(getByText("Elegir día de prueba"));

    expect(onCambiarTipo).not.toHaveBeenCalled();
    expect(onCambiarEstado).not.toHaveBeenCalled();
    expect(onAlternarTecnico).not.toHaveBeenCalled();
    expect(onAlternarMiembro).not.toHaveBeenCalled();
    expect(onGuardar).not.toHaveBeenCalled();
    expect(onCancelar).not.toHaveBeenCalled();
    expect(onSeleccionarFecha).not.toHaveBeenCalled();
  });

  test("permite seleccionar miembros opcionalmente", async () => {
    const miembros: Miembro[] = [
      { id: "1", nombre: "Paco" },
      { id: "2", nombre: "Rafa" },
    ];
    const onAlternarMiembro = jest.fn();

    const { getByText, queryByText } = await render(
      <FormularioEvento
        titulo="Ensayo general"
        tipo="ensayo"
        estado="pendiente"
        fecha="2026-10-02"
        fechasConEventos={[]}
        tecnicos={[]}
        tecnicoIds={[]}
        miembros={miembros}
        miembroIds={["1"]}
        error=""
        editando={false}
        procesando={false}
        onCambiarTitulo={jest.fn()}
        onCambiarTipo={jest.fn()}
        onCambiarEstado={jest.fn()}
        onSeleccionarFecha={jest.fn()}
        onAlternarTecnico={jest.fn()}
        onAlternarMiembro={onAlternarMiembro}
        onGuardar={jest.fn()}
        onCancelar={jest.fn()}
      />
    );

    expect(getByText("Músicos que asistirán")).toBeTruthy();
    expect(getByText("Paco ✓")).toBeTruthy();
    expect(getByText("Rafa")).toBeTruthy();
    // Seleccionar miembros es opcional: no hay mensaje de obligatoriedad
    expect(queryByText(/al menos un miembro/i)).toBeNull();

    await fireEvent.press(getByText("Rafa"));

    expect(onAlternarMiembro).toHaveBeenCalledWith("2");

    await fireEvent.press(getByText("Paco ✓"));

    expect(onAlternarMiembro).toHaveBeenCalledWith("1");
    expect(onAlternarMiembro).toHaveBeenCalledTimes(2);
  });
});
