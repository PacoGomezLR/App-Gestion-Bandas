// Revisión estática de 006_invitaciones_banda.sql: no se ejecuta contra
// Supabase, solo se comprueba que el SQL declara las reglas de seguridad.
// Rutas relativas a la raíz del proyecto (cwd de Jest).
const fs = jest.requireActual<{
  readFileSync: (ruta: string, codificacion: "utf8") => string;
  readdirSync: (ruta: string) => string[];
}>("fs");
const crypto = jest.requireActual<{
  createHash: (algoritmo: "sha256") => { update: (texto: string) => { digest: (formato: "hex") => string } };
}>("crypto");

// Git puede dejar los archivos con CRLF en Windows: se normaliza a \n
function sinComentarios(sql: string): string {
  return sql
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((linea) => !linea.trimStart().startsWith("--"))
    .join("\n");
}

const codigo = sinComentarios(fs.readFileSync("supabase/migrations/006_invitaciones_banda.sql", "utf8"));
const original001 = sinComentarios(fs.readFileSync("supabase/migrations/001_usuarios_roles.sql", "utf8"));

function funcion(nombre: string): string {
  const inicio = codigo.indexOf(`create function ${nombre}(`);

  if (inicio < 0) {
    throw new Error(`Falta la función ${nombre}`);
  }

  return codigo.slice(inicio, codigo.indexOf("$$;", inicio) + 3);
}

const crear = funcion("public.crear_invitacion_banda");
const consultar = funcion("public.consultar_invitacion_banda");
const aceptar = funcion("public.aceptar_invitacion_banda");
const hash = funcion("private.hash_token_invitacion");

// Lo que devuelve cada RPC (la cláusula returns table)
function devuelve(cuerpo: string): string {
  return /returns table \(([^)]*)\)/.exec(cuerpo)?.[1] ?? "";
}

describe("migración 006: estructura", () => {
  test("es una transacción y reutiliza la tabla de 001 sin cambiarla", () => {
    expect(codigo.trim().startsWith("begin;")).toBe(true);
    expect(codigo.trim().endsWith("commit;")).toBe(true);
    expect(original001).toContain("create table public.invitaciones_banda (");
    expect(original001).toContain("token_hash text not null unique");
    expect(codigo).not.toMatch(/create table|alter table|drop /);
    // Ni políticas ni permisos de tabla nuevos: la app sigue sin acceso directo
    expect(codigo).not.toMatch(/create policy|grant [^;]*on table/);
  });

  test("todas las funciones son security definer con search_path vacío", () => {
    for (const cuerpo of [crear, consultar, aceptar]) {
      expect(cuerpo).toContain("security definer");
      expect(cuerpo).toContain("set search_path = ''");
    }
    expect(hash).toContain("set search_path = ''");
  });

  test("grants mínimos: solo authenticated ejecuta las RPC; nadie el helper de hash", () => {
    for (const firma of [
      "public.crear_invitacion_banda(uuid, public.rol_usuario)",
      "public.consultar_invitacion_banda(text)",
      "public.aceptar_invitacion_banda(text)",
    ]) {
      expect(codigo).toContain(`revoke execute on function ${firma} from public, anon;`);
      expect(codigo).toContain(`grant execute on function ${firma} to authenticated;`);
    }
    expect(codigo).toContain(
      "revoke execute on function private.hash_token_invitacion(text) from public, anon, authenticated;"
    );
    expect(codigo).not.toMatch(/grant [^;]* to (anon|public)\b/);
  });

  test("no amplía ningún SELECT privado (bandas, perfiles, invitaciones)", () => {
    expect(codigo).not.toMatch(/grant select/);
    expect(codigo).not.toMatch(/public\.perfiles/);
  });
});

