-- Finanzas de la banda: movimientos de dinero (ingresos y gastos).
--
-- Solo el admin de la banda lee y escribe: un miembro normal no ve ni el saldo.
-- El bote no se guarda en ningún sitio: es siempre la suma de los ingresos
-- menos la de los gastos. El dinero que la banda ya tenía se registra como un
-- ingreso de categoría saldo_inicial.
--
--   importe_centimos → entero y siempre positivo; el signo lo decide tipo
--   fecha            → día económico del movimiento, lo elige la app (hora local)
--   created_at       → cuándo se creó el registro; no se usa en los informes
--
-- Todo en una transacción: si algo falla, no se aplica nada.

begin;

create type public.tipo_movimiento_financiero as enum (
  'ingreso',
  'gasto'
);

-- ---------------------------------------------------------------------------
-- MOVIMIENTOS
-- ---------------------------------------------------------------------------
-- banda_id forma parte de la clave foránea hacia eventos, igual que en
-- evento_tecnicos: (banda_id, evento_id) debe existir en la MISMA banda, así
-- que un movimiento no puede apuntar a un evento de otra aunque el cliente
-- envíe los ids a mano. Sin evento (null) la clave no se comprueba.
--
-- Un evento con movimientos no se puede borrar: los informes conservan su
-- contexto y el bote no cambia sin que nadie lo decida. Antes hay que borrar
-- esos movimientos o dejarlos sin evento. "no action" se comprueba al final de
-- la sentencia, igual que en evento_tecnicos (002), y da siempre el error 23503
-- que la app ya interpreta; restrict puede dar otro código según la versión.
-- Borrar la banda completa sigue funcionando: se van también sus movimientos.
--
-- creado_por lo pone la base y no se puede escribir desde el cliente. Admite
-- null solo para que borrar una cuenta no borre ni bloquee las cuentas de la
-- banda; la política de INSERT exige siempre el usuario actual.

create table public.movimientos_financieros (
  id uuid primary key default gen_random_uuid(),
  banda_id uuid not null references public.bandas (id) on delete cascade,
  tipo public.tipo_movimiento_financiero not null,
  -- Máximo 999.999.999,99 €: las sumas siguen siendo enteros exactos en la app
  importe_centimos bigint not null check (importe_centimos between 1 and 99999999999),
  concepto text not null check (
    concepto = btrim(concepto)
    and char_length(concepto) between 1 and 120
  ),
  -- Identificadores estables: las etiquetas en español solo existen en la app
  categoria text not null,
  -- La app envía y recibe YYYY-MM-DD. Sin default: la base va en UTC y cerca
  -- de medianoche pondría otro día
  fecha date not null,
  evento_id uuid null,
  notas text null check (
    notas is null
    or (notas = btrim(notas) and char_length(notas) between 1 and 500)
  ),
  creado_por uuid null default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Cada categoría solo vale para su tipo ('otro' existe en los dos)
  check (
    (
      tipo = 'ingreso'
      and categoria in ('saldo_inicial', 'concierto', 'aportacion', 'merchandising', 'otro')
    )
    or (
      tipo = 'gasto'
      and categoria in (
        'transporte',
        'tecnico',
        'material',
        'local_ensayo',
        'comida',
        'alojamiento',
        'promocion',
        'comision',
        'otro'
      )
    )
  ),
  foreign key (banda_id, evento_id)
    references public.eventos (banda_id, id) on delete no action
);

-- El historial de una banda, en el orden en que se muestra
create index movimientos_financieros_banda_fecha_idx
  on public.movimientos_financieros (banda_id, fecha desc, created_at desc);

-- Para comprobar rápido si un evento tiene movimientos al intentar borrarlo
create index movimientos_financieros_banda_evento_idx
  on public.movimientos_financieros (banda_id, evento_id)
  where evento_id is not null;

create trigger movimientos_financieros_updated_at
  before update on public.movimientos_financieros
  for each row
  execute function private.actualizar_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
-- Ninguna política usa private.is_band_member: pertenecer a la banda no da
-- acceso a sus cuentas.

alter table public.movimientos_financieros enable row level security;

create policy "Solo el admin de la banda ve sus movimientos"
  on public.movimientos_financieros for select to authenticated
  using ((select private.is_band_admin(banda_id)));

create policy "Solo el admin de la banda crea movimientos"
  on public.movimientos_financieros for insert to authenticated
  with check (
    (select private.is_band_admin(banda_id))
    and creado_por = (select auth.uid())
  );

create policy "Solo el admin de la banda edita movimientos"
  on public.movimientos_financieros for update to authenticated
  using ((select private.is_band_admin(banda_id)))
  with check ((select private.is_band_admin(banda_id)));

create policy "Solo el admin de la banda elimina movimientos"
  on public.movimientos_financieros for delete to authenticated
  using ((select private.is_band_admin(banda_id)));

-- ---------------------------------------------------------------------------
-- PERMISOS DE TABLA
-- ---------------------------------------------------------------------------
-- Nada para anon. banda_id solo se escribe al insertar: un movimiento no se
-- puede mover a otra banda. creado_por, created_at y updated_at no se escriben
-- nunca desde el cliente.

revoke all on table public.movimientos_financieros from anon, authenticated;
grant select, delete on table public.movimientos_financieros to authenticated;
grant insert (banda_id, tipo, importe_centimos, concepto, categoria, fecha, evento_id, notas)
  on table public.movimientos_financieros to authenticated;
grant update (tipo, importe_centimos, concepto, categoria, fecha, evento_id, notas)
  on table public.movimientos_financieros to authenticated;

-- PostgREST vuelve a leer el esquema: expone la tabla nueva
notify pgrst, 'reload schema';

commit;
