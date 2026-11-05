// Revisión estática de 005_nombre_visible_registro.sql: no se ejecuta contra
// Supabase. Ruta relativa a la raíz del proyecto (cwd de Jest).
const fs = jest.requireActual<{
  readFileSync: (ruta: string, codificacion: "utf8") => string;
}>("fs");

// Git puede dejar el archivo con CRLF en Windows: se normaliza a \n
function sinComentarios(sql: string): string {
  return sql
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((linea) => !linea.trimStart().startsWith("--"))
    .join("\n");
}

const codigo = sinComentarios(
  fs.readFileSync("supabase/migrations/005_nombre_visible_registro.sql", "utf8")
);
const original001 = sinComentarios(fs.readFileSync("supabase/migrations/001_usuarios_roles.sql", "utf8"));

describe("migración 005: nombre visible desde el registro", () => {
  test("es una transacción mínima que solo redefine la función del trigger de 001", () => {
    expect(codigo.trim().startsWith("begin;")).toBe(true);
    expect(codigo.trim().endsWith("commit;")).toBe(true);
    // La función existe en 001 con ese nombre y la usa el trigger al_crear_usuario_auth
    expect(original001).toContain("create function private.crear_perfil_usuario()");
    expect(original001).toContain("execute function private.crear_perfil_usuario();");
    expect(codigo).toContain("create or replace function private.crear_perfil_usuario()");
    // Nada más: ni triggers, ni tablas, ni políticas, ni permisos nuevos
    expect(codigo).not.toMatch(/create (trigger|table|policy)|alter table|drop |grant /);
  });

  test("conserva security definer, search_path vacío y el revoke de 001", () => {
    expect(codigo).toContain("returns trigger");
    expect(codigo).toContain("security definer");
    expect(codigo).toContain("set search_path = ''");
    expect(codigo).toContain(
      "revoke execute on function private.crear_perfil_usuario() from public, anon, authenticated;"
    );
  });

  test("sigue creando el perfil con id y email, y añade nombre_visible", () => {
    expect(codigo).toContain("insert into public.perfiles (id, email, nombre_visible)");
    expect(codigo).toContain("values (new.id, coalesce(new.email, ''), v_nombre);");
    expect(codigo).toContain("return new;");
  });

  test("normaliza el nombre de los metadatos con btrim y la regla de 2-80 caracteres", () => {
    expect(codigo).toContain("btrim(coalesce(new.raw_user_meta_data ->> 'nombre_visible', ''))");
    expect(codigo).toMatch(/if char_length\(v_nombre\) not between 2 and 80 then\s+v_nombre := null;/);
  });

  test("de los metadatos solo se lee nombre_visible: nunca rol, banda, email ni id", () => {
    const claves = [...codigo.matchAll(/raw_user_meta_data\s*->>?\s*'([^']+)'/g)].map(([, clave]) => clave);

    expect(claves).toEqual(["nombre_visible"]);
    expect(codigo).not.toMatch(/banda_usuarios|bandas|rol_usuario|\brol\b/);
  });
});
