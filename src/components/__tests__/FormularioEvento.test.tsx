import { fireEvent, render, screen } from "@testing-library/react-native";
import { type StyleProp, StyleSheet, type ViewStyle } from "react-native";

import { Colors } from "../../constants/theme";
import type { Tecnico } from "../../types/tecnico";
import { FormularioEvento } from "../FormularioEvento";

// constants/theme importa global.css, que Jest no puede interpretar
jest.mock("../../global.css", () => ({}));

describe("FormularioEvento", () => {
  test("muestra los valores recibidos por props", async () => {
    const { getByLabelText, getByRole, getByText, queryByPlaceholderText, queryByText } = await render(
      <FormularioEvento
        tipo={null}
        estado="confirmado"
        fecha="2026-12-20"
        hora=""
        lugar=""
        notas=""
        tecnicos={[]}
        tecnicoIds={[]}
        error=""
        editando={false}
        procesando={false}
        onCambiarTipo={jest.fn()}
        onCambiarEstado={jest.fn()}
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
    expect(getByRole("button", { name: "Tipo de evento: Selecciona un tipo" })).toBeTruthy();
    expect(getByRole("radio", { name: "Confirmado" }).props.accessibilityState.checked).toBe(true);
    // La fecha es la del día elegido en el calendario de la pantalla
    expect(getByLabelText("Fecha: 20-12-2026")).toBeTruthy();

    expect(getByText("Guardar evento")).toBeTruthy();
    expect(queryByText("Guardar cambios")).toBeNull();
    // Crear también se puede cancelar: cierra el formulario
    expect(getByText("Cancelar")).toBeTruthy();
  });

  test("envía las acciones del formulario mediante callbacks", async () => {
    const onCambiarTipo = jest.fn();
    const onCambiarEstado = jest.fn();
    const onGuardar = jest.fn();

    const { getByText, queryByText } = await render(
      <FormularioEvento
        tipo={null}
        estado="pendiente"
        fecha="2026-12-20"
        hora=""
        lugar=""
        notas=""
        tecnicos={[]}
        tecnicoIds={[]}
        error=""
        editando={false}
        procesando={false}
        onCambiarTipo={onCambiarTipo}
        onCambiarEstado={onCambiarEstado}
        onCambiarHora={jest.fn()}
        onCambiarLugar={jest.fn()}
        onCambiarNotas={jest.fn()}
        onAlternarTecnico={jest.fn()}
        onGuardar={onGuardar}
        onCancelar={jest.fn()}
      />
    );

    await fireEvent.press(getByText("Selecciona un tipo"));
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
        tecnicos={[]}
        tecnicoIds={[]}
        error="La fecha es obligatoria"
        editando={false}
        procesando={false}
        onCambiarTipo={jest.fn()}
        onCambiarEstado={jest.fn()}
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
        tecnicos={[]}
        tecnicoIds={[]}
        error=""
        editando={true}
        procesando={false}
        onCambiarTipo={jest.fn()}
        onCambiarEstado={jest.fn()}
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

  test("Cancelar llama a onCancelar", async () => {
    const onCancelar = jest.fn();

    const { getByText } = await render(
      <FormularioEvento
        tipo="ensayo"
        estado="pendiente"
        fecha="2026-10-02"
        hora=""
        lugar=""
        notas=""
        tecnicos={[]}
        tecnicoIds={[]}
        error=""
        editando={true}
        procesando={false}
        onCambiarTipo={jest.fn()}
        onCambiarEstado={jest.fn()}
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
        tecnicos={tecnicos}
        tecnicoIds={["1"]}
        error=""
        editando={false}
        procesando={false}
        onCambiarTipo={jest.fn()}
        onCambiarEstado={jest.fn()}
        onCambiarHora={jest.fn()}
        onCambiarLugar={jest.fn()}
        onCambiarNotas={jest.fn()}
        onAlternarTecnico={onAlternarTecnico}
        onGuardar={jest.fn()}
        onCancelar={jest.fn()}
      />
    );

    expect(getByText("Técnicos")).toBeTruthy();
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
    const onAlternarTecnico = jest.fn();
    const onGuardar = jest.fn();
    const onCancelar = jest.fn();

    const { getByLabelText, getByRole, queryByText } = await render(
      <FormularioEvento
        tipo="ensayo"
        estado="pendiente"
        fecha="2026-10-02"
        hora=""
        lugar=""
        notas=""
        tecnicos={[{ id: "1", nombre: "Carlos" }]}
        tecnicoIds={[]}
        error=""
        editando={true}
        procesando={true}
        onCambiarTipo={onCambiarTipo}
        onCambiarEstado={onCambiarEstado}
        onCambiarHora={jest.fn()}
        onCambiarLugar={jest.fn()}
        onCambiarNotas={jest.fn()}
        onAlternarTecnico={onAlternarTecnico}
        onGuardar={onGuardar}
        onCancelar={onCancelar}
      />
    );

    expect(getByLabelText("Lugar").props.editable).toBe(false);
    expect(getByLabelText("Notas").props.editable).toBe(false);

    for (const [rol, nombre] of [
      ["button", "Tipo de evento: Ensayo"],
      ["checkbox", "Carlos"],
      ["button", "Guardar cambios"],
      ["button", "Cancelar"],
      ["radio", "Pendiente"],
      ["radio", "Confirmado"],
    ] as const) {
      const control = getByRole(rol, { name: nombre, disabled: true });

      expect(control).toBeTruthy();
      await fireEvent.press(control);
    }

    // Bloqueado, el desplegable no llega a abrirse
    expect(queryByText("Boda")).toBeNull();

    // El selector de hora tampoco se puede abrir
    expect(getByRole("button", { name: "Elegir hora", disabled: true })).toBeTruthy();


    expect(onCambiarTipo).not.toHaveBeenCalled();
    expect(onCambiarEstado).not.toHaveBeenCalled();
    expect(onAlternarTecnico).not.toHaveBeenCalled();
    expect(onGuardar).not.toHaveBeenCalled();
    expect(onCancelar).not.toHaveBeenCalled();
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
        tecnicos={[{ id: "1", nombre: "Carlos" }]}
        tecnicoIds={[]}
        error=""
        editando={false}
        procesando={false}
        onCambiarTipo={jest.fn()}
        onCambiarEstado={jest.fn()}
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
    expect(getAllByRole("checkbox", { name: "Carlos" })).toHaveLength(1);
  });

  test("muestra la hora con el selector y permite introducir lugar y notas", async () => {
    const onCambiarHora = jest.fn();
    const onCambiarLugar = jest.fn();
    const onCambiarNotas = jest.fn();

    const { getByLabelText, getByText, queryByPlaceholderText } = await render(
      <FormularioEvento
        tipo="concierto_abierto"
        estado="pendiente"
        fecha="2026-12-20"
        hora="20:30"
        lugar=""
        notas=""
        tecnicos={[]}
        tecnicoIds={[]}
        error=""
        editando={false}
        procesando={false}
        onCambiarTipo={jest.fn()}
        onCambiarEstado={jest.fn()}
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

    await fireEvent.changeText(getByLabelText("Lugar"), "Sala Principal");
    await fireEvent.changeText(getByLabelText("Notas"), "Prueba a las 18:00");

    expect(onCambiarHora).toHaveBeenCalledWith("");
    expect(onCambiarLugar).toHaveBeenCalledWith("Sala Principal");
    expect(onCambiarNotas).toHaveBeenCalledWith("Prueba a las 18:00");
    expect(getByLabelText("Notas").props.multiline).toBe(true);
  });

  test("muestra los tipos de evento y envía su valor interno", async () => {
    const onCambiarTipo = jest.fn();

    const { getByText, queryByText } = await render(
      <FormularioEvento
        tipo={null}
        estado="pendiente"
        fecha=""
        hora=""
        lugar=""
        notas=""
        tecnicos={[]}
        tecnicoIds={[]}
        error=""
        editando={false}
        procesando={false}
        onCambiarTipo={onCambiarTipo}
        onCambiarEstado={jest.fn()}
        onCambiarHora={jest.fn()}
        onCambiarLugar={jest.fn()}
        onCambiarNotas={jest.fn()}
        onAlternarTecnico={jest.fn()}
        onGuardar={jest.fn()}
        onCancelar={jest.fn()}
      />
    );

    // Sin elegir todavía, ninguna opción aparece como elegida
    await fireEvent.press(getByText("Selecciona un tipo"));
    expect(screen.getByRole("radio", { name: "Fiesta privada" }).props.accessibilityState.checked).toBe(false);
    await fireEvent.press(getByText("Selecciona un tipo"));

    const opciones = [
      ["Boda", "boda"],
      ["Fiesta privada", "fiesta_privada"],
      ["Concierto abierto", "concierto_abierto"],
      ["Ensayo", "ensayo"],
      ["Otro", "otro"],
    ] as const;

    for (const [etiqueta, valor] of opciones) {
      await fireEvent.press(screen.getByRole("button", { name: /^Tipo de evento:/ }));
      await fireEvent.press(screen.getByRole("radio", { name: etiqueta }));
      expect(onCambiarTipo).toHaveBeenLastCalledWith(valor);
    }

    expect(onCambiarTipo).toHaveBeenCalledTimes(5);
    // Las opciones antiguas ya no existen
    expect(queryByText("Concierto")).toBeNull();
    expect(queryByText("Reunión")).toBeNull();
  });

  test("muestra los campos en el orden tipo, fecha, hora, lugar, técnicos, estado, notas y guardar", async () => {
    const { toJSON } = await render(
      <FormularioEvento
        tipo="ensayo"
        estado="pendiente"
        fecha="2026-10-29"
        hora=""
        lugar=""
        notas=""
        tecnicos={[{ id: "1", nombre: "Carlos" }]}
        tecnicoIds={[]}
        error=""
        editando={false}
        procesando={false}
        onCambiarTipo={jest.fn()}
        onCambiarEstado={jest.fn()}
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
      "Tipo de evento",
      "Fecha: ",
      "Elegir hora",
      "Lugar",
      '"Técnicos"',
      '"Estado"',
      '"Notas"',
      "Guardar evento",
    ].map((marca) => texto.indexOf(marca));

    expect(posiciones.every((posicion) => posicion >= 0)).toBe(true);
    expect([...posiciones].sort((a, b) => a - b)).toEqual(posiciones);
    expect(texto).not.toContain("Músicos que asistirán");
  });
});

describe("FormularioEvento: jerarquía y datos económicos", () => {
  const onCambiarCache = jest.fn();

  function pintar({
    datosEconomicos = null,
    procesando = false,
  }: {
    datosEconomicos?: {
      cache: string;
      errorCarga: string;
      cargando: boolean;
      onCambiarCache: (cache: string) => void;
    } | null;
    procesando?: boolean;
  } = {}) {
    return render(
      <FormularioEvento
        tipo="ensayo"
        estado="pendiente"
        fecha="2026-10-29"
        hora=""
        lugar=""
        notas=""
        tecnicos={[
          { id: "1", nombre: "Carlos" },
          { id: "2", nombre: "Miguel" },
        ]}
        tecnicoIds={["1"]}
        datosEconomicos={datosEconomicos}
        error=""
        editando={false}
        procesando={procesando}
        onCambiarTipo={jest.fn()}
        onCambiarEstado={jest.fn()}
        onCambiarHora={jest.fn()}
        onCambiarLugar={jest.fn()}
        onCambiarNotas={jest.fn()}
        onAlternarTecnico={jest.fn()}
        onGuardar={jest.fn()}
        onCancelar={jest.fn()}
      />
    );
  }

  const ECONOMICOS = { cache: "", errorCarga: "", cargando: false, onCambiarCache };

  function fondo(elemento: { props: { style?: unknown } }): unknown {
    return StyleSheet.flatten(elemento.props.style as StyleProp<ViewStyle>)?.backgroundColor;
  }

  test("Guardar evento es la única acción con el color principal", async () => {
    await pintar();

    const principal = Colors.light.primary;

    expect(fondo(screen.getByRole("button", { name: "Guardar evento" }))).toBe(principal);
    expect(fondo(screen.getByRole("button", { name: "Cancelar" }))).not.toBe(principal);

    for (const control of [
      ...screen.getAllByRole("radio"),
      ...screen.getAllByRole("checkbox"),
    ]) {
      expect(fondo(control)).not.toBe(principal);
    }
  });

  test("los técnicos son casillas que dicen si están marcadas", async () => {
    await pintar();

    expect(screen.getByRole("checkbox", { name: "Carlos" }).props.accessibilityState.checked).toBe(true);
    expect(screen.getByRole("checkbox", { name: "Miguel" }).props.accessibilityState.checked).toBe(false);
    expect(screen.queryByRole("button", { name: "Carlos" })).toBeNull();
  });

  test("tipo y estado son selectores de una opción, no botones de acción", async () => {
    await pintar();

    await fireEvent.press(screen.getByRole("button", { name: /^Tipo de evento:/ }));

    expect(screen.getByLabelText("Tipo de evento").props.accessibilityRole).toBe("radiogroup");
    expect(screen.getByLabelText("Estado").props.accessibilityRole).toBe("radiogroup");
    expect(screen.getByRole("radio", { name: "Pendiente" }).props.accessibilityState.checked).toBe(true);
    expect(screen.queryByRole("button", { name: "Pendiente" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Ensayo" })).toBeNull();
  });

  test("es una sola pantalla: sin encabezados de bloque ni mayúsculas decorativas", async () => {
    await pintar({ datosEconomicos: ECONOMICOS });

    for (const titulo of ["Datos del evento", "Personal", "Datos económicos"]) {
      expect(screen.queryByText(titulo)).toBeNull();
    }

    expect(screen.queryByRole("header")).toBeNull();
    expect(JSON.stringify(screen.toJSON())).not.toContain("uppercase");
  });

  test("sigue el flujo tipo, fecha y hora, lugar, técnicos, estado, caché, notas y acciones", async () => {
    await pintar({ datosEconomicos: ECONOMICOS });

    const texto = JSON.stringify(screen.toJSON());
    const posiciones = [
      '"Tipo de evento"',
      '"Fecha: 29-10-2026"',
      '"Elegir hora"',
      '"Lugar"',
      '"Técnicos"',
      '"Estado"',
      '"Caché acordado"',
      '"Notas"',
      '"Guardar evento"',
      '"Cancelar"',
    ].map((marca) => texto.indexOf(marca));

    expect(posiciones.every((posicion) => posicion >= 0)).toBe(true);
    expect([...posiciones].sort((a, b) => a - b)).toEqual(posiciones);
  });

  test.each(["Lugar", "Notas"])("%s va como placeholder y conserva su nombre accesible", async (nombre) => {
    await pintar();

    expect(screen.getByLabelText(nombre).props.placeholder).toBe(nombre);
    // Ningún texto visible con ese nombre
    expect(screen.queryByText(nombre)).toBeNull();
  });

  test("Tipo, Técnicos y Estado tienen su etiqueta visible", async () => {
    await pintar();

    expect(screen.getByText("Tipo de evento")).toBeTruthy();
    expect(screen.getByText("Técnicos")).toBeTruthy();
    expect(screen.getByText("Estado")).toBeTruthy();
  });

  test("la opción elegida se distingue con ✓, no solo por el color", async () => {
    await pintar();

    // Pendiente y Carlos
    expect(screen.getAllByText("✓")).toHaveLength(1);
    expect(screen.getByText("Carlos ✓")).toBeTruthy();
  });

  describe("desplegable de tipo", () => {
    const abrirTipo = () => fireEvent.press(screen.getByRole("button", { name: /^Tipo de evento:/ }));

    function pintarTipo(tipo: "ensayo" | null, onCambiarTipo: (tipo: string) => void = jest.fn()) {
      return render(
        <FormularioEvento
          tipo={tipo}
          estado="pendiente"
          fecha="2026-10-29"
          hora=""
          lugar=""
          notas=""
          tecnicos={[]}
          tecnicoIds={[]}
          error=""
          editando={tipo !== null}
          procesando={false}
          onCambiarTipo={onCambiarTipo}
          onCambiarEstado={jest.fn()}
          onCambiarHora={jest.fn()}
          onCambiarLugar={jest.fn()}
          onCambiarNotas={jest.fn()}
          onAlternarTecnico={jest.fn()}
          onGuardar={jest.fn()}
          onCancelar={jest.fn()}
        />
      );
    }

    test("sin tipo invita a elegir y las opciones están cerradas", async () => {
      await pintarTipo(null);

      const campo = screen.getByRole("button", { name: "Tipo de evento: Selecciona un tipo" });

      expect(campo.props.accessibilityState.expanded).toBe(false);
      expect(screen.getByText("▾")).toBeTruthy();
      expect(screen.queryByRole("radio", { name: "Boda" })).toBeNull();
    });

    test("con tipo lo enseña, y nunca el placeholder", async () => {
      await pintarTipo("ensayo");

      expect(screen.getByRole("button", { name: "Tipo de evento: Ensayo" })).toBeTruthy();
      expect(screen.queryByText("Selecciona un tipo")).toBeNull();
    });

    test("al desplegar aparecen los cinco tipos de siempre, ninguno elegido", async () => {
      await pintarTipo(null);
      await abrirTipo();

      expect(screen.getByRole("button", { name: /^Tipo de evento:/ }).props.accessibilityState.expanded).toBe(true);
      expect(screen.getByText("▴")).toBeTruthy();

      for (const nombre of ["Boda", "Fiesta privada", "Concierto abierto", "Ensayo", "Otro"]) {
        expect(screen.getByRole("radio", { name: nombre })).toBeTruthy();
      }
    });

    test("elegir envía el valor interno y cierra", async () => {
      const onCambiarTipo = jest.fn();

      await pintarTipo(null, onCambiarTipo);
      await abrirTipo();
      await fireEvent.press(screen.getByRole("radio", { name: "Ensayo" }));

      expect(onCambiarTipo).toHaveBeenCalledWith("ensayo");
      expect(screen.queryByRole("radio", { name: "Boda" })).toBeNull();
    });

    test("la opción elegida lleva ✓ y queda marcada: no depende solo del color", async () => {
      await pintarTipo("ensayo");
      await abrirTipo();

      expect(screen.getByText("Ensayo ✓")).toBeTruthy();
      expect(screen.getByRole("radio", { name: "Ensayo" }).props.accessibilityState.checked).toBe(true);
      expect(screen.getByRole("radio", { name: "Boda" }).props.accessibilityState.checked).toBe(false);
    });

    test("el campo mide y se ve como los demás del formulario", async () => {
      await pintarTipo(null);

      const estilo = StyleSheet.flatten(
        screen.getByRole("button", { name: /^Tipo de evento:/ }).props.style
      );

      expect(estilo.minHeight).toBeGreaterThanOrEqual(44);
      expect(estilo.backgroundColor).toBe(Colors.light.backgroundElement);
      expect(estilo.borderColor).toBe(Colors.light.backgroundSelected);
    });
  });

  test("la fecha se lee con su nombre", async () => {
    await pintar();

    expect(screen.getByLabelText("Fecha: 29-10-2026")).toBeTruthy();
  });

  test("con datos económicos pide el caché con teclado decimal y sin texto de ayuda", async () => {
    await pintar({ datosEconomicos: ECONOMICOS });

    const campo = screen.getByLabelText("Caché acordado");

    expect(campo.props.keyboardType).toBe("decimal-pad");
    expect(screen.queryByText("Importe pactado por la actuación.")).toBeNull();
    expect(screen.queryByText(/bote|finanzas|precio|cobro|sobrante/i)).toBeNull();

    await fireEvent.changeText(campo, "1200,50");

    expect(onCambiarCache).toHaveBeenCalledWith("1200,50");
  });

  test("sin datos económicos no existe ni el bloque ni el campo", async () => {
    await pintar();

    expect(screen.queryByLabelText("Caché acordado")).toBeNull();
  });

  test("si no se pudo cargar el caché, no deja escribirlo y lo explica", async () => {
    await pintar({
      datosEconomicos: { ...ECONOMICOS, errorCarga: "No se ha podido cargar el caché" },
    });

    expect(screen.getByLabelText("Caché acordado").props.editable).toBe(false);
    expect(screen.getByText("No se ha podido cargar el caché")).toBeTruthy();
  });

  test("mientras carga o guarda tampoco se puede escribir", async () => {
    const { unmount } = await pintar({ datosEconomicos: { ...ECONOMICOS, cargando: true } });

    expect(screen.getByLabelText("Caché acordado").props.editable).toBe(false);
    await unmount();

    await pintar({ datosEconomicos: ECONOMICOS, procesando: true });

    expect(screen.getByLabelText("Caché acordado").props.editable).toBe(false);
  });
});
