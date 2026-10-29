import { convertirErrorSupabase, esErrorEnUso, ErrorRepositorio } from "../errores";
import {
  convertirFechaDeBase,
  convertirFilaEvento,
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
        evento_miembros: [{ miembro_id: 5, orden: 1 }],
        evento_tecnicos: [],
      })
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
