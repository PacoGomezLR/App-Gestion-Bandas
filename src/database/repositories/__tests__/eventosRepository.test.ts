import {
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
  tipo: "concierto",
  fecha: "2026-09-30",
  estado: "confirmado",
};

const filaEnsayo: FilaEvento = {
  id: "2",
  titulo: "Ensayo general",
  tipo: "ensayo",
  fecha: "2026-10-02",
  estado: "pendiente",
};

describe("eventosRepository: conversión de filas", () => {
  test("reconoce solo los tipos y estados válidos", () => {
    expect(esTipoEvento("concierto")).toBe(true);
    expect(esTipoEvento("reunion")).toBe(true);
    expect(esTipoEvento("fiesta")).toBe(false);
    expect(esTipoEvento("toString")).toBe(false);

    expect(esEstadoEvento("cancelado")).toBe(true);
    expect(esEstadoEvento("borrador")).toBe(false);
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

  test("construye los eventos con sus técnicos y con lista vacía si no tienen", () => {
    const eventos = construirEventos(
      [filaConcierto, filaEnsayo],
      [
        { evento_id: "1", tecnico_id: "1" },
        { evento_id: "1", tecnico_id: "2" },
      ]
    );

    expect(eventos).toEqual([
      { ...filaConcierto, tecnicoIds: ["1", "2"] },
      { ...filaEnsayo, tecnicoIds: [] },
    ]);
  });

  test("rechaza filas con un tipo o un estado desconocido", () => {
    expect(() =>
      convertirFilaAEvento({ ...filaConcierto, tipo: "fiesta" }, [])
    ).toThrow("Tipo de evento no válido en la base de datos: fiesta");

    expect(() =>
      convertirFilaAEvento({ ...filaConcierto, estado: "borrador" }, [])
    ).toThrow("Estado de evento no válido en la base de datos: borrador");
  });
});
