-- Enlace de Google Maps de cada evento: el que el admin pega tal cual, para que
-- cualquier integrante llegue al sitio. Complementa a lugar, no lo sustituye.
--
-- Lo ve toda la banda, como el resto del evento: no es un dato privado. Las
-- políticas RLS de eventos (002) no cambian.
--
-- Los eventos se escriben siempre con sus RPC (003 y 009), así que se vuelven a
-- crear con un parámetro más, p_google_maps_url, que va al final y con default:
--   null    → al crear, sin enlace; al editar, el enlace no cambia. Así una
--             versión anterior de la app, que no lo envía, no borra el que hay
--   ''      → sin enlace (al editar, lo quita)
--   texto   → ese enlace, recortado
-- Qué enlaces son de Google Maps lo decide la app; aquí solo se impide guardar
-- algo absurdo.
--
-- Todo en una transacción: si algo falla, no se aplica nada.

begin;

-- ---------------------------------------------------------------------------
-- COLUMNA
-- ---------------------------------------------------------------------------

alter table public.eventos
  add column google_maps_url text null
  check (
    google_maps_url is null
    or (
      google_maps_url = btrim(google_maps_url)
      and char_length(google_maps_url) between 1 and 2048
      -- Solo https: nunca javascript:, file:, intent: ni http
      and left(google_maps_url, 8) = 'https://'
    )
  );

-- Mismo criterio que el resto de columnas de eventos (002): se escribe al crear
-- y al editar, siempre con la RLS de admin
grant insert (google_maps_url) on table public.eventos to authenticated;
grant update (google_maps_url) on table public.eventos to authenticated;

-- ---------------------------------------------------------------------------
-- RPC ANTIGUAS (firmas exactas de 003 y 009)
-- ---------------------------------------------------------------------------
-- Se eliminan antes de crear las nuevas: con otra lista de parámetros serían
-- sobrecargas distintas y PostgREST podría seguir encontrando la antigua.
-- Sin "if exists" a propósito: si la firma no coincide con la de la base,
-- la migración falla entera en vez de dejar la antigua viva.

drop function public.crear_evento_con_cache(uuid, text, text, date, text, text, text, text, uuid[], bigint);
drop function public.actualizar_evento_con_cache(uuid, uuid, text, text, date, text, text, text, text, uuid[], bigint);
drop function public.crear_evento(uuid, text, text, date, text, text, text, text, uuid[]);
drop function public.actualizar_evento(uuid, uuid, text, text, date, text, text, text, text, uuid[]);

-- ---------------------------------------------------------------------------
-- EVENTO + TÉCNICOS (+ ENLACE) EN UNA SOLA TRANSACCIÓN
-- ---------------------------------------------------------------------------
-- El cuerpo es el de 003 con la columna nueva. security invoker: permisos y
-- RLS de quien llama.

create function public.crear_evento(
  p_banda_id uuid,
  p_titulo text,
  p_tipo text,
  p_fecha date,
  p_hora text,
  p_lugar text,
  p_notas text,
  p_estado text,
  p_tecnico_ids uuid[],
  p_google_maps_url text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_evento_id uuid;
begin
  insert into public.eventos (banda_id, titulo, tipo, fecha, hora, lugar, notas, estado, google_maps_url)
  values (
    p_banda_id,
    btrim(p_titulo),
    p_tipo,
    p_fecha,
    nullif(btrim(coalesce(p_hora, '')), '')::time,
    btrim(coalesce(p_lugar, '')),
    btrim(coalesce(p_notas, '')),
    p_estado,
    nullif(btrim(coalesce(p_google_maps_url, '')), '')
  )
  returning id into v_evento_id;

  insert into public.evento_tecnicos (banda_id, evento_id, tecnico_id, orden)
  select p_banda_id, v_evento_id, asignacion.id, asignacion.orden
  from unnest(coalesce(p_tecnico_ids, '{}'::uuid[])) with ordinality as asignacion (id, orden);

  return v_evento_id;
end;
$$;

-- Actualiza el evento de ESA banda y sustituye sus técnicos. No cambia
-- banda_id: el evento se busca por id y banda.
create function public.actualizar_evento(
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
  p_google_maps_url text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.eventos
  set
    titulo = btrim(p_titulo),
    tipo = p_tipo,
    fecha = p_fecha,
    hora = nullif(btrim(coalesce(p_hora, '')), '')::time,
    lugar = btrim(coalesce(p_lugar, '')),
    notas = btrim(coalesce(p_notas, '')),
    estado = p_estado,
    -- Sin el parámetro, el enlace se queda como estaba
    google_maps_url = case
      when p_google_maps_url is null then google_maps_url
      else nullif(btrim(p_google_maps_url), '')
    end
  where id = p_evento_id
    and banda_id = p_banda_id;

  -- Sin fila: no existe en esa banda o la RLS no permite editarlo
  if not found then
    raise exception 'Evento no disponible' using errcode = 'P0002';
  end if;

  delete from public.evento_tecnicos where evento_id = p_evento_id;

  insert into public.evento_tecnicos (banda_id, evento_id, tecnico_id, orden)
  select p_banda_id, p_evento_id, asignacion.id, asignacion.orden
  from unnest(coalesce(p_tecnico_ids, '{}'::uuid[])) with ordinality as asignacion (id, orden);
end;
$$;

-- ---------------------------------------------------------------------------
-- EVENTO + CACHÉ (+ ENLACE) EN UNA SOLA TRANSACCIÓN
-- ---------------------------------------------------------------------------
-- El cuerpo es el de 009 pasando el enlace a las de arriba.

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
  p_cache_centimos bigint,
  p_google_maps_url text default null
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
    p_banda_id, p_titulo, p_tipo, p_fecha, p_hora, p_lugar, p_notas, p_estado, p_tecnico_ids,
    p_google_maps_url
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
  p_cache_centimos bigint,
  p_google_maps_url text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform public.actualizar_evento(
    p_evento_id, p_banda_id, p_titulo, p_tipo, p_fecha, p_hora, p_lugar, p_notas, p_estado,
    p_tecnico_ids, p_google_maps_url
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

-- Mismo patrón que 003 y 009: nadie salvo authenticated puede ejecutarlas
revoke execute on function public.crear_evento(uuid, text, text, date, text, text, text, text, uuid[], text)
  from public, anon;
revoke execute on function public.actualizar_evento(uuid, uuid, text, text, date, text, text, text, text, uuid[], text)
  from public, anon;
revoke execute on function public.crear_evento_con_cache(uuid, text, text, date, text, text, text, text, uuid[], bigint, text)
  from public, anon;
revoke execute on function public.actualizar_evento_con_cache(uuid, uuid, text, text, date, text, text, text, text, uuid[], bigint, text)
  from public, anon;
grant execute on function public.crear_evento(uuid, text, text, date, text, text, text, text, uuid[], text)
  to authenticated;
grant execute on function public.actualizar_evento(uuid, uuid, text, text, date, text, text, text, text, uuid[], text)
  to authenticated;
grant execute on function public.crear_evento_con_cache(uuid, text, text, date, text, text, text, text, uuid[], bigint, text)
  to authenticated;
grant execute on function public.actualizar_evento_con_cache(uuid, uuid, text, text, date, text, text, text, text, uuid[], bigint, text)
  to authenticated;

-- PostgREST vuelve a leer el esquema: expone la columna y las firmas nuevas
notify pgrst, 'reload schema';

commit;
