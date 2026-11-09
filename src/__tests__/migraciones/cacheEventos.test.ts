// Revisión estática de 009_cache_eventos.sql: no se ejecuta contra Supabase,
// solo se comprueba que el SQL declara las reglas acordadas.
// Ruta relativa a la raíz del proyecto (cwd de Jest).
const fs = jest.requireActual<{
  readFileSync: (ruta: string, codificacion: "utf8") => string;
}>("fs");

// Sin comentarios, para no confundir explicaciones con instrucciones.
// Git puede dejar el archivo con CRLF en Windows: se normaliza a \n
const codigo = fs
  .readFileSync("supabase/migrations/009_cache_eventos.sql", "utf8")
  .replace(/\r\n/g, "\n")
  .split("\n")
  .filter((linea) => !linea.trimStart().startsWith("--"))
  .join("\n");

const tabla = (() => {
  const inicio = codigo.indexOf("create table public.evento_finanzas (");

  if (inicio < 0) {
    throw new Error("Falta la tabla evento_finanzas");
  }

  return codigo.slice(inicio, codigo.indexOf("\n);", inicio) + 3);
})();

function politica(operacion: "select" | "insert" | "update" | "delete"): string {
  const coincidencia = new RegExp(
    `create policy "[^"]+"\\s+on public\\.evento_finanzas for ${operacion} to authenticated([\\s\\S]*?);`
  ).exec(codigo);

  if (coincidencia === null) {
    throw new Error(`Falta la política de ${operacion}`);
  }

  return coincidencia[1];
}

function funcion(nombre: string): string {
  const inicio = codigo.indexOf(`create function public.${nombre}(`);

  if (inicio < 0) {
    throw new Error(`Falta la función ${nombre}`);
  }

  return codigo.slice(inicio, codigo.indexOf("$$;", inicio) + 3);
}

describe("migración 009: tabla", () => {
  test("todo va en una transacción y avisa a PostgREST", () => {
    expect(codigo.trim().startsWith("begin;")).toBe(true);
    expect(codigo.trim().endsWith("commit;")).toBe(true);
    expect(codigo).toContain("notify pgrst, 'reload schema';");
  });

  test("el dinero es un entero que admite 0 y no admite negativos", () => {
    expect(tabla).toContain("cache_centimos bigint not null");
    expect(tabla).toContain("check (cache_centimos between 0 and 99999999999)");
    expect(tabla).not.toMatch(/\b(float|double precision|real|numeric|money)\b/);
  });

  test("un solo caché por evento", () => {
    expect(tabla).toContain("primary key (banda_id, evento_id)");
  });

  test("evento y banda son coherentes y borrar el evento borra su caché", () => {
    expect(tabla).toMatch(
      /foreign key \(banda_id, evento_id\)\s+references public\.eventos \(banda_id, id\) on delete cascade/
    );
  });

  test("updated_at usa el trigger común", () => {
    expect(codigo).toContain("execute function private.actualizar_updated_at()");
  });

  test("no toca eventos ni los movimientos financieros", () => {
    expect(codigo).not.toMatch(/alter table public\.eventos/);
    expect(codigo).not.toContain("movimientos_financieros");
  });
});

describe("migración 009: seguridad", () => {
  test("activa RLS", () => {
    expect(codigo).toContain("alter table public.evento_finanzas enable row level security;");
  });

  test("SELECT, INSERT, UPDATE y DELETE son solo del admin", () => {
    const admin = "(select private.is_band_admin(banda_id))";

    expect(politica("select")).toContain(`using (${admin})`);
    expect(politica("insert")).toContain(`with check (${admin})`);
    expect(politica("update")).toContain(`using (${admin})`);
    expect(politica("update")).toContain(`with check (${admin})`);
    expect(politica("delete")).toContain(`using (${admin})`);
  });

  test("ser miembro no da acceso", () => {
    expect(codigo).not.toContain("is_band_member");
  });

  test("nada para anon, y un caché no se mueve a otro evento", () => {
    expect(codigo).toContain("revoke all on table public.evento_finanzas from anon, authenticated;");
    expect(codigo).not.toMatch(/grant [^;]* to anon/);
    expect(codigo).toContain("grant update (cache_centimos) on table public.evento_finanzas to authenticated;");
  });

  test("las RPC corren con los permisos de quien llama", () => {
    for (const nombre of ["crear_evento_con_cache", "actualizar_evento_con_cache"]) {
      expect(funcion(nombre)).toContain("security invoker");
      expect(funcion(nombre)).toContain("set search_path = ''");
    }

    expect(codigo).not.toContain("security definer");
    expect(codigo).toMatch(/revoke execute on function public\.crear_evento_con_cache\([^)]*\)\s+from public, anon;/);
    expect(codigo).toMatch(/revoke execute on function public\.actualizar_evento_con_cache\([^)]*\)\s+from public, anon;/);
  });

  test("las RPC reutilizan las de los eventos, sin cambiarlas", () => {
    expect(funcion("crear_evento_con_cache")).toContain("public.crear_evento(");
    expect(funcion("actualizar_evento_con_cache")).toContain("public.actualizar_evento(");
    expect(codigo).not.toMatch(/\bdrop\b/);
    expect(codigo).not.toMatch(/create or replace/);
  });
});
