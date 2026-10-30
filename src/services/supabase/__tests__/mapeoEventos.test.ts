import { convertirErrorSupabase, esErrorEnUso, ErrorRepositorio } from "../errores";
import {
  convertirFechaDeBase,
  convertirFilaEvento,
  convertirFilasEventos,
  convertirHoraDeBase,
} from "../mapeoEventos";

describe("convertirHoraDeBase", () => {
  test("quita los segundos de PostgreSQL y deja HH:MM", () => {
    expect(convertirHoraDeBase("20:30:00")).toBe("20:30");
    expect(convertirHoraDeBase("09:05:00")).toBe("09:05");
    expect(convertirHoraDeBase("23:59:59.123")).toBe("23:59");
    expect(convertirHoraDeBase("20:30")).toBe("20:30");
  });

  test("sin hora devuelve cadena vacía", () => {
    expect(convertirHoraDeBase(null)).toBe("");
    expect(convertirHoraDeBase(undefined)).toBe("");
  });

  test("rechaza valores que no son una hora", () => {
    expect(() => convertirHoraDeBase("8:30")).toThrow();
    expect(() => convertirHoraDeBase("2026-03-12T20:30:00Z")).toThrow();
    expect(() => convertirHoraDeBase(2030)).toThrow();
  });
});

describe("convertirFechaDeBase", () => {
  test("mantiene el formato interno YYYY-MM-DD", () => {
    expect(convertirFechaDeBase("2026-03-12")).toBe("2026-03-12");
  });

  test("rechaza otros formatos", () => {
    expect(() => convertirFechaDeBase("12-03-2026")).toThrow();
    expect(() => convertirFechaDeBase("2026-03-12T00:00:00Z")).toThrow();
    expect(() => convertirFechaDeBase(null)).toThrow();
  });
});

describe("convertirFilaEvento", () => {
  test("rechaza asignaciones mal formadas", () => {
    expect(() =>
      convertirFilaEvento({
        id: "e1",
        titulo: "Ensayo",
        tipo: "ensayo",
        fecha: "2026-03-12",
        hora: null,
        lugar: "",
        notas: "",
        estado: "pendiente",
        evento_miembros: [],
        evento_tecnicos: [{ tecnico_id: 5, orden: 1 }],
      })
    ).toThrow();
  });

  test("el evento de la app no lleva músicos", () => {
    const evento = convertirFilaEvento({
      id: "e1",
      titulo: "Ensayo",
      tipo: "ensayo",
      fecha: "2026-03-12",
      hora: null,
      lugar: "",
      notas: "",
      estado: "pendiente",
      evento_miembros: [{ miembro_id: "m1", orden: 1 }],
      evento_tecnicos: [],
    });

    expect(evento).not.toHaveProperty("miembroIds");
  });
});

describe("convertirFilasEventos (legado evento_miembros)", () => {
  const fila = {
    id: "e1",
    titulo: "Ensayo",
    tipo: "ensayo",
    fecha: "2026-03-12",
    hora: null,
    lugar: "",
    notas: "",
    estado: "pendiente",
    evento_tecnicos: [],
  };

  test("separa los músicos heredados de los eventos de la app", () => {
    const { eventos, miembrosLegadoPorEvento } = convertirFilasEventos([
      { ...fila, evento_miembros: [{ miembro_id: "m1", orden: 1 }] },
      { ...fila, id: "e2", evento_miembros: [] },
    ]);

    expect(eventos.map((evento) => evento.id)).toEqual(["e1", "e2"]);
    expect(eventos[0]).not.toHaveProperty("miembroIds");
    expect(miembrosLegadoPorEvento.get("e1")).toEqual(["m1"]);
    expect(miembrosLegadoPorEvento.has("e2")).toBe(false);
  });

  test("tolera que falte la relación y rechaza una mal formada", () => {
    expect(convertirFilasEventos([fila]).miembrosLegadoPorEvento.size).toBe(0);
    expect(() =>
      convertirFilasEventos([{ ...fila, evento_miembros: [{ miembro_id: 5, orden: 1 }] }])
    ).toThrow();
  });
});

describe("convertirErrorSupabase", () => {
  test("traduce los códigos conocidos a un motivo sin detalles técnicos", () => {
    expect(convertirErrorSupabase({ code: "23503" }).motivo).toBe("en_uso");
    expect(convertirErrorSupabase({ code: "42501" }).motivo).toBe("sin_permiso");
    expect(convertirErrorSupabase({ code: "P0002" }).motivo).toBe("sin_permiso");
    expect(convertirErrorSupabase({ code: "XX000" }).motivo).toBe("desconocido");
    expect(convertirErrorSupabase({}).motivo).toBe("desconocido");
  });

  test("esErrorEnUso solo reconoce el motivo en_uso", () => {
    expect(esErrorEnUso(new ErrorRepositorio("en_uso"))).toBe(true);
    expect(esErrorEnUso(new ErrorRepositorio("sin_permiso"))).toBe(false);
    expect(esErrorEnUso(new Error("23503"))).toBe(false);
  });
});
