// Revisión estática de 011_repertorio.sql: no se ejecuta contra Supabase, solo
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
const codigo = leer("011_repertorio.sql")
  .split("\n")
  .filter((linea) => !linea.trimStart().startsWith("--"))
  .join("\n");

const tabla = (() => {
  const inicio = codigo.indexOf("create table public.canciones (");

  if (inicio < 0) {
    throw new Error("Falta la tabla canciones");
  }

  return codigo.slice(inicio, codigo.indexOf("\n);", inicio) + 3);
})();

function politica(operacion: "select" | "insert" | "update" | "delete"): string {
  const coincidencia = new RegExp(
    `create policy "[^"]+"\\s+on public\\.canciones for ${operacion} to authenticated([\\s\\S]*?);`
  ).exec(codigo);

  if (coincidencia === null) {
    throw new Error(`Falta la política de ${operacion}`);
  }

  return coincidencia[1];
}

describe("migración 011: tabla", () => {
  test("todo va en una transacción y avisa a PostgREST", () => {
    expect(codigo.trim().startsWith("begin;")).toBe(true);
    expect(codigo.trim().endsWith("commit;")).toBe(true);
    expect(codigo).toContain("notify pgrst, 'reload schema';");
  });

  test("solo los campos mínimos", () => {
    const columnas = [...tabla.matchAll(/^ {2}([a-z_]+) /gm)].map(([, columna]) => columna);

    expect(columnas).toEqual(["id", "banda_id", "nombre", "estado", "created_at", "updated_at"]);
  });

  test("pertenece obligatoriamente a una banda y se borra con ella", () => {
    expect(tabla).toContain("banda_id uuid not null references public.bandas (id) on delete cascade");
  });

  test("el nombre es obligatorio, recortado y de 1 a 160 caracteres", () => {
    expect(tabla).toContain("nombre text not null");
    expect(tabla).toContain("nombre = btrim(nombre)");
    expect(tabla).toContain("char_length(nombre) between 1 and 160");
  });

  test("el estado solo puede ser repertorio o nueva, y sin default", () => {
    expect(tabla).toContain("estado text not null check (estado in ('repertorio', 'nueva'))");
    expect(tabla).not.toMatch(/estado[^\n]*default/);
  });

  test("sin unique sobre el nombre ni campo de orden", () => {
    expect(codigo).not.toMatch(/unique/i);
    expect(tabla).not.toContain("orden");
  });

  test("índice para la única consulta de la app y updated_at con el trigger común", () => {
    expect(codigo).toMatch(/create index \w+ on public\.canciones \(banda_id, nombre\);/);
    expect(codigo).toContain("execute function private.actualizar_updated_at()");
  });
});

describe("migración 011: seguridad", () => {
  test("activa RLS", () => {
    expect(codigo).toContain("alter table public.canciones enable row level security;");
  });

  test("cualquier miembro lee", () => {
    expect(politica("select")).toContain("using ((select private.is_band_member(banda_id)))");
  });

  test("solo el admin crea, edita y elimina", () => {
    const admin = "(select private.is_band_admin(banda_id))";

    expect(politica("insert")).toContain(`with check (${admin})`);
    expect(politica("update")).toContain(`using (${admin})`);
    expect(politica("update")).toContain(`with check (${admin})`);
    expect(politica("delete")).toContain(`using (${admin})`);
  });

  test("nada para anon, y una canción no se mueve a otra banda", () => {
    expect(codigo).toContain("revoke all on table public.canciones from anon, authenticated;");
    expect(codigo).not.toMatch(/grant [^;]* to anon/);
    expect(codigo).toContain("grant update (nombre, estado) on table public.canciones to authenticated;");
  });

  test("no toca ninguna tabla existente", () => {
    expect(codigo).not.toMatch(/alter table public\.(?!canciones)/);
    expect(codigo).not.toMatch(/\bdrop\b/);
    expect(codigo).not.toMatch(/eventos|movimientos_financieros|evento_finanzas/);
  });
});

// 001–010 ya están ejecutadas en Supabase: su contenido queda fijado
describe("migraciones ejecutadas", () => {
  test.each([
    ["001_usuarios_roles.sql", "086d46b563e365600449c607b4b3fa49d577d345057499da1a33629a522a4e8d"],
    ["002_datos_banda.sql", "b38523b393c475b25f81ae356ecae1a1893b4f7f0b454dd38f87a6b8296fdbe0"],
    ["003_retirar_miembros.sql", "ded6ab9cd368d2a1e3751f995e64ff6dec545c62edd19251ba5f7e8f1b88093f"],
    ["004_disponibilidad_usuarios.sql", "935d4840402c740a5e5fead55980695b783a001db80b3038c645f06310b0d86d"],
    ["005_nombre_visible_registro.sql", "6661a2180a5188cb4aa2e4d12e2e0e083fdeccfa5b4082ae18bc44246528c8f4"],
    ["006_invitaciones_banda.sql", "dcaba45ef9c329d44e212402afc1cc9fbc9d75b442e6f9148e778541170af288"],
    ["007_finanzas_banda.sql", "0216c0d40cfa59169d8e0dae43a4a5243db16d3eb1b0080cc447b45deb87b307"],
    ["008_categorias_finanzas.sql", "ee606d5afe4531d9ce93f49bd74a3899ca4efd15df8e93728298ebc2bc0e45c2"],
    ["009_cache_eventos.sql", "56984990f8377e697466ea91bb64b9350834e396a85e15af4b1ec84076527e9d"],
    ["010_google_maps_eventos.sql", "982af9a25436cdd7814da6be06bdd7a19e24b06d44dd4586055c9503b8c1fd0b"],
  ])("%s no ha cambiado", (nombre, huella) => {
    expect(crypto.createHash("sha256").update(leer(nombre)).digest("hex")).toBe(huella);
  });
});
