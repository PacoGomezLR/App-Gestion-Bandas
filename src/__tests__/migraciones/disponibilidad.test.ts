// Revisión estática de 004_disponibilidad_usuarios.sql: no se ejecuta contra
// Supabase, solo se comprueba que el SQL declara las reglas acordadas.
// Ruta relativa a la raíz del proyecto (cwd de Jest).
const fs = jest.requireActual<{
  readFileSync: (ruta: string, codificacion: "utf8") => string;
}>("fs");

const sql = fs.readFileSync("supabase/migrations/004_disponibilidad_usuarios.sql", "utf8");

// Sin comentarios, para no confundir explicaciones con instrucciones
const codigo = sql
  .split("\n")
  .filter((linea) => !linea.trimStart().startsWith("--"))
  .join("\n");

function politica(tabla: string, operacion: "select" | "insert" | "update" | "delete"): string | null {
  const coincidencia = new RegExp(
    `create policy "[^"]+"\\s+on public\\.${tabla}\\s+for ${operacion}\\s+to authenticated([\\s\\S]*?);`
  ).exec(codigo);

  return coincidencia === null ? null : coincidencia[1];
}

function politicaObligatoria(tabla: string, operacion: "select" | "insert" | "update" | "delete"): string {
  const regla = politica(tabla, operacion);

  if (regla === null) {
    throw new Error(`Falta la política de ${operacion} en ${tabla}`);
  }

  return regla;
}

// Cuerpo de la RPC de integrantes
const rpc = (() => {
  const inicio = codigo.indexOf("create function public.listar_integrantes_banda(");
  const fin = codigo.indexOf("$$;", inicio);

  if (inicio < 0 || fin < 0) {
    throw new Error("Falta la RPC listar_integrantes_banda");
  }

  return codigo.slice(inicio, fin + 3);
})();

const TABLA = "indisponibilidades_usuario";
const tablaIndisponibilidades = (() => {
  const inicio = codigo.indexOf(`create table public.${TABLA} (`);
  return codigo.slice(inicio, codigo.indexOf(");", inicio) + 2);
})();

describe("migración 004: nombre visible", () => {
  test("todo va en una transacción y avisa a PostgREST", () => {
    expect(codigo.trim().startsWith("begin;")).toBe(true);
    expect(codigo.trim().endsWith("commit;")).toBe(true);
    expect(codigo).toContain("notify pgrst, 'reload schema';");
  });

  test("añade perfiles.nombre_visible, nullable y con límites razonables", () => {
    expect(codigo).toMatch(/alter table public\.perfiles\s+add column nombre_visible text null/);
    expect(codigo).toContain("nombre_visible is null");
    expect(codigo).toContain("nombre_visible = btrim(nombre_visible)");
    expect(codigo).toContain("char_length(nombre_visible) between 2 and 80");
  });

  test("no concede UPDATE general de perfiles: solo la columna nombre_visible", () => {
    expect(codigo).toContain("grant update (nombre_visible) on table public.perfiles to authenticated;");
    expect(codigo).not.toMatch(/grant (all|update) on table public\.perfiles/);
    expect(codigo).not.toMatch(/grant update \([^)]*(email|id|created_at)[^)]*\) on table public\.perfiles/);
  });

  test("solo se puede actualizar el perfil propio, sin excepción para admin", () => {
    const regla = politicaObligatoria("perfiles", "update");

    expect(regla).toMatch(/using \(id = \(select auth\.uid\(\)\)\)/);
    expect(regla).toMatch(/with check \(id = \(select auth\.uid\(\)\)\)/);
    expect(regla).not.toContain("is_band_admin");
  });

  test("no amplía la lectura de perfiles (el email sigue siendo privado)", () => {
    expect(politica("perfiles", "select")).toBeNull();
    expect(codigo).not.toMatch(/grant select[^;]*on table public\.perfiles/);
  });
});

