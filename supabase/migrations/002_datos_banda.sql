-- Datos compartidos de cada banda: músicos, técnicos y eventos.
--
-- Todo registro pertenece obligatoriamente a una banda (banda_id).
--   miembro de la banda → lee
--   admin de la banda   → lee, crea, edita y elimina
--   resto               → nada
-- Los permisos se apoyan en private.is_band_member / private.is_band_admin
-- (001_usuarios_roles.sql). No existe ningún admin global.
--
-- En la app, "Miembro" se muestra como "Músico".

-- ---------------------------------------------------------------------------
-- updated_at común
-- ---------------------------------------------------------------------------

create function private.actualizar_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function private.actualizar_updated_at() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- MÚSICOS
-- ---------------------------------------------------------------------------

create table public.miembros (
  id uuid primary key default gen_random_uuid(),
  banda_id uuid not null references public.bandas (id) on delete cascade,
  nombre text not null check (char_length(btrim(nombre)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Destino de las claves compuestas: una asignación solo puede apuntar a un
  -- músico de la MISMA banda que el evento. Su índice sirve también para
  -- filtrar por banda_id.
  unique (banda_id, id)
);

-- Listado de una banda ordenado por nombre. El nombre NO es único.
create index miembros_banda_id_nombre_idx on public.miembros (banda_id, nombre);

create trigger miembros_updated_at
  before update on public.miembros
  for each row
  execute function private.actualizar_updated_at();

-- ---------------------------------------------------------------------------
-- TÉCNICOS
-- ---------------------------------------------------------------------------

create table public.tecnicos (
  id uuid primary key default gen_random_uuid(),
  banda_id uuid not null references public.bandas (id) on delete cascade,
  nombre text not null check (char_length(btrim(nombre)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (banda_id, id)
);

create index tecnicos_banda_id_nombre_idx on public.tecnicos (banda_id, nombre);

create trigger tecnicos_updated_at
  before update on public.tecnicos
  for each row
  execute function private.actualizar_updated_at();

-- ---------------------------------------------------------------------------
-- EVENTOS
-- ---------------------------------------------------------------------------

create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  banda_id uuid not null references public.bandas (id) on delete cascade,
  titulo text not null check (char_length(btrim(titulo)) > 0),
  tipo text not null check (
    tipo in ('boda', 'fiesta_privada', 'concierto_abierto', 'ensayo', 'otro')
  ),
  -- La app envía y recibe YYYY-MM-DD
  fecha date not null,
  -- Hora opcional sin segundos; null = sin hora. La app la muestra como HH:MM
  hora time(0) without time zone null,
  lugar text not null default '',
  notas text not null default '',
  estado text not null default 'pendiente' check (estado in ('pendiente', 'confirmado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (banda_id, id)
);

create index eventos_banda_id_fecha_idx on public.eventos (banda_id, fecha);

create trigger eventos_updated_at
  before update on public.eventos
  for each row
  execute function private.actualizar_updated_at();

-- ---------------------------------------------------------------------------
-- ASIGNACIONES
-- ---------------------------------------------------------------------------
-- banda_id forma parte de las dos claves foráneas compuestas: (banda_id,
-- evento_id) y (banda_id, miembro_id) deben existir en la MISMA banda, así
-- que un evento de una banda no puede recibir un músico de otra aunque el
-- cliente envíe los ids a mano.
--
-- Borrar el evento borra sus asignaciones (cascade). Borrar un músico
-- asignado se rechaza: "no action" se comprueba al final de la sentencia,
-- igual que restrict para un borrado directo, pero permite que el borrado
-- en cascada de una banda completa elimine antes las asignaciones.
-- orden conserva el orden en que se asignaron.

create table public.evento_miembros (
  banda_id uuid not null,
  evento_id uuid not null,
  miembro_id uuid not null,
  orden integer not null,
  primary key (evento_id, miembro_id),
  foreign key (banda_id, evento_id)
    references public.eventos (banda_id, id) on delete cascade,
  foreign key (banda_id, miembro_id)
    references public.miembros (banda_id, id) on delete no action
);

-- Para comprobar rápido si un músico está asignado al intentar borrarlo
create index evento_miembros_banda_miembro_idx on public.evento_miembros (banda_id, miembro_id);

create table public.evento_tecnicos (
  banda_id uuid not null,
  evento_id uuid not null,
  tecnico_id uuid not null,
  orden integer not null,
  primary key (evento_id, tecnico_id),
  foreign key (banda_id, evento_id)
    references public.eventos (banda_id, id) on delete cascade,
  foreign key (banda_id, tecnico_id)
    references public.tecnicos (banda_id, id) on delete no action
);

create index evento_tecnicos_banda_tecnico_idx on public.evento_tecnicos (banda_id, tecnico_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.miembros enable row level security;
alter table public.tecnicos enable row level security;
alter table public.eventos enable row level security;
alter table public.evento_miembros enable row level security;
alter table public.evento_tecnicos enable row level security;

-- Músicos
create policy "Los miembros de la banda ven sus músicos"
  on public.miembros for select to authenticated
  using ((select private.is_band_member(banda_id)));

create policy "Solo el admin de la banda crea músicos"
  on public.miembros for insert to authenticated
  with check ((select private.is_band_admin(banda_id)));

create policy "Solo el admin de la banda edita músicos"
  on public.miembros for update to authenticated
  using ((select private.is_band_admin(banda_id)))
  with check ((select private.is_band_admin(banda_id)));

create policy "Solo el admin de la banda elimina músicos"
  on public.miembros for delete to authenticated
  using ((select private.is_band_admin(banda_id)));

-- Técnicos
create policy "Los miembros de la banda ven sus técnicos"
  on public.tecnicos for select to authenticated
  using ((select private.is_band_member(banda_id)));

create policy "Solo el admin de la banda crea técnicos"
  on public.tecnicos for insert to authenticated
  with check ((select private.is_band_admin(banda_id)));

create policy "Solo el admin de la banda edita técnicos"
  on public.tecnicos for update to authenticated
  using ((select private.is_band_admin(banda_id)))
  with check ((select private.is_band_admin(banda_id)));

create policy "Solo el admin de la banda elimina técnicos"
  on public.tecnicos for delete to authenticated
  using ((select private.is_band_admin(banda_id)));

-- Eventos
create policy "Los miembros de la banda ven sus eventos"
  on public.eventos for select to authenticated
  using ((select private.is_band_member(banda_id)));

create policy "Solo el admin de la banda crea eventos"
  on public.eventos for insert to authenticated
  with check ((select private.is_band_admin(banda_id)));

create policy "Solo el admin de la banda edita eventos"
  on public.eventos for update to authenticated
  using ((select private.is_band_admin(banda_id)))
  with check ((select private.is_band_admin(banda_id)));

create policy "Solo el admin de la banda elimina eventos"
  on public.eventos for delete to authenticated
  using ((select private.is_band_admin(banda_id)));

-- Asignaciones: no se editan; se borran y se vuelven a crear
create policy "Los miembros de la banda ven las asignaciones de músicos"
  on public.evento_miembros for select to authenticated
  using ((select private.is_band_member(banda_id)));

create policy "Solo el admin de la banda asigna músicos"
  on public.evento_miembros for insert to authenticated
  with check ((select private.is_band_admin(banda_id)));

create policy "Solo el admin de la banda quita músicos"
  on public.evento_miembros for delete to authenticated
  using ((select private.is_band_admin(banda_id)));

create policy "Los miembros de la banda ven las asignaciones de técnicos"
  on public.evento_tecnicos for select to authenticated
  using ((select private.is_band_member(banda_id)));

create policy "Solo el admin de la banda asigna técnicos"
  on public.evento_tecnicos for insert to authenticated
  with check ((select private.is_band_admin(banda_id)));

create policy "Solo el admin de la banda quita técnicos"
  on public.evento_tecnicos for delete to authenticated
  using ((select private.is_band_admin(banda_id)));

-- ---------------------------------------------------------------------------
-- PERMISOS DE TABLA
-- ---------------------------------------------------------------------------
-- Las tablas nuevas no se exponen automáticamente: se concede solo lo
-- necesario a authenticated y nada a anon.
-- banda_id solo se puede escribir al insertar: no hay permiso de UPDATE
-- sobre esa columna, así que un registro no se puede mover a otra banda.
-- Las asignaciones no tienen UPDATE.

revoke all on table public.miembros from anon, authenticated;
grant select, delete on table public.miembros to authenticated;
grant insert (banda_id, nombre) on table public.miembros to authenticated;
grant update (nombre) on table public.miembros to authenticated;

revoke all on table public.tecnicos from anon, authenticated;
grant select, delete on table public.tecnicos to authenticated;
grant insert (banda_id, nombre) on table public.tecnicos to authenticated;
grant update (nombre) on table public.tecnicos to authenticated;

revoke all on table public.eventos from anon, authenticated;
grant select, delete on table public.eventos to authenticated;
grant insert (banda_id, titulo, tipo, fecha, hora, lugar, notas, estado)
  on table public.eventos to authenticated;
grant update (titulo, tipo, fecha, hora, lugar, notas, estado)
  on table public.eventos to authenticated;

revoke all on table public.evento_miembros from anon, authenticated;
grant select, delete on table public.evento_miembros to authenticated;
grant insert (banda_id, evento_id, miembro_id, orden)
  on table public.evento_miembros to authenticated;

revoke all on table public.evento_tecnicos from anon, authenticated;
grant select, delete on table public.evento_tecnicos to authenticated;
grant insert (banda_id, evento_id, tecnico_id, orden)
  on table public.evento_tecnicos to authenticated;

-- ---------------------------------------------------------------------------
-- EVENTO + ASIGNACIONES EN UNA SOLA TRANSACCIÓN
-- ---------------------------------------------------------------------------
-- security invoker: se ejecutan con los permisos y la RLS de quien llama.
-- Si falla cualquier parte (RLS, check, músico de otra banda...) PostgreSQL
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
  p_miembro_ids uuid[],
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

  insert into public.evento_miembros (banda_id, evento_id, miembro_id, orden)
  select p_banda_id, v_evento_id, asignacion.id, asignacion.orden
  from unnest(coalesce(p_miembro_ids, '{}'::uuid[])) with ordinality as asignacion (id, orden);

  insert into public.evento_tecnicos (banda_id, evento_id, tecnico_id, orden)
  select p_banda_id, v_evento_id, asignacion.id, asignacion.orden
  from unnest(coalesce(p_tecnico_ids, '{}'::uuid[])) with ordinality as asignacion (id, orden);

  return v_evento_id;
end;
$$;

-- Actualiza el evento de ESA banda y sustituye sus asignaciones. No cambia
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
  p_miembro_ids uuid[],
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

  delete from public.evento_miembros where evento_id = p_evento_id;
  delete from public.evento_tecnicos where evento_id = p_evento_id;

  insert into public.evento_miembros (banda_id, evento_id, miembro_id, orden)
  select p_banda_id, p_evento_id, asignacion.id, asignacion.orden
  from unnest(coalesce(p_miembro_ids, '{}'::uuid[])) with ordinality as asignacion (id, orden);

  insert into public.evento_tecnicos (banda_id, evento_id, tecnico_id, orden)
  select p_banda_id, p_evento_id, asignacion.id, asignacion.orden
  from unnest(coalesce(p_tecnico_ids, '{}'::uuid[])) with ordinality as asignacion (id, orden);
end;
$$;

revoke execute on function public.crear_evento(uuid, text, text, date, text, text, text, text, uuid[], uuid[])
  from public, anon;
revoke execute on function public.actualizar_evento(uuid, uuid, text, text, date, text, text, text, text, uuid[], uuid[])
  from public, anon;
grant execute on function public.crear_evento(uuid, text, text, date, text, text, text, text, uuid[], uuid[])
  to authenticated;
grant execute on function public.actualizar_evento(uuid, uuid, text, text, date, text, text, text, text, uuid[], uuid[])
  to authenticated;
