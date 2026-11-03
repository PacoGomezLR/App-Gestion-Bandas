import type { IndisponibilidadUsuario } from "../../types/disponibilidad";
import type { Evento } from "../../types/evento";
import {
  contarNoDisponiblesPorFecha,
  indisponibilidadesDeFecha,
  indisponibilidadPropia,
  lineasNoDisponibles,
  requiereAvisoConfirmacion,
  resumirNoDisponibles,
  tituloNoDisponibles,
} from "../disponibilidad";

function indisponibilidad(id: string, usuarioId: string, fecha: string): IndisponibilidadUsuario {
  return { id, bandaId: "b1", usuarioId, fecha };
}

const lista = [
  indisponibilidad("i1", "yo", "2026-11-14"),
  indisponibilidad("i2", "otro", "2026-11-14"),
  indisponibilidad("i3", "otro", "2026-11-20"),
];

const evento: Evento = {
  id: "e1",
  titulo: "Boda Lucena 14/11/2026",
  tipo: "boda",
  fecha: "2026-11-14",
  hora: "",
  lugar: "Lucena",
  notas: "",
  estado: "confirmado",
  tecnicoIds: [],
};

describe("consultas de disponibilidad", () => {
  test("obtiene las indisponibilidades de una fecha", () => {
    expect(indisponibilidadesDeFecha(lista, "2026-11-14").map(({ id }) => id)).toEqual(["i1", "i2"]);
    expect(indisponibilidadesDeFecha(lista, "2026-11-15")).toEqual([]);
  });

  test("encuentra solo la indisponibilidad propia de ese día", () => {
    expect(indisponibilidadPropia(lista, "yo", "2026-11-14")?.id).toBe("i1");
    expect(indisponibilidadPropia(lista, "yo", "2026-11-20")).toBeNull();
    expect(indisponibilidadPropia(lista, null, "2026-11-14")).toBeNull();
  });

  test("cuenta cuántos integrantes faltan cada día", () => {
    expect(contarNoDisponiblesPorFecha(lista)).toEqual({ "2026-11-14": 2, "2026-11-20": 1 });
    expect(contarNoDisponiblesPorFecha([])).toEqual({});
  });
});

describe("resumen de no disponibles", () => {
  const nombres = { yo: "Paco Gómez", otro: "Kike Fuentes" };

  test("muestra los nombres visibles reales, ordenados, también el del usuario actual", () => {
    const resumen = resumirNoDisponibles(lista, "2026-11-14", "yo", nombres);

    expect(resumen).toEqual({ total: 2, nombres: ["Kike Fuentes", "Paco Gómez"], sinNombre: 0 });
    expect(tituloNoDisponibles(resumen.total)).toBe("2 no disponibles");
    expect(lineasNoDisponibles(resumen)).toEqual(["Kike Fuentes", "Paco Gómez"]);
  });

  test("todos ven la misma lista, sea quien sea el usuario actual", () => {
    expect(resumirNoDisponibles(lista, "2026-11-14", "otro", nombres)).toEqual(
      resumirNoDisponibles(lista, "2026-11-14", "yo", nombres)
    );
  });

  test("si el usuario actual no tiene nombre aparece como Tú", () => {
    const resumen = resumirNoDisponibles(lista, "2026-11-14", "yo", { otro: "Kike Fuentes" });

    expect(lineasNoDisponibles(resumen)).toEqual(["Kike Fuentes", "Tú"]);
  });

  test("otro integrante sin nombre aparece como Integrante, sin inventar identidades", () => {
    const uno = resumirNoDisponibles(lista, "2026-11-14", "yo", { yo: "Paco Gómez" });
    expect(lineasNoDisponibles(uno)).toEqual(["Paco Gómez", "Integrante"]);

    const varios = [
      ...lista,
      indisponibilidad("i4", "tercero", "2026-11-14"),
    ];
    const resumen = resumirNoDisponibles(varios, "2026-11-14", "yo", { yo: "Paco Gómez" });
    expect(resumen).toEqual({ total: 3, nombres: ["Paco Gómez"], sinNombre: 2 });
    expect(lineasNoDisponibles(resumen)).toEqual(["Paco Gómez", "2 integrantes sin nombre"]);
  });

  test("un día sin indisponibilidades no tiene nada que mostrar", () => {
    expect(resumirNoDisponibles(lista, "2026-12-01", "yo", nombres)).toEqual({
      total: 0,
      nombres: [],
      sinNombre: 0,
    });
    expect(tituloNoDisponibles(1)).toBe("1 no disponible");
  });
});

describe("requiereAvisoConfirmacion", () => {
  test("un evento pendiente nunca avisa, aunque haya conflictos", () => {
    expect(
      requiereAvisoConfirmacion({ estado: "pendiente", fecha: "2026-11-14", eventoOriginal: null, noDisponibles: 2 })
    ).toBe(false);
  });

  test("confirmar una fecha sin conflictos no avisa", () => {
    expect(
      requiereAvisoConfirmacion({ estado: "confirmado", fecha: "2026-11-15", eventoOriginal: null, noDisponibles: 0 })
    ).toBe(false);
  });

  test("avisa al crear un evento confirmado en un día con conflictos", () => {
    expect(
      requiereAvisoConfirmacion({ estado: "confirmado", fecha: "2026-11-14", eventoOriginal: null, noDisponibles: 1 })
    ).toBe(true);
  });

  test("avisa al pasar de pendiente a confirmado", () => {
    expect(
      requiereAvisoConfirmacion({
        estado: "confirmado",
        fecha: "2026-11-14",
        eventoOriginal: { ...evento, estado: "pendiente" },
        noDisponibles: 1,
      })
    ).toBe(true);
  });

  test("avisa al mover un evento confirmado a otro día con conflictos", () => {
    expect(
      requiereAvisoConfirmacion({
        estado: "confirmado",
        fecha: "2026-11-20",
        eventoOriginal: evento,
        noDisponibles: 1,
      })
    ).toBe(true);
  });

  test("no repite el aviso si ya estaba confirmado exactamente ese día", () => {
    expect(
      requiereAvisoConfirmacion({
        estado: "confirmado",
        fecha: "2026-11-14",
        eventoOriginal: evento,
        noDisponibles: 2,
      })
    ).toBe(false);
  });
});
