-- Caché acordado de cada evento: lo pactado por la actuación.
--
-- Va en una tabla aparte porque public.eventos la leen todos los miembros y
-- este dato solo pueden verlo los admin de la banda.
--
--   fila existente → hay caché registrado (0 es un valor válido: actuación sin caché)
--   sin fila       → todavía no hay caché registrado
--
-- El caché no es dinero del bote: nada de esto crea movimientos financieros ni
-- participa en sus cálculos.
--
-- Todo en una transacción: si algo falla, no se aplica nada.

begin;

-- ---------------------------------------------------------------------------
-- CACHÉ DE EVENTOS
-- ---------------------------------------------------------------------------
-- La clave primaria hace de todo: un solo caché por evento, listado por banda
-- y borrado en cascada. banda_id forma parte de la clave foránea, igual que en
-- evento_tecnicos: (banda_id, evento_id) debe existir en la MISMA banda.
--
-- Borrar un evento borra su caché: solo existe ligado a él. Un evento con
-- movimientos financieros sigue sin poder borrarse (007), y al rechazarse el
-- borrado su caché se queda.

create table public.evento_finanzas (
  banda_id uuid not null,
  evento_id uuid not null,
  -- Mismo máximo que importe_centimos, pero aquí 0 sí es válido
  cache_centimos bigint not null check (cache_centimos between 0 and 99999999999),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (banda_id, evento_id),
  foreign key (banda_id, evento_id)
    references public.eventos (banda_id, id) on delete cascade
);

create trigger evento_finanzas_updated_at
  before update on public.evento_finanzas
  for each row
  execute function private.actualizar_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
-- Ninguna política usa private.is_band_member: ver el evento no da acceso a su
-- caché.

alter table public.evento_finanzas enable row level security;

create policy "Solo el admin de la banda ve los cachés"
  on public.evento_finanzas for select to authenticated
  using ((select private.is_band_admin(banda_id)));

create policy "Solo el admin de la banda crea cachés"
  on public.evento_finanzas for insert to authenticated
  with check ((select private.is_band_admin(banda_id)));

create policy "Solo el admin de la banda edita cachés"
  on public.evento_finanzas for update to authenticated
  using ((select private.is_band_admin(banda_id)))
  with check ((select private.is_band_admin(banda_id)));

create policy "Solo el admin de la banda elimina cachés"
  on public.evento_finanzas for delete to authenticated
  using ((select private.is_band_admin(banda_id)));

-- ---------------------------------------------------------------------------
-- PERMISOS DE TABLA
-- ---------------------------------------------------------------------------
-- Nada para anon. Banda y evento solo se escriben al insertar: un caché no se
-- puede mover a otro evento.

revoke all on table public.evento_finanzas from anon, authenticated;
grant select, delete on table public.evento_finanzas to authenticated;
grant insert (banda_id, evento_id, cache_centimos)
  on table public.evento_finanzas to authenticated;
grant update (cache_centimos) on table public.evento_finanzas to authenticated;

-- ---------------------------------------------------------------------------
-- EVENTO + CACHÉ EN UNA SOLA TRANSACCIÓN
-- ---------------------------------------------------------------------------
-- Envuelven crear_evento y actualizar_evento (003), que no cambian.
-- security invoker: se ejecutan con los permisos y la RLS de quien llama. Si
-- falla cualquier parte, PostgreSQL deshace la llamada completa: nunca queda un
-- evento guardado con su caché perdido.

create function public.crear_evento_con_cache(
  p_banda_id uuid,
  p_titulo text,
  p_tipo text,
  p_fecha date,
  p_hora text,
  p_lugar text,
  p_notas text,
  p_estado text,
  p_tecnico_ids uuid[],
  p_cache_centimos bigint
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_evento_id uuid;
begin
  v_evento_id := public.crear_evento(
    p_banda_id, p_titulo, p_tipo, p_fecha, p_hora, p_lugar, p_notas, p_estado, p_tecnico_ids
  );

  insert into public.evento_finanzas (banda_id, evento_id, cache_centimos)
  values (p_banda_id, v_evento_id, p_cache_centimos);

  return v_evento_id;
end;
$$;

-- p_cache_centimos null borra el caché: el evento vuelve a no tenerlo registrado
create function public.actualizar_evento_con_cache(
  p_evento_id uuid,
  p_banda_id uuid,
  p_titulo text,
  p_tipo text,
  p_fecha date,
  p_hora text,
  p_lugar text,
  p_notas text,
  p_estado text,
  p_tecnico_ids uuid[],
  p_cache_centimos bigint
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform public.actualizar_evento(
    p_evento_id, p_banda_id, p_titulo, p_tipo, p_fecha, p_hora, p_lugar, p_notas, p_estado, p_tecnico_ids
  );

  if p_cache_centimos is null then
    delete from public.evento_finanzas
    where banda_id = p_banda_id
      and evento_id = p_evento_id;
  else
    insert into public.evento_finanzas (banda_id, evento_id, cache_centimos)
    values (p_banda_id, p_evento_id, p_cache_centimos)
    on conflict (banda_id, evento_id)
    do update set cache_centimos = excluded.cache_centimos;
  end if;
end;
$$;

-- Mismo patrón que 003: nadie salvo authenticated puede ejecutarlas
revoke execute on function public.crear_evento_con_cache(uuid, text, text, date, text, text, text, text, uuid[], bigint)
  from public, anon;
revoke execute on function public.actualizar_evento_con_cache(uuid, uuid, text, text, date, text, text, text, text, uuid[], bigint)
  from public, anon;
grant execute on function public.crear_evento_con_cache(uuid, text, text, date, text, text, text, text, uuid[], bigint)
  to authenticated;
grant execute on function public.actualizar_evento_con_cache(uuid, uuid, text, text, date, text, text, text, text, uuid[], bigint)
  to authenticated;

-- PostgREST vuelve a leer el esquema: expone la tabla y las funciones nuevas
notify pgrst, 'reload schema';

commit;
