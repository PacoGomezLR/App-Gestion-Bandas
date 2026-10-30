import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import type { Evento } from "../../types/evento";
import type { Tecnico } from "../../types/tecnico";
import { ListaEventos } from "../ListaEventos";

// constants/theme importa global.css, que Jest no puede interpretar
jest.mock("../../global.css", () => ({}));

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

const eventos: Evento[] = [
  {
    id: "1",
    titulo: "Concierto en Sevilla",
    tipo: "concierto_abierto",
    fecha: "2026-11-15",
    hora: "",
    lugar: "",
    notas: "",
    estado: "confirmado",
    tecnicoIds: ["1", "2"],
  },
  {
    id: "2",
    titulo: "Ensayo general",
    tipo: "ensayo",
    fecha: "2026-11-20",
    hora: "",
    lugar: "",
    notas: "",
    estado: "pendiente",
    tecnicoIds: [],
  },
];

const boda: Evento = {
  id: "30",
  titulo: "Boda de María y Juan",
  tipo: "boda",
  fecha: "2027-05-15",
  hora: "20:30",
  lugar: "Lucena",
  notas: "Prueba de sonido a las 18:00",
  estado: "confirmado",
  tecnicoIds: ["1"],
};

const fiesta: Evento = {
  id: "31",
  titulo: "Cumpleaños de Laura",
  tipo: "fiesta_privada",
  fecha: "2027-06-01",
  hora: "",
  lugar: "Córdoba",
  notas: "",
  estado: "pendiente",
  tecnicoIds: [],
};

async function renderizar(lista: Evento[], procesando = false, puedeEditar = true) {
  const onEliminar = jest.fn();
  const onEditar = jest.fn();

  const resultado = await render(
    <ListaEventos
      eventos={lista}
      tecnicos={tecnicos}
      procesando={procesando}
      puedeEditar={puedeEditar}
      onEliminar={onEliminar}
      onEditar={onEditar}
    />
  );

  return { ...resultado, onEliminar, onEditar };
}

async function abrir(vistaPrevia: string) {
  await fireEvent.press(screen.getByText(vistaPrevia));
}

