import { fireEvent, render, screen } from "@testing-library/react-native";

import type { Evento } from "../../types/evento";
import { ListaEventos } from "../ListaEventos";

// constants/theme importa global.css, que Jest no puede interpretar
jest.mock("../../global.css", () => ({}));

const fs = jest.requireActual<{ readFileSync: (ruta: string, codificacion: "utf8") => string }>("fs");

function evento(id: string, fecha: string, lugar: string): Evento {
  return {
    id,
    titulo: `Evento ${id}`,
    tipo: "concierto_abierto",
    fecha,
    hora: "",
    lugar,
    notas: "",
    estado: "confirmado",
    tecnicoIds: [],
    googleMapsUrl: null,
  };
}

const EVENTOS = [
  evento("1", "2026-12-12", "Lucena"),
  evento("2", "2026-12-20", "Cabra"),
  evento("3", "2027-01-08", "Rute"),
];

async function pintar(agruparPorMes?: boolean) {
  await render(
    <ListaEventos
      eventos={EVENTOS}
      tecnicos={[]}
      procesando={false}
      puedeEditar
      onEliminar={jest.fn()}
      onEditar={jest.fn()}
      agruparPorMes={agruparPorMes}
    />
  );
}

function textosEnOrden(): string[] {
  return [
    ...screen.getAllByRole("header").map((cabecera) => `#${String(cabecera.props.children)}`),
    ...screen.getAllByRole("button", { name: /^Ver detalles/ }).map((tarjeta) => String(tarjeta.props.accessibilityLabel)),
  ];
}

describe("ListaEventos agrupada por mes", () => {
  test("un encabezado por mes, en español, antes de sus tarjetas", async () => {
    await pintar(true);

    expect(screen.getAllByRole("header").map((cabecera) => cabecera.props.children)).toEqual([
      "Diciembre 2026",
      "Enero 2027",
    ]);
    expect(textosEnOrden()).toEqual([
      "#Diciembre 2026",
      "#Enero 2027",
      "Ver detalles de Concierto abierto Lucena, 12/12/2026. Estado Confirmado",
      "Ver detalles de Concierto abierto Cabra, 20/12/2026. Estado Confirmado",
      "Ver detalles de Concierto abierto Rute, 08/01/2027. Estado Confirmado",
    ]);

    // El encabezado de diciembre va antes que su primera tarjeta en el árbol
    const arbol = JSON.stringify(screen.toJSON());
    expect(arbol.indexOf("Diciembre 2026")).toBeLessThan(arbol.indexOf("Lucena"));
    expect(arbol.indexOf("Cabra")).toBeLessThan(arbol.indexOf("Enero 2027"));
    expect(arbol.indexOf("Enero 2027")).toBeLessThan(arbol.indexOf("Rute"));
  });

  test("las tarjetas funcionan igual: se despliegan y muestran sus acciones", async () => {
    await pintar(true);

    const tarjeta = () => screen.getByRole("button", { name: /^Ver detalles de Concierto abierto Lucena/ });

    await fireEvent.press(tarjeta());

    expect(tarjeta().props.accessibilityState).toMatchObject({ expanded: true });
    expect(screen.getByText("Editar evento")).toBeTruthy();
    expect(screen.getByText("Eliminar evento")).toBeTruthy();
  });

  test("sin agruparPorMes, la lista continua de siempre (sin encabezados)", async () => {
    await pintar();

    expect(screen.queryAllByRole("header")).toEqual([]);
    expect(screen.getAllByRole("button", { name: /^Ver detalles/ })).toHaveLength(3);
  });
});

describe("dónde se agrupa", () => {
  test("Próximas, Todas e Historial sí; el panel de un día no", () => {
    const codigo = fs.readFileSync("src/app/index.tsx", "utf8");

    expect(codigo).toContain("function lista(eventosLista: Evento[], agruparPorMes = true)");
    expect(codigo).toContain("lista(eventosVista)");
    expect(codigo).toContain("lista(proximos.slice(0, LIMITE_PROXIMAS_FECHAS))");
    expect(codigo).toContain("lista(eventosDelDia, false)");
  });
});