describe("migración 004: RPC listar_integrantes_banda", () => {
  test("devuelve solo usuario_id y nombre_visible, nunca email ni rol", () => {
    expect(rpc).toContain("returns table (usuario_id uuid, nombre_visible text)");
    expect(rpc).toContain("select pertenencia.usuario_id, perfil.nombre_visible");
    expect(rpc).not.toMatch(/email|\brol\b|\*/);
  });

  test("exige que quien llama pertenezca a la banda antes de devolver nada", () => {
    const comprobacion = rpc.indexOf("if not (select private.is_band_member(p_banda_id)) then");
    const consulta = rpc.indexOf("return query");

    expect(comprobacion).toBeGreaterThan(-1);
    expect(rpc).toContain("raise exception 'Banda no disponible' using errcode = '42501';");
    expect(comprobacion).toBeLessThan(consulta);
    // Y solo filas de ESA banda
    expect(rpc).toContain("where pertenencia.banda_id = p_banda_id");
  });

  test("security definer protegido: search_path vacío y tablas con esquema", () => {
    expect(rpc).toContain("security definer");
    expect(rpc).toContain("set search_path = ''");
    expect(rpc).toContain("from public.banda_usuarios as pertenencia");
    expect(rpc).toContain("left join public.perfiles as perfil");
  });

  test("solo authenticated puede ejecutarla", () => {
    expect(codigo).toContain(
      "revoke execute on function public.listar_integrantes_banda(uuid) from public, anon;"
    );
    expect(codigo).toContain(
      "grant execute on function public.listar_integrantes_banda(uuid) to authenticated;"
    );
    expect(codigo).not.toMatch(/grant execute on function public\.listar_integrantes_banda\(uuid\) to (public|anon)/);
  });
});

describe("migración 004: indisponibilidades", () => {
  test("tabla con RLS y solo id, banda_id, usuario_id, fecha y created_at", () => {
    expect(codigo).toContain(`alter table public.${TABLA} enable row level security;`);

    const columnas = [...tablaIndisponibilidades.matchAll(/^\s{2}(\w+) (uuid|date|timestamptz)/gm)].map(
      ([, nombre]) => nombre
    );
    expect(columnas).toEqual(["id", "banda_id", "usuario_id", "fecha", "created_at"]);
  });

  test("ya no existe nota ni updated_at", () => {
    expect(tablaIndisponibilidades).not.toMatch(/\bnota\b/);
    expect(tablaIndisponibilidades).not.toContain("updated_at");
    expect(codigo).not.toMatch(/\bnota\b/);
    expect(codigo).not.toContain("actualizar_updated_at");
  });

  test("un día por usuario y banda, y solo para integrantes de esa banda", () => {
    expect(tablaIndisponibilidades).toContain("unique (banda_id, usuario_id, fecha)");
    expect(tablaIndisponibilidades).toMatch(
      /foreign key \(banda_id, usuario_id\)\s+references public\.banda_usuarios \(banda_id, usuario_id\) on delete cascade/
    );
    expect(codigo).toMatch(new RegExp(`create index \\w+\\s+on public\\.${TABLA} \\(banda_id, fecha\\);`));
  });

  test("SELECT por pertenencia a la banda", () => {
    const regla = politicaObligatoria(TABLA, "select");

    expect(regla).toContain("private.is_band_member(banda_id)");
    expect(regla).not.toContain("auth.uid()");
  });

  test.each(["insert", "delete"] as const)("%s exige usuario_id = auth.uid() y pertenencia", (operacion) => {
    const regla = politicaObligatoria(TABLA, operacion);

    expect(regla).toContain("usuario_id = (select auth.uid())");
    expect(regla).toContain("private.is_band_member(banda_id)");
  });

  test("sin UPDATE: ni política ni permiso (marcar = insert, desmarcar = delete)", () => {
    expect(politica(TABLA, "update")).toBeNull();
    expect(codigo).not.toMatch(new RegExp(`grant[^;]*update[^;]*on table public\\.${TABLA}`));
    expect(codigo).toContain(`grant select, delete on table public.${TABLA} to authenticated;`);
    expect(codigo).toContain(`grant insert (banda_id, usuario_id, fecha)\n  on table public.${TABLA} to authenticated;`);
  });

  test("el rol admin no da ninguna excepción sobre días ni nombres ajenos", () => {
    expect(codigo).not.toContain("is_band_admin");
    expect(codigo).not.toMatch(/rol\s*=|'admin'/);
  });

  test("nada para anon y no toca eventos, técnicos ni sus RPC", () => {
    expect(codigo).toContain(`revoke all on table public.${TABLA} from anon, authenticated;`);
    expect(codigo).not.toMatch(/grant [^;]*to anon/);
    expect(codigo).not.toMatch(/public\.(eventos|tecnicos|evento_tecnicos|crear_evento|actualizar_evento)\b/);
  });
});
