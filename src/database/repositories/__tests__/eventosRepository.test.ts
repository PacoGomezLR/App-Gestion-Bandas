import {
  agruparMiembroIdsPorEvento,
  agruparTecnicoIdsPorEvento,
  construirEventos,
  convertirFilaAEvento,
  esEstadoEvento,
  esTipoEvento,
  type FilaEvento,
} from "../eventosRepository";

const filaConcierto: FilaEvento = {
  id: "1",
  titulo: "Concierto en Córdoba",
  tipo: "concierto_abierto",
  fecha: "2026-09-30",
  hora: "",
  lugar: "",
  notas: "",
  estado: "confirmado",
};

const filaEnsayo: FilaEvento = {
  id: "2",
  titulo: "Ensayo general",
  tipo: "ensayo",
  fecha: "2026-10-02",
  hora: "",
  lugar: "",
  notas: "",
  estado: "pendiente",
};

describe("eventosRepository: conversión de filas", () => {
  test("reconoce solo los tipos y estados válidos", () => {
    for (const tipoValido of [
      "boda",
      "fiesta_privada",
      "concierto_abierto",
      "ensayo",
      "otro",
    ]) {
      expect(esTipoEvento(tipoValido)).toBe(true);
    }

    // Los tipos antiguos ya no son válidos: la migración 6 los convierte
    expect(esTipoEvento("concierto")).toBe(false);
    expect(esTipoEvento("reunion")).toBe(false);
    expect(esTipoEvento("fiesta")).toBe(false);
    expect(esTipoEvento("toString")).toBe(false);

    expect(esEstadoEvento("pendiente")).toBe(true);
    expect(esEstadoEvento("confirmado")).toBe(true);
    // Un evento cancelado se elimina: la migración 7 borra los antiguos
    expect(esEstadoEvento("cancelado")).toBe(false);
    expect(esEstadoEvento("borrador")).toBe(false);
    expect(esEstadoEvento("toString")).toBe(false);
  });

  test("agrupa los técnicos de cada evento conservando el orden", () => {
    const tecnicoIdsPorEvento = agruparTecnicoIdsPorEvento([
      { evento_id: "1", tecnico_id: "2" },
      { evento_id: "2", tecnico_id: "1" },
      { evento_id: "1", tecnico_id: "1" },
    ]);

    expect(tecnicoIdsPorEvento.get("1")).toEqual(["2", "1"]);
    expect(tecnicoIdsPorEvento.get("2")).toEqual(["1"]);
    expect(tecnicoIdsPorEvento.get("3")).toBeUndefined();
  });

  test("agrupa los miembros de cada evento conservando el orden", () => {
    const miembroIdsPorEvento = agruparMiembroIdsPorEvento([
      { evento_id: "2", miembro_id: "3" },
      { evento_id: "2", miembro_id: "1" },
    ]);

    expect(miembroIdsPorEvento.get("2")).toEqual(["3", "1"]);
    expect(miembroIdsPorEvento.get("1")).toBeUndefined();
  });

  test("construye los eventos con sus técnicos y con lista vacía si no tienen", () => {
    const eventos = construirEventos(
      [filaConcierto, filaEnsayo],
      [
        { evento_id: "1", tecnico_id: "1" },
        { evento_id: "1", tecnico_id: "2" },
      ],
      []
    );

    expect(eventos).toEqual([
      { ...filaConcierto, tecnicoIds: ["1", "2"], miembroIds: [] },
      { ...filaEnsayo, tecnicoIds: [], miembroIds: [] },
    ]);
  });

  test("reconstruye miembroIds sin mezclarlos con tecnicoIds", () => {
    const eventos = construirEventos(
      [filaConcierto, filaEnsayo],
      [{ evento_id: "1", tecnico_id: "2" }],
      [
        { evento_id: "1", miembro_id: "1" },
        { evento_id: "1", miembro_id: "3" },
      ]
    );

    expect(eventos).toEqual([
      { ...filaConcierto, tecnicoIds: ["2"], miembroIds: ["1", "3"] },
      // Un evento sin miembros es válido y recibe []
      { ...filaEnsayo, tecnicoIds: [], miembroIds: [] },
    ]);
  });

  test("conserva exactamente hora, lugar y notas", () => {
    const filaConDetalles: FilaEvento = {
      ...filaConcierto,
      hora: "20:30",
      lugar: "Sala Principal",
      notas: "Llevar amplificador de repuesto",
    };

    const [evento] = construirEventos([filaConDetalles], [], []);

    expect(evento).toMatchObject({
      hora: "20:30",
      lugar: "Sala Principal",
      notas: "Llevar amplificador de repuesto",
    });
    // Los campos vacíos siguen vacíos
    expect(convertirFilaAEvento(filaEnsayo, [], [])).toMatchObject({
      hora: "",
      lugar: "",
      notas: "",
    });
  });

  test("rechaza filas con un tipo o un estado desconocido", () => {
    expect(() =>
      convertirFilaAEvento({ ...filaConcierto, tipo: "fiesta" }, [], [])
    ).toThrow("Tipo de evento no válido en la base de datos: fiesta");

    expect(() =>
      convertirFilaAEvento({ ...filaConcierto, estado: "borrador" }, [], [])
    ).toThrow("Estado de evento no válido en la base de datos: borrador");
  });
});
