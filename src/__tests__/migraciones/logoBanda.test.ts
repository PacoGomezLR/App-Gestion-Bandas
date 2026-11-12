// Revisión estática de 012_logo_banda.sql: no se ejecuta contra Supabase, solo
// se comprueba que el SQL declara las reglas acordadas.
// Ruta relativa a la raíz del proyecto (cwd de Jest).
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
const codigo = leer("012_logo_banda.sql")
  .split("\n")
  .filter((linea) => !linea.trimStart().startsWith("--"))
  .join("\n");

function politica(operacion: "select" | "insert" | "update" | "delete"): string | null {
  const coincidencia = new RegExp(
    `create policy "[^"]+"\\s+on storage\\.objects for ${operacion} to authenticated([\\s\\S]*?);`
  ).exec(codigo);

  return coincidencia === null ? null : coincidencia[1];
}

describe("migración 012: columna", () => {
  test("todo va en una transacción y avisa a PostgREST", () => {
    expect(codigo.trim().startsWith("begin;")).toBe(true);
    expect(codigo.trim().endsWith("commit;")).toBe(true);
    expect(codigo).toContain("notify pgrst, 'reload schema';");
  });

  test("logo_path opcional y siempre dentro de la carpeta de su banda", () => {
    expect(codigo).toMatch(/alter table public\.bandas\s+add column logo_path text/);
    expect(codigo).toContain("logo_path is null");
    expect(codigo).toContain("logo_path like id::text || '/%'");
    expect(codigo).not.toMatch(/logo_path text not null/);
  });

  test("solo se abre logo_path: el resto de bandas sigue igual", () => {
    expect(codigo).toContain("grant update (logo_path) on table public.bandas to authenticated;");
    expect(codigo).not.toMatch(/grant update \([^)]*creada_por/);
    expect(codigo).not.toMatch(/create policy "[^"]+"\s+on public\.bandas/);
    expect(codigo).not.toMatch(/\bdrop\b/);
  });
});

describe("migración 012: Storage", () => {
  test("bucket propio, de lectura pública, solo imágenes de hasta 2 MB", () => {
    expect(codigo).toContain(
      "values ('logos-bandas', 'logos-bandas', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])"
    );
  });

  test("subir, ver archivos y borrar: solo el admin de la banda dueña de la carpeta", () => {
    for (const operacion of ["insert", "select", "delete"] as const) {
      const cuerpo = politica(operacion);

      expect(cuerpo).not.toBeNull();
      expect(cuerpo).toContain("bucket_id = 'logos-bandas'");
      expect(cuerpo).toContain("private.es_admin_logo_banda(name)");
    }
  });

  test("ningún UPDATE: un logo no se sobrescribe, se sube uno nuevo", () => {
    expect(politica("update")).toBeNull();
  });

  test("una carpeta que no es un uuid no es de ninguna banda", () => {
    expect(codigo).toContain("private.is_band_admin(((storage.foldername(p_ruta))[1])::uuid)");
    expect(codigo).toContain("when invalid_text_representation then");
    expect(codigo).toContain("revoke execute on function private.es_admin_logo_banda(text) from public, anon;");
  });

  test("nada para anon", () => {
    expect(codigo).not.toMatch(/to anon/);
  });
});

// 001–011 ya están ejecutadas en Supabase: su contenido queda fijado
describe("migraciones ejecutadas", () => {
  test.each([
    ["010_google_maps_eventos.sql", "982af9a25436cdd7814da6be06bdd7a19e24b06d44dd4586055c9503b8c1fd0b"],
    ["011_repertorio.sql", "7885ec0247f79de09c05ee25d947ca34c0ee90cd09a6490127d97fb6c03e9f79"],
  ])("%s no ha cambiado", (nombre, huella) => {
    expect(crypto.createHash("sha256").update(leer(nombre)).digest("hex")).toBe(huella);
  });
});
