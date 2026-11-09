// Revisión estática de 007_finanzas_banda.sql: no se ejecuta contra Supabase,
// solo se comprueba que el SQL declara las reglas acordadas.
// Ruta relativa a la raíz del proyecto (cwd de Jest).
const fs = jest.requireActual<{
  readFileSync: (ruta: string, codificacion: "utf8") => string;
}>("fs");

// Git puede dejar el archivo con CRLF en Windows: se normaliza a \n
const sql = fs.readFileSync("supabase/migrations/007_finanzas_banda.sql", "utf8").replace(/\r\n/g, "\n");

// Sin comentarios, para no confundir explicaciones con instrucciones
const codigo = sql
  .split("\n")
  .filter((linea) => !linea.trimStart().startsWith("--"))
  .join("\n");

const TABLA = "movimientos_financieros";

const tabla = (() => {
  const inicio = codigo.indexOf(`create table public.${TABLA} (`);

  if (inicio < 0) {
    throw new Error("Falta la tabla de movimientos");
  }

  return codigo.slice(inicio, codigo.indexOf("\n);", inicio) + 3);
})();

function politica(operacion: "select" | "insert" | "update" | "delete"): string {
  const coincidencia = new RegExp(
    `create policy "[^"]+"\\s+on public\\.${TABLA} for ${operacion} to authenticated([\\s\\S]*?);`
  ).exec(codigo);

  if (coincidencia === null) {
    throw new Error(`Falta la política de ${operacion}`);
  }

  return coincidencia[1];
}

function columna(nombre: string): string {
  const coincidencia = new RegExp(`^  ${nombre} .*$`, "m").exec(tabla);

  if (coincidencia === null) {
    throw new Error(`Falta la columna ${nombre}`);
  }

  return coincidencia[0];
}

describe("migración 007: estructura", () => {
  test("todo va en una transacción y avisa a PostgREST", () => {
    expect(codigo.trim().startsWith("begin;")).toBe(true);
    expect(codigo.trim().endsWith("commit;")).toBe(true);
    expect(codigo).toContain("notify pgrst, 'reload schema';");
  });

  test("el tipo es un enum con solo ingreso y gasto", () => {
    expect(codigo).toMatch(
      /create type public\.tipo_movimiento_financiero as enum \(\s*'ingreso',\s*'gasto'\s*\);/
    );
    expect(columna("tipo")).toContain("public.tipo_movimiento_financiero not null");
  });

  test("el dinero es un entero positivo, nunca un número con decimales", () => {
    expect(columna("importe_centimos")).toContain("bigint not null");
    expect(columna("importe_centimos")).toContain("check (importe_centimos between 1 and 99999999999)");
    expect(tabla).not.toMatch(/\b(float|double precision|real|numeric|money)\b/);
  });

  test("el concepto es obligatorio y no vale vacío", () => {
    expect(columna("concepto")).toContain("text not null");
    expect(tabla).toContain("concepto = btrim(concepto)");
    expect(tabla).toContain("char_length(concepto) between 1 and 120");
  });

  test("fecha económica y created_at son columnas distintas", () => {
    expect(columna("fecha")).toBe("  fecha date not null,");
    expect(columna("created_at")).toContain("timestamptz not null default now()");
  });

  test("evento y notas son opcionales", () => {
    expect(columna("evento_id")).toBe("  evento_id uuid null,");
    expect(columna("notas")).toContain("text null");
  });

  test("creado_por lo pone la base", () => {
    expect(columna("creado_por")).toContain("default auth.uid()");
  });

  test("cada categoría solo vale para su tipo", () => {
    expect(tabla).toMatch(
      /tipo = 'ingreso'\s+and categoria in \('saldo_inicial', 'concierto', 'aportacion', 'merchandising', 'otro'\)/
    );
    expect(tabla).toMatch(
      /tipo = 'gasto'\s+and categoria in \(\s*'transporte',\s*'tecnico',\s*'material',\s*'local_ensayo',\s*'comida',\s*'alojamiento',\s*'promocion',\s*'comision',\s*'otro'\s*\)/
    );
  });

  test("no crea ningún saldo guardado", () => {
    expect(codigo).not.toMatch(/alter table public\.bandas/);
    expect(tabla).not.toMatch(/\bsaldo\b(?!_inicial)/);
  });

  test("hay índices para el historial y para los eventos", () => {
    expect(codigo).toMatch(
      /create index \w+\s+on public\.movimientos_financieros \(banda_id, fecha desc, created_at desc\)/
    );
    expect(codigo).toMatch(
      /create index \w+\s+on public\.movimientos_financieros \(banda_id, evento_id\)\s+where evento_id is not null/
    );
  });

  test("updated_at usa el trigger común", () => {
    expect(codigo).toContain("execute function private.actualizar_updated_at()");
  });
});

