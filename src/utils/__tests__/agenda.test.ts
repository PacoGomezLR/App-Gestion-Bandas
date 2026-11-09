import type { Evento } from "../../types/evento";
import { eventosPasados, eventosProximos, LIMITE_PROXIMAS_FECHAS } from "../agenda";
import { fechaDeHoy } from "../fechas";

function evento(id: string, fecha: string, hora = ""): Evento {
  return {
    id,
    titulo: `Evento ${id}`,
    tipo: "ensayo",
    fecha,
    hora,
    lugar: "",
    notas: "",
    estado: "pendiente",
    tecnicoIds: [],
    googleMapsUrl: null,
  };
}

const HOY = "2026-11-10";
const eventos = [
  evento("futuro2", "2026-12-01"),
  evento("pasado1", "2026-11-09"),
  evento("hoyTarde", "2026-11-10", "21:00"),
  evento("futuro1", "2026-11-11"),
  evento("pasado2", "2025-06-01"),
  evento("hoySinHora", "2026-11-10"),
];

describe("agenda", () => {
  test("próximas: fecha >= hoy, de la más próxima a la más lejana (sin hora primero)", () => {
    expect(eventosProximos(eventos, HOY).map(({ id }) => id)).toEqual([
      "hoySinHora",
      "hoyTarde",
      "futuro1",
      "futuro2",
    ]);
  });

  test("historial: fecha < hoy, de la más reciente a la más antigua", () => {
    expect(eventosPasados(eventos, HOY).map(({ id }) => id)).toEqual(["pasado1", "pasado2"]);
  });

  test("entre las dos se reparten todos los eventos, sin copiar ni perder ninguno", () => {
    const proximos = eventosProximos(eventos, HOY);
    const pasados = eventosPasados(eventos, HOY);

    expect(proximos.length + pasados.length).toBe(eventos.length);
    // Son los mismos objetos: no se crean copias
    expect(proximos[0]).toBe(eventos.find(({ id }) => id === "hoySinHora"));
    // La lista original no cambia de orden
    expect(eventos[0].id).toBe("futuro2");
  });

  test("el inicio muestra como mucho 5", () => {
    expect(LIMITE_PROXIMAS_FECHAS).toBe(5);
  });
});

describe("fechaDeHoy", () => {
  test("usa la fecha local del dispositivo en formato YYYY-MM-DD", () => {
    // 1 de marzo de 2026 a las 00:30 hora local
    expect(fechaDeHoy(new Date(2026, 2, 1, 0, 30))).toBe("2026-03-01");
    expect(fechaDeHoy(new Date(2026, 11, 31, 23, 59))).toBe("2026-12-31");
  });
});
