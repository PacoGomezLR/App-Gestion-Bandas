import { formatearFechaConBarras } from "../fechas";
import { generarTituloEvento } from "../tituloEvento";

describe("generarTituloEvento", () => {
  test("une tipo, lugar y fecha DD/MM/YYYY", () => {
    expect(generarTituloEvento("concierto_abierto", "Montilla", "2026-10-29")).toBe(
      "Concierto abierto Montilla 29/10/2026"
    );
  });

  test("sin lugar omite esa parte sin dejar espacios dobles", () => {
    expect(generarTituloEvento("ensayo", "", "2026-10-29")).toBe("Ensayo 29/10/2026");
    expect(generarTituloEvento("ensayo", "   ", "2026-10-29")).toBe("Ensayo 29/10/2026");
  });

  test("recorta espacios del lugar", () => {
    expect(generarTituloEvento("boda", "  Lucena ", "2026-03-12")).toBe("Boda Lucena 12/03/2026");
  });

  test("usa la etiqueta humana de cada tipo", () => {
    expect(generarTituloEvento("boda", "", "2026-01-02")).toBe("Boda 02/01/2026");
    expect(generarTituloEvento("fiesta_privada", "", "2026-01-02")).toBe("Fiesta privada 02/01/2026");
    expect(generarTituloEvento("concierto_abierto", "", "2026-01-02")).toBe(
      "Concierto abierto 02/01/2026"
    );
    expect(generarTituloEvento("ensayo", "", "2026-01-02")).toBe("Ensayo 02/01/2026");
    expect(generarTituloEvento("otro", "", "2026-01-02")).toBe("Otro 02/01/2026");
  });

  test("sin fecha todavía solo muestra lo que hay", () => {
    expect(generarTituloEvento("ensayo", "Montilla", "")).toBe("Ensayo Montilla");
  });
});

describe("formatearFechaConBarras", () => {
  test("convierte YYYY-MM-DD en DD/MM/YYYY", () => {
    expect(formatearFechaConBarras("2026-10-29")).toBe("29/10/2026");
    expect(formatearFechaConBarras("")).toBe("");
  });
});
