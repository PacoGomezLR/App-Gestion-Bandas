import type { Evento } from "../../types/evento";
import { agruparEventosPorMes, eventosPasados, eventosProximos } from "../agenda";

const fs = jest.requireActual<{
  existsSync: (ruta: string) => boolean;
  readFileSync: (ruta: string, codificacion: "utf8") => string;
}>("fs");

function evento(id: string, fecha: string, hora = ""): Evento {
  return {
    id,
    titulo: `Evento ${id}`,
    tipo: "ensayo",
    fecha,
    hora,
    lugar: "",
    notas: "",
    estado: "confirmado",
    tecnicoIds: [],
    googleMapsUrl: null,
  };
}

function resumen(eventos: Evento[]) {
  return agruparEventosPorMes(eventos).map(({ clave, titulo, eventos: lista }) => ({
    clave,
    titulo,
    ids: lista.map(({ id }) => id),
  }));
}

describe("agruparEventosPorMes", () => {
  test("varios eventos del mismo mes: un solo grupo", () => {
    expect(resumen([evento("a", "2026-02-03"), evento("b", "2026-02-14"), evento("c", "2026-02-28")])).toEqual([
      { clave: "2026-02", titulo: "Febrero 2026", ids: ["a", "b", "c"] },
    ]);
  });

  test("meses distintos: un grupo por mes, en el orden de la lista", () => {
    expect(
      resumen([evento("a", "2026-01-10"), evento("b", "2026-02-01"), evento("c", "2026-02-20"), evento("d", "2026-03-05")])
    ).toEqual([
      { clave: "2026-01", titulo: "Enero 2026", ids: ["a"] },
      { clave: "2026-02", titulo: "Febrero 2026", ids: ["b", "c"] },
      { clave: "2026-03", titulo: "Marzo 2026", ids: ["d"] },
    ]);
  });

  test("cambio de año: diciembre y enero son grupos distintos", () => {
    expect(resumen([evento("a", "2026-12-31"), evento("b", "2027-01-01")])).toEqual([
      { clave: "2026-12", titulo: "Diciembre 2026", ids: ["a"] },
      { clave: "2027-01", titulo: "Enero 2027", ids: ["b"] },
    ]);
  });

  test("el mismo mes de años distintos no se mezcla", () => {
    expect(resumen([evento("a", "2026-05-10"), evento("b", "2027-05-10")]).map(({ clave }) => clave)).toEqual([
      "2026-05",
      "2027-05",
    ]);
  });

  test("los meses sin eventos no aparecen", () => {
    expect(resumen([evento("a", "2026-01-15"), evento("b", "2026-04-15")]).map(({ titulo }) => titulo)).toEqual([
      "Enero 2026",
      "Abril 2026",
    ]);
  });

  test("dentro de cada mes conserva el orden recibido", () => {
    const eventos = [evento("tarde", "2026-06-10", "21:00"), evento("manana", "2026-06-10", "10:00"), evento("antes", "2026-06-02")];

    expect(resumen(eventos)[0].ids).toEqual(["tarde", "manana", "antes"]);
  });

  test("los 12 meses en español, con mayúscula inicial", () => {
    const titulos = resumen(
      Array.from({ length: 12 }, (_, i) => evento(String(i), `2026-${String(i + 1).padStart(2, "0")}-15`))
    ).map(({ titulo }) => titulo);

    expect(titulos).toEqual([
      "Enero 2026",
      "Febrero 2026",
      "Marzo 2026",
      "Abril 2026",
      "Mayo 2026",
      "Junio 2026",
      "Julio 2026",
      "Agosto 2026",
      "Septiembre 2026",
      "Octubre 2026",
      "Noviembre 2026",
      "Diciembre 2026",
    ]);
  });

  test("primer y último día del mes no cambian de mes (sin Date ni UTC)", () => {
    expect(resumen([evento("a", "2026-02-28"), evento("b", "2026-03-01")]).map(({ clave }) => clave)).toEqual([
      "2026-02",
      "2026-03",
    ]);

    const codigo = fs.readFileSync("src/utils/agenda.ts", "utf8").replace(/\/\/.*$/gm, "");
    expect(codigo).not.toMatch(/new Date|toISOString|getUTC|getMonth/);
  });

  test("sin eventos, sin grupos", () => {
    expect(agruparEventosPorMes([])).toEqual([]);
  });
});

describe("orden de las vistas", () => {
  const hoy = "2026-02-10";
  const eventos = [
    evento("marzo", "2026-03-04"),
    evento("pasado-enero", "2026-01-20"),
    evento("febrero-tarde", "2026-02-15", "22:00"),
    evento("pasado-diciembre", "2025-12-05"),
    evento("febrero-manana", "2026-02-15", "09:00"),
    evento("pasado-febrero", "2026-02-01"),
  ];

  test("próximas / todas: el mes más próximo primero y, dentro, cronológico ascendente", () => {
    expect(resumen(eventosProximos(eventos, hoy))).toEqual([
      { clave: "2026-02", titulo: "Febrero 2026", ids: ["febrero-manana", "febrero-tarde"] },
      { clave: "2026-03", titulo: "Marzo 2026", ids: ["marzo"] },
    ]);
  });

  test("historial: mantiene su orden (de lo más reciente a lo más antiguo), también entre años", () => {
    expect(resumen(eventosPasados(eventos, hoy))).toEqual([
      { clave: "2026-02", titulo: "Febrero 2026", ids: ["pasado-febrero"] },
      { clave: "2026-01", titulo: "Enero 2026", ids: ["pasado-enero"] },
      { clave: "2025-12", titulo: "Diciembre 2025", ids: ["pasado-diciembre"] },
    ]);
  });

  test("Android y web: misma función, sin variantes por plataforma", () => {
    expect(fs.existsSync("src/utils/agenda.web.ts")).toBe(false);
    expect(fs.existsSync("src/components/ListaEventos.web.tsx")).toBe(false);
    expect(fs.readFileSync("src/components/ListaEventos.tsx", "utf8")).not.toMatch(/Platform\./);
  });
});