describe("migración 006: crear invitación", () => {
  test("solo un admin de esa banda puede crearla", () => {
    expect(crear).toContain("if not (select private.is_band_admin(p_banda_id)) then");
    expect(crear).toContain("errcode = '42501'");
    // La comprobación va antes de generar o guardar nada
    expect(crear.indexOf("is_band_admin")).toBeLessThan(crear.indexOf("gen_random_bytes"));
    expect(crear.indexOf("is_band_admin")).toBeLessThan(crear.indexOf("insert into"));
  });

  test("el rol se valida con el tipo de 001 y no puede ser nulo", () => {
    expect(crear).toContain("p_rol public.rol_usuario");
    expect(crear).toContain("if p_rol is null then");
  });

  test("creada_por sale de auth.uid() y la banda del parámetro ya validado", () => {
    expect(crear).toMatch(/insert into public\.invitaciones_banda \(banda_id, rol, token_hash, creada_por, expires_at\)/);
    expect(crear).toContain("(p_banda_id, p_rol, private.hash_token_invitacion(v_token), (select auth.uid()), v_caduca)");
    expect(crear).not.toMatch(/p_creada_por|p_usuario/);
  });

  test("token aleatorio seguro y solo se guarda su hash", () => {
    expect(codigo).toContain("create extension if not exists pgcrypto with schema extensions;");
    expect(crear).toContain("v_token := encode(extensions.gen_random_bytes(32), 'hex');");
    expect(hash).toContain("pg_catalog.sha256(convert_to(p_token, 'UTF8'))");
    // En la tabla va el hash, nunca v_token directamente
    expect(crear).not.toMatch(/values \([^)]*\bv_token\b(?!\))/);
    expect(codigo).not.toMatch(/random\(\)/);
  });

  test("la caducidad la decide la base, en un solo sitio", () => {
    expect(crear).toContain("v_caduca timestamptz := now() + interval '7 days';");
    expect(codigo.match(/interval '/g)).toHaveLength(1);
  });

  test("devuelve el token una vez y nada más: ni hash ni correos", () => {
    expect(devuelve(crear)).toBe("token text, expires_at timestamptz");
  });
});

describe("migración 006: consultar y aceptar", () => {
  test("ninguna RPC devuelve email, token_hash, creada_por ni el rol", () => {
    for (const cuerpo of [crear, consultar, aceptar]) {
      expect(devuelve(cuerpo)).not.toMatch(/email|token_hash|creada_por|rol/);
    }
    expect(devuelve(consultar)).toBe("estado text, banda_nombre text");
    expect(devuelve(aceptar)).toBe("resultado text, banda_id uuid, banda_nombre text");
  });

  test("comparan siempre por el hash del token recibido", () => {
    for (const cuerpo of [consultar, aceptar]) {
      expect(cuerpo).toContain("where invitacion.token_hash = private.hash_token_invitacion(coalesce(p_token, ''))");
    }
  });

  test("exigen sesión", () => {
    expect(consultar).toContain("if (select auth.uid()) is null then");
    expect(aceptar).toContain("if v_usuario is null then");
  });

  test("consultar solo da el nombre de la banda si la invitación vale o ya eres de ella", () => {
    expect(consultar).toContain("return query select 'no_valida'::text, null::text;");
    expect(consultar).toContain("return query select 'usada'::text, null::text;");
    expect(consultar).toContain("return query select 'caducada'::text, null::text;");
    expect(consultar).toContain("return query select 'valida'::text, v_invitacion.nombre;");
  });

  test("aceptar: el cliente no elige el rol; se usa el de la invitación", () => {
    expect(aceptar).toMatch(/create function public\.aceptar_invitacion_banda\(p_token text\)/);
    expect(aceptar).not.toContain("p_rol");
    expect(aceptar).toContain("values (v_invitacion.banda_id, v_usuario, v_invitacion.rol);");
  });

  test("aceptar comprueba caducidad y uso, y marca usada_at en la misma operación", () => {
    expect(aceptar).toContain("if v_invitacion.usada_at is not null then");
    expect(aceptar).toContain("if v_invitacion.expires_at <= now() then");
    expect(aceptar).toContain("set usada_at = now()");
    // Comprobaciones antes de escribir; la pertenencia y usada_at van juntas al final
    expect(aceptar.indexOf("expires_at <= now()")).toBeLessThan(aceptar.indexOf("insert into public.banda_usuarios"));
    expect(aceptar.indexOf("insert into public.banda_usuarios")).toBeLessThan(aceptar.indexOf("set usada_at = now()"));
  });

  test("concurrencia: bloquea la fila de la invitación antes de decidir", () => {
    expect(aceptar).toContain("for update of invitacion;");
    expect(aceptar.indexOf("for update")).toBeLessThan(aceptar.indexOf("if v_invitacion.usada_at"));
  });

  test("si ya es integrante no duplica, no cambia su rol y no gasta la invitación", () => {
    const yaMiembro = aceptar.indexOf("'ya_miembro'::text");
    expect(yaMiembro).toBeGreaterThan(-1);
    // Se responde antes de cualquier escritura
    expect(yaMiembro).toBeLessThan(aceptar.indexOf("insert into public.banda_usuarios"));
    expect(aceptar).not.toMatch(/update public\.banda_usuarios|on conflict/);
  });

  test("un token inexistente no da ningún dato", () => {
    expect(aceptar).toContain("return query select 'no_valida'::text, null::uuid, null::text;");
  });
});

// 006 ya está ejecutada en Supabase: su contenido queda fijado
describe("migraciones ejecutadas", () => {
  test("006 no ha cambiado desde que se ejecutó", () => {
    const sql = fs.readFileSync("supabase/migrations/006_invitaciones_banda.sql", "utf8").replace(/\r\n/g, "\n");

    expect(crypto.createHash("sha256").update(sql).digest("hex")).toBe(
      "dcaba45ef9c329d44e212402afc1cc9fbc9d75b442e6f9148e778541170af288"
    );
  });

  test("después de 006 solo están 007, 008, 009 y 010", () => {
    expect(fs.readdirSync("supabase/migrations").sort()).toEqual([
      "001_usuarios_roles.sql",
      "002_datos_banda.sql",
      "003_retirar_miembros.sql",
      "004_disponibilidad_usuarios.sql",
      "005_nombre_visible_registro.sql",
      "006_invitaciones_banda.sql",
      "007_finanzas_banda.sql",
      "008_categorias_finanzas.sql",
      "009_cache_eventos.sql",
      "010_google_maps_eventos.sql",
    ]);
  });
});
