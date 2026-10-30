-- Retira el legado de músicos: los integrantes de una banda son sus usuarios
-- (banda_usuarios, 001). Técnicos y eventos no cambian.
--
-- 1) Sustituye crear_evento y actualizar_evento por versiones sin p_miembro_ids.
--    El cuerpo es el de 002 sin las líneas de evento_miembros.
-- 2) Elimina public.evento_miembros y después public.miembros.
--
-- Sin cascade: nada más depende de estas tablas. Sus políticas RLS, índices,
-- trigger (miembros_updated_at) y permisos se eliminan con ellas.
-- private.actualizar_updated_at se mantiene: la usan tecnicos y eventos.
--
-- Todo en una transacción: si algo falla, no se aplica nada.

begin;

-- ---------------------------------------------------------------------------
-- RPC ANTIGUAS (firmas exactas de 002)
-- ---------------------------------------------------------------------------
-- Se eliminan antes de crear las nuevas: con otra lista de parámetros serían
-- sobrecargas distintas y PostgREST podría seguir encontrando la antigua.
-- Sin "if exists" a propósito: si la firma no coincide con la de la base,
-- la migración falla entera en vez de dejar la antigua viva.

drop function public.crear_evento(uuid, text, text, date, text, text, text, text, uuid[], uuid[]);
drop function public.actualizar_evento(uuid, uuid, text, text, date, text, text, text, text, uuid[], uuid[]);

-- ---------------------------------------------------------------------------
-- EVENTO + TÉCNICOS EN UNA SOLA TRANSACCIÓN
-- ---------------------------------------------------------------------------
-- security invoker: se ejecutan con los permisos y la RLS de quien llama.
-- Si falla cualquier parte (RLS, check, técnico de otra banda...) PostgreSQL
-- deshace la llamada completa: nunca queda un evento a medias.

create function public.crear_evento(
  p_banda_id uuid,
  p_titulo text,
  p_tipo text,
  p_fecha date,
  p_hora text,
  p_lugar text,
  p_notas text,
  p_estado text,
  p_tecnico_ids uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_evento_id uuid;
begin
  insert into public.eventos (banda_id, titulo, tipo, fecha, hora, lugar, notas, estado)
  values (
    p_banda_id,
    btrim(p_titulo),
    p_tipo,
    p_fecha,
    nullif(btrim(coalesce(p_hora, '')), '')::time,
    btrim(coalesce(p_lugar, '')),
    btrim(coalesce(p_notas, '')),
    p_estado
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
  p_tecnico_ids uuid[]
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
    estado = p_estado
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

-- Mismo patrón que 002: nadie salvo authenticated puede ejecutarlas
revoke execute on function public.crear_evento(uuid, text, text, date, text, text, text, text, uuid[])
  from public, anon;
revoke execute on function public.actualizar_evento(uuid, uuid, text, text, date, text, text, text, text, uuid[])
  from public, anon;
grant execute on function public.crear_evento(uuid, text, text, date, text, text, text, text, uuid[])
  to authenticated;
grant execute on function public.actualizar_evento(uuid, uuid, text, text, date, text, text, text, text, uuid[])
  to authenticated;

-- ---------------------------------------------------------------------------
-- TABLAS DE MÚSICOS
-- ---------------------------------------------------------------------------
-- Primero la relación (tiene la clave foránea hacia miembros) y después la
-- entidad. Ninguna otra tabla, vista o función apunta a ellas.

drop table if exists public.evento_miembros;
drop table if exists public.miembros;

-- PostgREST vuelve a leer el esquema: deja de ofrecer las RPC y tablas antiguas
notify pgrst, 'reload schema';

commit;
