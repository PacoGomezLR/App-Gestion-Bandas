import type { Evento } from "../../types/evento";
import { hayCambiosEvento, type ValoresFormularioEvento } from "../formularioEvento";

// El dinero se formatea con la utilidad real; formularioEvento no toca theme
const VACIO: ValoresFormularioEvento = {
  tipo: null,
  estado: "pendiente",
  fecha: "2026-11-21",
  hora: "",
  lugar: "",
  notas: "",
  googleMapsUrl: "",
  tecnicoIds: [],
  cacheEscrito: null,
};

const ORIGINAL: Evento = {
  id: "e1",
  titulo: "Concierto abierto Montilla 21/11/2026",
  tipo: "concierto_abierto",
  fecha: "2026-11-21",
  hora: "21:00",
  lugar: "Montilla",
  notas: "Prueba a las 18:00",
  estado: "confirmado",
  tecnicoIds: ["t1", "t2"],
  googleMapsUrl: "https://maps.app.goo.gl/AbC",
};

const COMO_ORIGINAL: ValoresFormularioEvento = {
  tipo: ORIGINAL.tipo,
  estado: ORIGINAL.estado,
  fecha: ORIGINAL.fecha,
  hora: ORIGINAL.hora,
  lugar: ORIGINAL.lugar,
  notas: ORIGINAL.notas,
  googleMapsUrl: ORIGINAL.googleMapsUrl ?? "",
  tecnicoIds: [...ORIGINAL.tecnicoIds],
  cacheEscrito: null,
};

describe("hayCambiosEvento: evento nuevo", () => {
  test("recién abierto no hay cambios, aunque se cambie el día", () => {
    expect(hayCambiosEvento(VACIO, null)).toBe(false);
    expect(hayCambiosEvento({ ...VACIO, fecha: "2026-11-22" }, null)).toBe(false);
  });

  test("solo espacios o un caché vacío no cuentan", () => {
    expect(hayCambiosEvento({ ...VACIO, lugar: "   ", notas: " ", cacheEscrito: " " }, null)).toBe(false);
  });

  test.each<[string, Partial<ValoresFormularioEvento>]>([
    ["tipo", { tipo: "boda" }],
    ["estado", { estado: "confirmado" }],
    ["hora", { hora: "20:00" }],
    ["lugar", { lugar: "Montilla" }],
    ["notas", { notas: "Llevar cables" }],
    ["Google Maps", { googleMapsUrl: "https://maps.app.goo.gl/x" }],
    ["técnico", { tecnicoIds: ["t1"] }],
    ["caché", { cacheEscrito: "300" }],
  ])("cualquier dato escrito o elegido cuenta: %s", (_campo, cambio) => {
    expect(hayCambiosEvento({ ...VACIO, ...cambio }, null)).toBe(true);
  });
});

describe("hayCambiosEvento: edición", () => {
  test("igual que el guardado no hay cambios", () => {
    expect(hayCambiosEvento(COMO_ORIGINAL, ORIGINAL, 120000)).toBe(false);
  });

  test("espacios alrededor o técnicos en otro orden no son cambios", () => {
    expect(
      hayCambiosEvento(
        { ...COMO_ORIGINAL, lugar: " Montilla ", googleMapsUrl: ` ${ORIGINAL.googleMapsUrl} `, tecnicoIds: ["t2", "t1"] },
        ORIGINAL,
        120000
      )
    ).toBe(false);
  });

  test("escribir el mismo caché que ya tenía no es un cambio", () => {
    expect(hayCambiosEvento({ ...COMO_ORIGINAL, cacheEscrito: "1200,00" }, ORIGINAL, 120000)).toBe(false);
    expect(hayCambiosEvento({ ...COMO_ORIGINAL, cacheEscrito: "" }, ORIGINAL)).toBe(false);
  });

  test.each<[string, Partial<ValoresFormularioEvento>]>([
    ["tipo", { tipo: "boda" }],
    ["estado", { estado: "pendiente" }],
    ["fecha", { fecha: "2026-11-22" }],
    ["hora", { hora: "" }],
    ["lugar", { lugar: "Lucena" }],
    ["notas", { notas: "" }],
    ["Google Maps", { googleMapsUrl: "" }],
    ["quitar un técnico", { tecnicoIds: ["t1"] }],
    ["cambiar un técnico", { tecnicoIds: ["t1", "t3"] }],
    ["caché distinto", { cacheEscrito: "1300" }],
    ["vaciar el caché", { cacheEscrito: "" }],
  ])("cuenta como cambio: %s", (_campo, cambio) => {
    expect(hayCambiosEvento({ ...COMO_ORIGINAL, ...cambio }, ORIGINAL, 120000)).toBe(true);
  });
});
