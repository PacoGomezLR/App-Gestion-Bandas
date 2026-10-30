import { fireEvent, render } from "@testing-library/react-native";
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
    const { getByText, queryByPlaceholderText, queryByText } = await render(
      <FormularioEvento
        tipo="concierto_abierto"
        estado="confirmado"
        fecha="2026-12-20"
        hora=""
        lugar=""
        notas=""
        fechasConEventos={[]}
        tecnicos={[]}
        tecnicoIds={[]}
        error=""
        editando={false}
        procesando={false}
        onCambiarTipo={jest.fn()}
        onCambiarEstado={jest.fn()}
        onSeleccionarFecha={jest.fn()}
        onCambiarHora={jest.fn()}
        onCambiarLugar={jest.fn()}
        onCambiarNotas={jest.fn()}
        onAlternarTecnico={jest.fn()}
        onGuardar={jest.fn()}
        onCancelar={jest.fn()}
      />
    );

    // El título se genera solo: no hay campo para escribirlo
    expect(queryByPlaceholderText("Título del evento")).toBeNull();
    expect(getByText("Tipo de evento: Concierto abierto")).toBeTruthy();
    expect(getByText("Estado: Confirmado")).toBeTruthy();
    expect(getByText("Fecha del calendario: 2026-12-20")).toBeTruthy();

    expect(getByText("Guardar evento")).toBeTruthy();
    expect(queryByText("Guardar cambios")).toBeNull();
    expect(queryByText("Cancelar")).toBeNull();
  });

  test("envía las acciones del formulario mediante callbacks", async () => {
    const onCambiarTipo = jest.fn();
    const onCambiarEstado = jest.fn();
    const onGuardar = jest.fn();

    const { getByText, queryByText } = await render(
      <FormularioEvento
        tipo="concierto_abierto"
        estado="pendiente"
        fecha="2026-12-20"
        hora=""
        lugar=""
        notas=""
        fechasConEventos={[]}
        tecnicos={[]}
        tecnicoIds={[]}
        error=""
        editando={false}
        procesando={false}
        onCambiarTipo={onCambiarTipo}
        onCambiarEstado={onCambiarEstado}
        onSeleccionarFecha={jest.fn()}
        onCambiarHora={jest.fn()}
        onCambiarLugar={jest.fn()}
        onCambiarNotas={jest.fn()}
        onAlternarTecnico={jest.fn()}
        onGuardar={onGuardar}
        onCancelar={jest.fn()}
      />
    );

    await fireEvent.press(getByText("Ensayo"));
    await fireEvent.press(getByText("Confirmado"));
    await fireEvent.press(getByText("Guardar evento"));

    expect(onCambiarTipo).toHaveBeenCalledWith("ensayo");
    expect(onCambiarEstado).toHaveBeenCalledWith("confirmado");
    expect(onGuardar).toHaveBeenCalledTimes(1);

    await fireEvent.press(getByText("Pendiente"));

    expect(onCambiarEstado).toHaveBeenLastCalledWith("pendiente");
    expect(onCambiarEstado).toHaveBeenCalledTimes(2);
    // Un evento cancelado se elimina: ya no existe esa opción
    expect(queryByText("Cancelado")).toBeNull();
  });

  test("muestra el mensaje de error", async () => {
    const { getByText } = await render(
      <FormularioEvento
        tipo="concierto_abierto"
        estado="pendiente"
        fecha=""
        hora=""
        lugar=""
        notas=""
        fechasConEventos={[]}
        tecnicos={[]}
        tecnicoIds={[]}
        error="La fecha es obligatoria"
        editando={false}
        procesando={false}
        onCambiarTipo={jest.fn()}
        onCambiarEstado={jest.fn()}
        onSeleccionarFecha={jest.fn()}
        onCambiarHora={jest.fn()}
        onCambiarLugar={jest.fn()}
        onCambiarNotas={jest.fn()}
        onAlternarTecnico={jest.fn()}
        onGuardar={jest.fn()}
        onCancelar={jest.fn()}
      />
    );

    expect(
      getByText("La fecha es obligatoria")
    ).toBeTruthy();
  });

  test("muestra Guardar cambios cuando está editando", async () => {
    const { getByText, queryByText } = await render(
      <FormularioEvento
        tipo="ensayo"
        estado="pendiente"
        fecha="2026-10-02"
        hora=""
        lugar=""
        notas=""
        fechasConEventos={[]}
        tecnicos={[]}
        tecnicoIds={[]}
        error=""
        editando={true}
        procesando={false}
        onCambiarTipo={jest.fn()}
        onCambiarEstado={jest.fn()}
        onSeleccionarFecha={jest.fn()}
        onCambiarHora={jest.fn()}
        onCambiarLugar={jest.fn()}
        onCambiarNotas={jest.fn()}
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
        tipo="ensayo"
        estado="pendiente"
        fecha="2026-10-02"
        hora=""
        lugar=""
        notas=""
        fechasConEventos={[]}
        tecnicos={[]}
        tecnicoIds={[]}
        error=""
        editando={true}
        procesando={false}
        onCambiarTipo={jest.fn()}
        onCambiarEstado={jest.fn()}
        onSeleccionarFecha={jest.fn()}
        onCambiarHora={jest.fn()}
        onCambiarLugar={jest.fn()}
        onCambiarNotas={jest.fn()}
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
        tipo="ensayo"
        estado="pendiente"
        fecha="2026-10-02"
        hora=""
        lugar=""
        notas=""
        fechasConEventos={[]}
        tecnicos={tecnicos}
        tecnicoIds={["1"]}
        error=""
        editando={false}
        procesando={false}
        onCambiarTipo={jest.fn()}
        onCambiarEstado={jest.fn()}
        onSeleccionarFecha={jest.fn()}
        onCambiarHora={jest.fn()}
        onCambiarLugar={jest.fn()}
        onCambiarNotas={jest.fn()}
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

  test("bloquea todos los controles mientras procesa", async () => {
    const onCambiarTipo = jest.fn();
    const onCambiarEstado = jest.fn();
    const onSeleccionarFecha = jest.fn();
    const onAlternarTecnico = jest.fn();
    const onGuardar = jest.fn();
    const onCancelar = jest.fn();

    const { getByPlaceholderText, getByRole, getByText } = await render(
      <FormularioEvento
        tipo="ensayo"
        estado="pendiente"
        fecha="2026-10-02"
        hora=""
        lugar=""
        notas=""
        fechasConEventos={[]}
        tecnicos={[{ id: "1", nombre: "Carlos" }]}
        tecnicoIds={[]}
        error=""
        editando={true}
        procesando={true}
        onCambiarTipo={onCambiarTipo}
        onCambiarEstado={onCambiarEstado}
        onSeleccionarFecha={onSeleccionarFecha}
        onCambiarHora={jest.fn()}
        onCambiarLugar={jest.fn()}
        onCambiarNotas={jest.fn()}
        onAlternarTecnico={onAlternarTecnico}
        onGuardar={onGuardar}
        onCancelar={onCancelar}
      />
    );

    expect(getByPlaceholderText("Lugar").props.editable).toBe(false);
    expect(getByPlaceholderText("Notas").props.editable).toBe(false);

    for (const boton of [
      "Boda",
      "Fiesta privada",
      "Concierto abierto",
      "Ensayo",
      "Otro",
      "Carlos",
      "Guardar cambios",
      "Cancelar",
      "Pendiente",
      "Confirmado",
    ]) {
      expect(getByRole("button", { name: boton, disabled: true })).toBeTruthy();
      await fireEvent.press(getByText(boton));
    }

    // El selector de hora tampoco se puede abrir
    expect(getByRole("button", { name: "Elegir hora", disabled: true })).toBeTruthy();

    // El calendario no se deshabilita, pero la fecha elegida se ignora
    await fireEvent.press(getByText("Elegir día de prueba"));

    expect(onCambiarTipo).not.toHaveBeenCalled();
    expect(onCambiarEstado).not.toHaveBeenCalled();
    expect(onAlternarTecnico).not.toHaveBeenCalled();
    expect(onGuardar).not.toHaveBeenCalled();
    expect(onCancelar).not.toHaveBeenCalled();
    expect(onSeleccionarFecha).not.toHaveBeenCalled();
  });

  test("no muestra ningún selector de músicos", async () => {
    const { getAllByRole, queryByText } = await render(
      <FormularioEvento
        tipo="ensayo"
        estado="pendiente"
        fecha="2026-10-02"
        hora=""
        lugar=""
        notas=""
        fechasConEventos={[]}
        tecnicos={[{ id: "1", nombre: "Carlos" }]}
        tecnicoIds={[]}
        error=""
        editando={false}
        procesando={false}
        onCambiarTipo={jest.fn()}
        onCambiarEstado={jest.fn()}
        onSeleccionarFecha={jest.fn()}
        onCambiarHora={jest.fn()}
        onCambiarLugar={jest.fn()}
        onCambiarNotas={jest.fn()}
        onAlternarTecnico={jest.fn()}
        onGuardar={jest.fn()}
        onCancelar={jest.fn()}
      />
    );

    expect(queryByText("Músicos que asistirán")).toBeNull();
    // Ni etiqueta ni botones de músicos: el único seleccionable de personas es el técnico
    expect(queryByText(/músic|miembro/i)).toBeNull();
    expect(getAllByRole("button", { name: "Carlos" })).toHaveLength(1);
  });

  test("muestra la hora con el selector y permite introducir lugar y notas", async () => {
    const onCambiarHora = jest.fn();
    const onCambiarLugar = jest.fn();
    const onCambiarNotas = jest.fn();

    const { getByPlaceholderText, getByText, queryByPlaceholderText } = await render(
      <FormularioEvento
        tipo="concierto_abierto"
        estado="pendiente"
        fecha="2026-12-20"
        hora="20:30"
        lugar=""
        notas=""
        fechasConEventos={[]}
        tecnicos={[]}
        tecnicoIds={[]}
        error=""
        editando={false}
        procesando={false}
        onCambiarTipo={jest.fn()}
        onCambiarEstado={jest.fn()}
        onSeleccionarFecha={jest.fn()}
        onCambiarHora={onCambiarHora}
        onCambiarLugar={onCambiarLugar}
        onCambiarNotas={onCambiarNotas}
        onAlternarTecnico={jest.fn()}
        onGuardar={jest.fn()}
        onCancelar={jest.fn()}
      />
    );

    // La hora ya no se escribe: la elige SelectorHora (cubierto en sus tests)
    expect(queryByPlaceholderText("Hora (HH:MM)")).toBeNull();
    expect(getByText("20:30")).toBeTruthy();
    await fireEvent.press(getByText("Quitar hora"));

    await fireEvent.changeText(getByPlaceholderText("Lugar"), "Sala Principal");
    await fireEvent.changeText(getByPlaceholderText("Notas"), "Prueba a las 18:00");

    expect(onCambiarHora).toHaveBeenCalledWith("");
    expect(onCambiarLugar).toHaveBeenCalledWith("Sala Principal");
    expect(onCambiarNotas).toHaveBeenCalledWith("Prueba a las 18:00");
    expect(getByPlaceholderText("Notas").props.multiline).toBe(true);
  });

  test("muestra los tipos de evento y envía su valor interno", async () => {
    const onCambiarTipo = jest.fn();

    const { getByText, queryByText } = await render(
      <FormularioEvento
        tipo="fiesta_privada"
        estado="pendiente"
        fecha=""
        hora=""
        lugar=""
        notas=""
        fechasConEventos={[]}
        tecnicos={[]}
        tecnicoIds={[]}
        error=""
        editando={false}
        procesando={false}
        onCambiarTipo={onCambiarTipo}
        onCambiarEstado={jest.fn()}
        onSeleccionarFecha={jest.fn()}
        onCambiarHora={jest.fn()}
        onCambiarLugar={jest.fn()}
        onCambiarNotas={jest.fn()}
        onAlternarTecnico={jest.fn()}
        onGuardar={jest.fn()}
        onCancelar={jest.fn()}
      />
    );

    // El tipo actual se muestra con su etiqueta, no con el valor interno
    expect(getByText("Tipo de evento: Fiesta privada")).toBeTruthy();

    const opciones = [
      ["Boda", "boda"],
      ["Fiesta privada", "fiesta_privada"],
      ["Concierto abierto", "concierto_abierto"],
      ["Ensayo", "ensayo"],
      ["Otro", "otro"],
    ] as const;

    for (const [etiqueta, valor] of opciones) {
      await fireEvent.press(getByText(etiqueta));
      expect(onCambiarTipo).toHaveBeenLastCalledWith(valor);
    }

    expect(onCambiarTipo).toHaveBeenCalledTimes(5);
    // Las opciones antiguas ya no existen
    expect(queryByText("Concierto")).toBeNull();
    expect(queryByText("Reunión")).toBeNull();
  });

  test("muestra los campos en el orden fecha, tipo, lugar, hora, técnico, estado, notas y guardar", async () => {
    const { toJSON } = await render(
      <FormularioEvento
        tipo="ensayo"
        estado="pendiente"
        fecha="2026-10-29"
        hora=""
        lugar=""
        notas=""
        fechasConEventos={[]}
        tecnicos={[{ id: "1", nombre: "Carlos" }]}
        tecnicoIds={[]}
        error=""
        editando={false}
        procesando={false}
        onCambiarTipo={jest.fn()}
        onCambiarEstado={jest.fn()}
        onSeleccionarFecha={jest.fn()}
        onCambiarHora={jest.fn()}
        onCambiarLugar={jest.fn()}
        onCambiarNotas={jest.fn()}
        onAlternarTecnico={jest.fn()}
        onGuardar={jest.fn()}
        onCancelar={jest.fn()}
      />
    );

    const texto = JSON.stringify(toJSON());
    const posiciones = [
      "Fecha del calendario",
      "Tipo de evento",
      "Lugar",
      "Elegir hora",
      "Técnicos asignados",
      "Estado: ",
      "Notas",
      "Guardar evento",
    ].map((marca) => texto.indexOf(marca));

    expect(posiciones.every((posicion) => posicion >= 0)).toBe(true);
    expect([...posiciones].sort((a, b) => a - b)).toEqual(posiciones);
    expect(texto).not.toContain("Músicos que asistirán");
  });
});