describe("ListaEventos", () => {
  test("muestra una vista previa cerrada con tipo y lugar", async () => {
    const { getByText, queryByText } = await renderizar([boda]);

    expect(getByText("Boda Lucena")).toBeTruthy();
    expect(queryByText(/^Título:/)).toBeNull();
    expect(queryByText(/^Tipo de evento:/)).toBeNull();
    expect(queryByText(/^Nota:/)).toBeNull();
    expect(queryByText("Editar")).toBeNull();
    expect(queryByText("Eliminar")).toBeNull();
  });

  test("la vista previa cerrada muestra tipo + lugar + fecha DD/MM/YYYY + estado, sin hora", async () => {
    const { getByText, queryByText, toJSON } = await renderizar([boda]);

    expect(getByText("Boda Lucena")).toBeTruthy();
    expect(getByText("15/05/2027")).toBeTruthy();
    expect(getByText("Confirmado")).toBeTruthy();
    // La fecha va sola, sin etiqueta: el detalle sigue cerrado
    expect(queryByText(/^Fecha:/)).toBeNull();
    expect(queryByText(/^Hora:/)).toBeNull();

    const renderizado = JSON.stringify(toJSON());
    expect(renderizado).not.toMatch(/15-05-2027|2027-05-15|20:30/);
  });

  test("sin lugar la vista previa cerrada muestra tipo + fecha + estado, sin hueco", async () => {
    const { getByText, queryByText } = await renderizar([
      { ...boda, tipo: "ensayo", lugar: "", estado: "pendiente" },
    ]);

    expect(getByText("Ensayo")).toBeTruthy();
    expect(getByText("15/05/2027")).toBeTruthy();
    expect(getByText("Pendiente")).toBeTruthy();
    expect(queryByText(/^Ensayo\s/)).toBeNull();
    expect(queryByText(/20:30/)).toBeNull();
  });

  test("al abrir el evento muestra su fecha en formato DD/MM/YYYY", async () => {
    const { getByText } = await renderizar([fiesta]);

    await abrir("Fiesta privada Córdoba");

    expect(getByText("Fecha: 01/06/2027")).toBeTruthy();
    // La fecha de la cabecera sigue a la vista, sin repetirse con otro formato
    expect(getByText("01/06/2027")).toBeTruthy();
  });

  test("muestra el badge Confirmado en la vista previa sin abrir el evento", async () => {
    const { getByText, queryByText } = await renderizar([boda]);

    expect(getByText("Boda Lucena")).toBeTruthy();
    expect(getByText("Confirmado")).toBeTruthy();
    // El detalle sigue cerrado
    expect(queryByText(/^Estado:/)).toBeNull();
    expect(queryByText(/^Título:/)).toBeNull();
  });

  test("muestra el badge Pendiente en la vista previa sin abrir el evento", async () => {
    const { getByText, queryByText } = await renderizar([fiesta]);

    expect(getByText("Fiesta privada Córdoba")).toBeTruthy();
    expect(getByText("Pendiente")).toBeTruthy();
    expect(queryByText(/^Título:/)).toBeNull();
  });

  test("Pendiente y Confirmado usan colores distintos y siempre muestran texto", async () => {
    const { getByText } = await renderizar([boda, fiesta]);

    const colorConfirmado = StyleSheet.flatten(getByText("Confirmado").props.style);
    const colorPendiente = StyleSheet.flatten(getByText("Pendiente").props.style);

    expect(colorConfirmado.color).toBeDefined();
    expect(colorPendiente.color).toBeDefined();
    expect(colorConfirmado.color).not.toBe(colorPendiente.color);
  });

  test("al pulsar la vista previa muestra el detalle completo, sin Título", async () => {
    const { getByText, queryByText } = await renderizar([boda]);

    await abrir("Boda Lucena");

    // El título se guarda internamente, pero ya no se muestra
    expect(queryByText(/^Título:/)).toBeNull();
    expect(queryByText("Boda de María y Juan")).toBeNull();
    expect(getByText("Tipo de evento: Boda")).toBeTruthy();
    expect(getByText("Fecha: 15/05/2027")).toBeTruthy();
    expect(screen.queryByText("Fecha: 15-05-2027")).toBeNull();
    expect(getByText("Hora: 20:30")).toBeTruthy();
    expect(getByText("Lugar: Lucena")).toBeTruthy();
    expect(getByText("Estado: Confirmado")).toBeTruthy();
    expect(screen.queryByText("Estado: confirmado")).toBeNull();
    expect(getByText("Técnico: Carlos")).toBeTruthy();
    // Los músicos ya no existen en la app
    expect(queryByText(/Músicos|Miembros/)).toBeNull();
    expect(getByText("Editar")).toBeTruthy();
    expect(getByText("Eliminar")).toBeTruthy();
  });

  test("muestra la nota completa y no el antiguo aviso", async () => {
    const { getByText, queryByText } = await renderizar([boda]);

    await abrir("Boda Lucena");

    expect(getByText("Nota: Prueba de sonido a las 18:00")).toBeTruthy();
    expect(queryByText("Tiene notas")).toBeNull();
  });

  test("usa la etiqueta Técnico en singular", async () => {
    const { getByText, queryByText } = await renderizar([boda]);

    await abrir("Boda Lucena");

    expect(getByText("Técnico: Carlos")).toBeTruthy();
    expect(queryByText(/Técnicos:/)).toBeNull();
  });

  test("usa Técnico en singular también con varios técnicos", async () => {
    const { getByText, queryByText } = await renderizar(eventos);

    await abrir("Concierto abierto");

    expect(getByText("Técnico: Carlos, Miguel")).toBeTruthy();
    expect(queryByText(/Técnicos:/)).toBeNull();
  });

  test("muestra Técnico: Sin asignar si no hay técnicos", async () => {
    const { getByText } = await renderizar(eventos);

    await abrir("Ensayo");

    expect(getByText("Técnico: Sin asignar")).toBeTruthy();
  });

  test("ignora los ids que no corresponden a ningún técnico", async () => {
    const { getByText } = await renderizar([
      { ...eventos[0], tecnicoIds: ["1", "99"] },
    ]);

    await abrir("Concierto abierto");

    expect(getByText("Técnico: Carlos")).toBeTruthy();
  });

  test("el detalle no tiene ninguna línea de músicos", async () => {
    const { getByText, queryByText } = await renderizar(eventos);

    await abrir("Concierto abierto");

    expect(getByText("Tipo de evento: Concierto abierto")).toBeTruthy();
    expect(queryByText(/^Músicos:/)).toBeNull();
    expect(queryByText(/Músicos|Miembros/)).toBeNull();
  });

  test("sin lugar la vista previa es solo el tipo y no hay líneas vacías", async () => {
    const bodaSinDetalles: Evento = {
      ...boda,
      hora: "",
      lugar: "",
      notas: "",
    };

    const { getByText, queryByText } = await renderizar([bodaSinDetalles]);

    expect(getByText("Boda")).toBeTruthy();
    expect(getByText("Confirmado")).toBeTruthy();
    // No se usa el título del evento como relleno de la vista previa
    expect(queryByText("Boda de María y Juan")).toBeNull();

    await abrir("Boda");

    expect(getByText("Tipo de evento: Boda")).toBeTruthy();
    expect(queryByText(/^Hora:/)).toBeNull();
    expect(queryByText(/^Lugar:/)).toBeNull();
    expect(queryByText(/^Nota:/)).toBeNull();
  });

  test("muestra el tipo con su etiqueta y no con el valor interno", async () => {
    const { getByText, queryByText } = await renderizar([
      { ...eventos[0], id: "10", tipo: "fiesta_privada" },
      { ...eventos[1], id: "11", tipo: "concierto_abierto" },
    ]);

    expect(getByText("Fiesta privada")).toBeTruthy();
    expect(getByText("Concierto abierto")).toBeTruthy();

    await abrir("Fiesta privada");

    expect(getByText("Tipo de evento: Fiesta privada")).toBeTruthy();
    expect(queryByText(/_/)).toBeNull();
  });

  test("pulsar de nuevo cierra el detalle", async () => {
    const { getByText, queryByText } = await renderizar([boda]);

    await abrir("Boda Lucena");
    expect(getByText("Tipo de evento: Boda")).toBeTruthy();

    await abrir("Boda Lucena");

    expect(queryByText(/^Tipo de evento:/)).toBeNull();
    expect(queryByText("Editar")).toBeNull();
    expect(getByText("Boda Lucena")).toBeTruthy();
  });

  test("solo hay un evento abierto a la vez", async () => {
    const { getAllByText, getByText, queryByText } = await renderizar([
      boda,
      fiesta,
    ]);

    await abrir("Boda Lucena");
    expect(getByText("Tipo de evento: Boda")).toBeTruthy();

    await abrir("Fiesta privada Córdoba");

    expect(getByText("Tipo de evento: Fiesta privada")).toBeTruthy();
    expect(queryByText("Tipo de evento: Boda")).toBeNull();
    expect(getAllByText(/^Tipo de evento:/)).toHaveLength(1);
    expect(getAllByText("Editar")).toHaveLength(1);
  });

  test("la vista previa es un botón accesible que indica si está desplegado", async () => {
    const { getByRole } = await renderizar([boda]);

    expect(
      getByRole("button", {
        name: "Ver detalles de Boda Lucena, 15/05/2027. Estado Confirmado",
        expanded: false,
      })
    ).toBeTruthy();

    await abrir("Boda Lucena");

    expect(
      getByRole("button", {
        name: "Ver detalles de Boda Lucena, 15/05/2027. Estado Confirmado",
        expanded: true,
      })
    ).toBeTruthy();
  });

  test("llama a onEliminar con el id correcto", async () => {
    const { getByText, onEliminar } = await renderizar(eventos);

    await abrir("Concierto abierto");
    await fireEvent.press(getByText("Eliminar"));

    expect(onEliminar).toHaveBeenCalledTimes(1);
    expect(onEliminar).toHaveBeenCalledWith("1");
  });

  test("llama a onEditar con el evento correcto", async () => {
    const { getByText, onEditar } = await renderizar(eventos);

    await abrir("Ensayo");
    await fireEvent.press(getByText("Editar"));

    expect(onEditar).toHaveBeenCalledTimes(1);
    expect(onEditar).toHaveBeenCalledWith(eventos[1]);
  });

  test("deshabilita Editar y Eliminar mientras procesa", async () => {
    const { getByRole, getByText, onEditar, onEliminar } = await renderizar(
      eventos,
      true
    );

    await abrir("Concierto abierto");

    expect(getByRole("button", { name: "Editar", disabled: true })).toBeTruthy();
    expect(getByRole("button", { name: "Eliminar", disabled: true })).toBeTruthy();

    await fireEvent.press(getByText("Editar"));
    await fireEvent.press(getByText("Eliminar"));

    expect(onEditar).not.toHaveBeenCalled();
    expect(onEliminar).not.toHaveBeenCalled();
  });

  test("sin permiso de edición abre el detalle completo pero sin Editar ni Eliminar", async () => {
    const { getByText, queryByText } = await renderizar(eventos, false, false);

    await abrir("Concierto abierto");

    expect(getByText("Tipo de evento: Concierto abierto")).toBeTruthy();
    expect(getByText("Técnico: Carlos, Miguel")).toBeTruthy();
    expect(queryByText(/^Músicos:/)).toBeNull();
    expect(queryByText("Editar")).toBeNull();
    expect(queryByText("Eliminar")).toBeNull();
    // No se enseña el rol
    expect(queryByText(/admin|usuario|solo lectura/i)).toBeNull();
  });
});
