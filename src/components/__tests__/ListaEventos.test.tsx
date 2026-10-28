import { fireEvent, render } from "@testing-library/react-native";
import type { Evento } from "../../types/evento";
import type { Miembro } from "../../types/miembro";
import type { Tecnico } from "../../types/tecnico";
import { ListaEventos } from "../ListaEventos";

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

const miembros: Miembro[] = [
  {
    id: "1",
    nombre: "Paco",
  },
  {
    id: "2",
    nombre: "Rafa",
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
    miembroIds: ["1", "2"],
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
    miembroIds: [],
  },
];

describe("ListaEventos", () => {
  test("muestra los eventos recibidos", async () => {
    const onEliminar = jest.fn();
    const onEditar = jest.fn();

    const { getByText } = await render(
      <ListaEventos
        eventos={eventos}
        tecnicos={tecnicos}
        miembros={miembros}
        procesando={false}
        onEliminar={onEliminar}
        onEditar={onEditar}
      />
    );

    expect(getByText("Concierto en Sevilla")).toBeTruthy();
    expect(getByText("Ensayo general")).toBeTruthy();

    expect(getByText("15-11-2026")).toBeTruthy();
    expect(getByText("20-11-2026")).toBeTruthy();

    expect(getByText("confirmado")).toBeTruthy();
    expect(getByText("pendiente")).toBeTruthy();
  });

  test("llama a onEliminar con el id correcto", async () => {
    const onEliminar = jest.fn();
    const onEditar = jest.fn();

    const { getAllByText } = await render(
      <ListaEventos
        eventos={eventos}
        tecnicos={tecnicos}
        miembros={miembros}
        procesando={false}
        onEliminar={onEliminar}
        onEditar={onEditar}
      />
    );

    await fireEvent.press(getAllByText("Eliminar")[0]);

    expect(onEliminar).toHaveBeenCalledTimes(1);
    expect(onEliminar).toHaveBeenCalledWith("1");
  });

  test("llama a onEditar con el evento correcto", async () => {
    const onEliminar = jest.fn();
    const onEditar = jest.fn();

    const { getAllByText } = await render(
      <ListaEventos
        eventos={eventos}
        tecnicos={tecnicos}
        miembros={miembros}
        procesando={false}
        onEliminar={onEliminar}
        onEditar={onEditar}
      />
    );

    await fireEvent.press(getAllByText("Editar")[1]);

    expect(onEditar).toHaveBeenCalledTimes(1);
    expect(onEditar).toHaveBeenCalledWith(eventos[1]);
  });

  test("muestra los técnicos asignados a cada evento", async () => {
    const { getByText } = await render(
      <ListaEventos
        eventos={eventos}
        tecnicos={tecnicos}
        miembros={miembros}
        procesando={false}
        onEliminar={jest.fn()}
        onEditar={jest.fn()}
      />
    );

    expect(getByText("Técnicos: Carlos, Miguel")).toBeTruthy();
    expect(getByText("Técnicos: Sin asignar")).toBeTruthy();
  });

  test("ignora los ids que no corresponden a ningún técnico", async () => {
    const eventoConIdInexistente: Evento = {
      ...eventos[0],
      tecnicoIds: ["1", "99"],
    };

    const { getByText } = await render(
      <ListaEventos
        eventos={[eventoConIdInexistente]}
        tecnicos={tecnicos}
        miembros={miembros}
        procesando={false}
        onEliminar={jest.fn()}
        onEditar={jest.fn()}
      />
    );

    expect(getByText("Técnicos: Carlos")).toBeTruthy();
  });

  test("muestra los músicos asignados", async () => {
    const { getByText, getAllByText } = await render(
      <ListaEventos
        eventos={eventos}
        tecnicos={tecnicos}
        miembros={miembros}
        procesando={false}
        onEliminar={jest.fn()}
        onEditar={jest.fn()}
      />
    );

    expect(getByText("Músicos: Paco, Rafa")).toBeTruthy();
    // Solo el evento con músicos tiene la línea
    expect(getAllByText(/^Músicos:/)).toHaveLength(1);
  });

  test("no muestra ninguna línea de músicos si el evento no tiene", async () => {
    const { getByText, queryByText } = await render(
      <ListaEventos
        eventos={[eventos[1]]}
        tecnicos={tecnicos}
        miembros={miembros}
        procesando={false}
        onEliminar={jest.fn()}
        onEditar={jest.fn()}
      />
    );

    // Sin músicos es un estado válido: el evento se ve, pero sin línea de músicos
    expect(getByText("Ensayo general")).toBeTruthy();
    expect(queryByText(/^Músicos:/)).toBeNull();
    expect(queryByText(/Músicos|Miembros/)).toBeNull();
  });

  test("ignora ids de músicos inexistentes", async () => {
    const eventoConMiembroInexistente: Evento = {
      ...eventos[0],
      miembroIds: ["99", "2"],
    };

    const { getByText } = await render(
      <ListaEventos
        eventos={[eventoConMiembroInexistente]}
        tecnicos={tecnicos}
        miembros={miembros}
        procesando={false}
        onEliminar={jest.fn()}
        onEditar={jest.fn()}
      />
    );

    expect(getByText("Músicos: Rafa")).toBeTruthy();
  });

  test("muestra hora, lugar y solo un aviso de notas", async () => {
    const eventoConDetalles: Evento = {
      ...eventos[0],
      hora: "20:30",
      lugar: "Sala Principal",
      notas: "Texto largo con todas las indicaciones para el concierto",
    };

    const { getByText, queryByText } = await render(
      <ListaEventos
        eventos={[eventoConDetalles]}
        tecnicos={tecnicos}
        miembros={miembros}
        procesando={false}
        onEliminar={jest.fn()}
        onEditar={jest.fn()}
      />
    );

    expect(getByText("Hora: 20:30")).toBeTruthy();
    expect(getByText("Lugar: Sala Principal")).toBeTruthy();
    expect(getByText("Tiene notas")).toBeTruthy();
    // Las notas completas no se muestran en el listado
    expect(queryByText(/Texto largo/)).toBeNull();
  });

  test("muestra el tipo con su etiqueta y no con el valor interno", async () => {
    const eventosConTipos: Evento[] = [
      { ...eventos[0], id: "10", tipo: "fiesta_privada" },
      { ...eventos[1], id: "11", tipo: "concierto_abierto" },
    ];

    const { getByText, queryByText } = await render(
      <ListaEventos
        eventos={eventosConTipos}
        tecnicos={tecnicos}
        miembros={miembros}
        procesando={false}
        onEliminar={jest.fn()}
        onEditar={jest.fn()}
      />
    );

    expect(getByText("Fiesta privada")).toBeTruthy();
    expect(getByText("Concierto abierto")).toBeTruthy();
    expect(queryByText(/_/)).toBeNull();
  });

  test("no muestra líneas de hora, lugar ni notas si están vacíos", async () => {
    const { getByText, queryByText } = await render(
      <ListaEventos
        eventos={[eventos[1]]}
        tecnicos={tecnicos}
        miembros={miembros}
        procesando={false}
        onEliminar={jest.fn()}
        onEditar={jest.fn()}
      />
    );

    expect(getByText("Ensayo general")).toBeTruthy();
    expect(queryByText(/^Hora:/)).toBeNull();
    expect(queryByText(/^Lugar:/)).toBeNull();
    expect(queryByText("Tiene notas")).toBeNull();
  });

  test("no muestra la línea de músicos si todos los ids son inexistentes", async () => {
    const eventoSoloConIdsInexistentes: Evento = {
      ...eventos[0],
      miembroIds: ["98", "99"],
    };

    const { getByText, queryByText } = await render(
      <ListaEventos
        eventos={[eventoSoloConIdsInexistentes]}
        tecnicos={tecnicos}
        miembros={miembros}
        procesando={false}
        onEliminar={jest.fn()}
        onEditar={jest.fn()}
      />
    );

    expect(getByText("Concierto en Sevilla")).toBeTruthy();
    expect(queryByText(/^Músicos:/)).toBeNull();
  });

  test("deshabilita Editar y Eliminar mientras procesa", async () => {
    const onEliminar = jest.fn();
    const onEditar = jest.fn();

    const { getAllByRole, getAllByText } = await render(
      <ListaEventos
        eventos={eventos}
        tecnicos={tecnicos}
        miembros={miembros}
        procesando={true}
        onEliminar={onEliminar}
        onEditar={onEditar}
      />
    );

    expect(getAllByRole("button", { name: "Editar", disabled: true })).toHaveLength(2);
    expect(getAllByRole("button", { name: "Eliminar", disabled: true })).toHaveLength(2);

    await fireEvent.press(getAllByText("Editar")[0]);
    await fireEvent.press(getAllByText("Eliminar")[0]);

    expect(onEditar).not.toHaveBeenCalled();
    expect(onEliminar).not.toHaveBeenCalled();
  });
});
