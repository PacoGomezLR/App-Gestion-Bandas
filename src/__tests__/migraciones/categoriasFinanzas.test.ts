import { categoriasDeTipo } from "../../utils/categoriasMovimiento";

// Revisión estática de 008_categorias_finanzas.sql: no se ejecuta contra
// Supabase, solo se comprueba que el SQL declara las reglas acordadas.
// Ruta relativa a la raíz del proyecto (cwd de Jest).
const fs = jest.requireActual<{
  readFileSync: (ruta: string, codificacion: "utf8") => string;
}>("fs");

// Sin comentarios, para no confundir explicaciones con instrucciones.
// Git puede dejar el archivo con CRLF en Windows: se normaliza a \n
const codigo = fs
  .readFileSync("supabase/migrations/008_categorias_finanzas.sql", "utf8")
  .replace(/\r\n/g, "\n")
  .split("\n")
  .filter((linea) => !linea.trimStart().startsWith("--"))
  .join("\n");

function categoriasDe(tipo: "ingreso" | "gasto"): string[] {
  const lista = new RegExp(`tipo = '${tipo}'\\s+and categoria in \\(([^)]*)\\)`).exec(codigo)?.[1] ?? "";

  return [...lista.matchAll(/'(\w+)'/g)].map(([, categoria]) => categoria);
}

describe("migración 008: categorías", () => {
  test("todo va en una transacción", () => {
    expect(codigo.trim().startsWith("begin;")).toBe(true);
    expect(codigo.trim().endsWith("commit;")).toBe(true);
  });

  test("sustituye la restricción de 007 por su nombre exacto, sin if exists", () => {
    expect(codigo).toMatch(
      /alter table public\.movimientos_financieros\s+drop constraint movimientos_financieros_check;/
    );
    expect(codigo).toMatch(/add constraint movimientos_financieros_categoria_por_tipo_check check/);
    expect(codigo).not.toContain("if exists");
  });

  test("la base admite exactamente las categorías que ofrece la app para cada tipo", () => {
    expect(categoriasDe("ingreso")).toEqual([...categoriasDeTipo("ingreso")]);
    expect(categoriasDe("gasto")).toEqual([...categoriasDeTipo("gasto")]);
  });

  test("cada categoría nueva está solo en su tipo", () => {
    expect(categoriasDe("ingreso")).toContain("sobrante_concierto");
    expect(categoriasDe("gasto")).not.toContain("sobrante_concierto");
    expect(categoriasDe("gasto")).toContain("alquiler_furgoneta");
    expect(categoriasDe("ingreso")).not.toContain("alquiler_furgoneta");
  });

  test("solo toca esa restricción: ni datos, ni permisos, ni RLS", () => {
    expect(codigo).not.toMatch(/\b(update|delete|insert|grant|revoke|create policy|drop table)\b/);
  });
});
