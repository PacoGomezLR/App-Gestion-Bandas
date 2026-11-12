// Revisión estática de 013_escala_logo_banda.sql: no se ejecuta contra Supabase,
// solo se comprueba que el SQL declara las reglas acordadas.
// Ruta relativa a la raíz del proyecto (cwd de Jest).
import { ESCALA_LOGO } from "../../utils/escalaLogo";

const fs = jest.requireActual<{
  readFileSync: (ruta: string, codificacion: "utf8") => string;
}>("fs");
const crypto = jest.requireActual<{
  createHash: (algoritmo: "sha256") => { update: (texto: string) => { digest: (formato: "hex") => string } };
}>("crypto");

function leer(nombre: string): string {
  return fs.readFileSync(`supabase/migrations/${nombre}`, "utf8").replace(/\r\n/g, "\n");
}

// Sin comentarios, para no confundir explicaciones con instrucciones
const codigo = leer("013_escala_logo_banda.sql")
  .split("\n")
  .filter((linea) => !linea.trimStart().startsWith("--"))
  .join("\n");

describe("migración 013: escala del logo", () => {
  test("todo va en una transacción y avisa a PostgREST", () => {
    expect(codigo.trim().startsWith("begin;")).toBe(true);
    expect(codigo.trim().endsWith("commit;")).toBe(true);
    expect(codigo).toContain("notify pgrst, 'reload schema';");
  });

  test("columna obligatoria con valor por defecto seguro: las bandas existentes quedan a 1", () => {
    expect(codigo).toMatch(
      /alter table public\.bandas\s+add column logo_scale numeric\(3, 2\) not null default 1/
    );
  });

  test("los mismos límites que la app", () => {
    expect(codigo).toContain(`check (logo_scale between ${ESCALA_LOGO.minima} and ${ESCALA_LOGO.maxima})`);
    expect(ESCALA_LOGO.defecto).toBe(1);
  });

  test("solo se abre la columna: la política de UPDATE de admin ya existente es la que decide", () => {
    expect(codigo).toContain("grant update (logo_scale) on table public.bandas to authenticated;");
    expect(codigo).not.toMatch(/create policy|drop |storage\.|to anon/);
    // La 012 (logo_path) no se toca
    expect(codigo).not.toContain("logo_path");
  });
});

// 001–012 ya están ejecutadas en Supabase: su contenido queda fijado
describe("migraciones ejecutadas", () => {
  test.each([
    ["011_repertorio.sql", "7885ec0247f79de09c05ee25d947ca34c0ee90cd09a6490127d97fb6c03e9f79"],
    ["012_logo_banda.sql", "212a2465ae07acca2059f21452096fb21a4d88dbf4ae2dc73bde3c3374bb4396"],
  ])("%s no ha cambiado", (nombre, huella) => {
    expect(crypto.createHash("sha256").update(leer(nombre)).digest("hex")).toBe(huella);
  });
});