describe("migración 007: evento y banda", () => {
  const claveForanea =
    /foreign key \(banda_id, evento_id\)\s+references public\.eventos \(banda_id, id\)/;

  test("la clave compuesta impide apuntar a un evento de otra banda", () => {
    expect(tabla).toMatch(claveForanea);
  });

  test("un evento con movimientos no se puede borrar", () => {
    expect(tabla).toMatch(/references public\.eventos \(banda_id, id\) on delete no action/);
  });

  test("borrar un evento nunca se lleva ni desvincula el dinero", () => {
    expect(tabla).not.toMatch(/references public\.eventos[^\n]*(cascade|set null)/);
  });

  test("no usa nada exclusivo de PostgreSQL 15: ningún set null con lista de columnas", () => {
    expect(sql).not.toMatch(/PostgreSQL 15/);
    expect(codigo).not.toMatch(/set null \(/);
  });
});

describe("migración 007: RLS y permisos", () => {
  test("activa RLS", () => {
    expect(codigo).toContain(`alter table public.${TABLA} enable row level security;`);
  });

  test("SELECT solo para el admin: un miembro normal no ve nada", () => {
    expect(politica("select")).toContain("using ((select private.is_band_admin(banda_id)))");
  });

  test("INSERT solo para el admin y a su nombre", () => {
    const regla = politica("insert");

    expect(regla).toContain("(select private.is_band_admin(banda_id))");
    expect(regla).toContain("creado_por = (select auth.uid())");
  });

  test("UPDATE solo para el admin, antes y después del cambio", () => {
    const regla = politica("update");

    expect(regla).toContain("using ((select private.is_band_admin(banda_id)))");
    expect(regla).toContain("with check ((select private.is_band_admin(banda_id)))");
  });

  test("DELETE solo para el admin", () => {
    expect(politica("delete")).toContain("using ((select private.is_band_admin(banda_id)))");
  });

  test("ninguna política se conforma con ser miembro", () => {
    expect(codigo).not.toContain("is_band_member");
  });

  test("nada para anon", () => {
    expect(codigo).toContain(`revoke all on table public.${TABLA} from anon, authenticated;`);
    expect(codigo).not.toMatch(/grant [^;]* to anon/);
  });

  test("banda_id solo se escribe al insertar y creado_por nunca", () => {
    const insertables = /grant insert \(([^)]*)\)/.exec(codigo)?.[1] ?? "";
    const editables = /grant update \(([^)]*)\)/.exec(codigo)?.[1] ?? "";

    expect(insertables.split(", ")).toEqual([
      "banda_id",
      "tipo",
      "importe_centimos",
      "concepto",
      "categoria",
      "fecha",
      "evento_id",
      "notas",
    ]);
    expect(editables.split(", ")).toEqual([
      "tipo",
      "importe_centimos",
      "concepto",
      "categoria",
      "fecha",
      "evento_id",
      "notas",
    ]);
  });

  test("no hay funciones con permisos elevados: todo pasa por la RLS", () => {
    expect(codigo).not.toContain("security definer");
  });

  test("no debilita nada existente", () => {
    expect(codigo).not.toMatch(/\bdrop\b/);
    expect(codigo).not.toMatch(/alter policy/);
    expect(codigo).not.toMatch(/disable row level security/);
  });
});
