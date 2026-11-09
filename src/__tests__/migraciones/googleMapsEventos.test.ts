// Revisión estática de 010_google_maps_eventos.sql: no se ejecuta contra
// Supabase, solo se comprueba que el SQL declara las reglas acordadas.
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
const codigo = leer("010_google_maps_eventos.sql")
  .split("\n")
  .filter((linea) => !linea.trimStart().startsWith("--"))
  .join("\n");

function funcion(nombre: string): string {
  const inicio = codigo.indexOf(`create function public.${nombre}(`);

  if (inicio < 0) {
    throw new Error(`Falta la función ${nombre}`);
  }

  return codigo.slice(inicio, codigo.indexOf("$$;", inicio) + 3);
}

describe("migración 010: columna", () => {
  test("todo va en una transacción y avisa a PostgREST", () => {
    expect(codigo.trim().startsWith("begin;")).toBe(true);
    expect(codigo.trim().endsWith("commit;")).toBe(true);
    expect(codigo).toContain("notify pgrst, 'reload schema';");
  });

  test("solo añade una columna de texto opcional a eventos", () => {
    expect(codigo.match(/alter table/g)).toHaveLength(1);
    expect(codigo).toMatch(/alter table public\.eventos\s+add column google_maps_url text null/);
  });

  test("la base impide valores absurdos: sin espacios, hasta 2048 y solo https", () => {
    expect(codigo).toContain("google_maps_url is null");
    expect(codigo).toContain("google_maps_url = btrim(google_maps_url)");
    expect(codigo).toContain("char_length(google_maps_url) between 1 and 2048");
    expect(codigo).toContain("left(google_maps_url, 8) = 'https://'");
  });

  test("solo concede escribir la columna nueva, como las demás de eventos", () => {
    expect(codigo).toContain("grant insert (google_maps_url) on table public.eventos to authenticated;");
    expect(codigo).toContain("grant update (google_maps_url) on table public.eventos to authenticated;");
    expect(codigo).not.toMatch(/grant [^;]* to anon/);
  });

  test("no toca la RLS ni otras tablas", () => {
    expect(codigo).not.toMatch(/create policy|alter policy|drop policy|row level security/);
    expect(codigo).not.toMatch(/\b(create|drop) table\b/);
    expect(codigo).not.toMatch(/alter table public\.(?!eventos)/);
    expect(codigo).not.toContain("movimientos_financieros");
  });
});

describe("migración 010: RPC de eventos", () => {
  test("sustituye las cuatro RPC por sus firmas exactas anteriores, sin if exists", () => {
    for (const firma of [
      "crear_evento_con_cache(uuid, text, text, date, text, text, text, text, uuid[], bigint)",
      "actualizar_evento_con_cache(uuid, uuid, text, text, date, text, text, text, text, uuid[], bigint)",
      "crear_evento(uuid, text, text, date, text, text, text, text, uuid[])",
      "actualizar_evento(uuid, uuid, text, text, date, text, text, text, text, uuid[])",
    ]) {
      expect(codigo).toContain(`drop function public.${firma};`);
    }

    expect(codigo).not.toContain("if exists");
  });

  test.each(["crear_evento", "actualizar_evento", "crear_evento_con_cache", "actualizar_evento_con_cache"])(
    "%s recibe el enlace al final, con default, y corre con los permisos de quien llama",
    (nombre) => {
      const cuerpo = funcion(nombre);

      expect(cuerpo).toMatch(/p_google_maps_url text default null\s*\)/);
      expect(cuerpo).toContain("security invoker");
      expect(cuerpo).toContain("set search_path = ''");
    }
  );

  test("al crear, sin enlace o vacío queda null", () => {
    expect(funcion("crear_evento")).toContain("nullif(btrim(coalesce(p_google_maps_url, '')), '')");
  });

  test("al editar, sin el parámetro el enlace no cambia y vacío lo quita", () => {
    const cuerpo = funcion("actualizar_evento");

    expect(cuerpo).toContain("when p_google_maps_url is null then google_maps_url");
    expect(cuerpo).toContain("else nullif(btrim(p_google_maps_url), '')");
  });

  test("las de caché pasan el enlace a las de eventos", () => {
    expect(funcion("crear_evento_con_cache")).toMatch(/public\.crear_evento\([^;]*p_google_maps_url\s*\);/);
    expect(funcion("actualizar_evento_con_cache")).toMatch(
      /public\.actualizar_evento\([^;]*p_google_maps_url\s*\);/
    );
  });

  test("ninguna función con permisos elevados, y solo authenticated las ejecuta", () => {
    expect(codigo).not.toContain("security definer");
    expect(codigo.match(/revoke execute on function/g)).toHaveLength(4);
    expect(codigo.match(/grant execute on function/g)).toHaveLength(4);
    expect(codigo).not.toMatch(/grant execute[^;]* to anon/);
  });
});

// 001–009 ya están ejecutadas en Supabase: su contenido queda fijado
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
  ])("%s no ha cambiado", (nombre, huella) => {
    expect(crypto.createHash("sha256").update(leer(nombre)).digest("hex")).toBe(huella);
  });
});
