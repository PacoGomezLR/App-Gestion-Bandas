-- Nombres visibles de los integrantes y disponibilidad personal.
--
-- Los integrantes de una banda son sus usuarios (banda_usuarios, 001).
--
-- 1) perfiles.nombre_visible: el nombre que ven los demás integrantes.
--    Cada usuario edita SOLO el suyo. El email sigue siendo privado.
-- 2) public.listar_integrantes_banda: devuelve únicamente usuario_id y
--    nombre_visible de los integrantes de una banda a la que perteneces.
-- 3) public.indisponibilidades_usuario: días en que un integrante NO puede tocar.
--      fila existente = no disponible ese día en esa banda
--      sin fila       = disponible (no se guardan días disponibles)
--    Marcar = INSERT, desmarcar = DELETE. No hay nada editable: sin UPDATE.
--
-- Ni el nombre ni la disponibilidad dependen del rol: un admin no puede
-- cambiar los de otra persona. Los permisos de eventos no cambian.
-- La disponibilidad solo informa: no bloquea crear, editar ni confirmar eventos.

begin;

-- ---------------------------------------------------------------------------
-- NOMBRE VISIBLE
-- ---------------------------------------------------------------------------
-- Nullable: las cuentas que ya existen no tienen nombre todavía.
-- Si se escribe, llega ya recortado y tiene entre 2 y 80 caracteres.

alter table public.perfiles
  add column nombre_visible text null
  check (
    nombre_visible is null
    or (
      nombre_visible = btrim(nombre_visible)
      and char_length(nombre_visible) between 2 and 80
    )
  );

-- 001 solo concede SELECT del perfil propio. Se añade UPDATE únicamente de
-- nombre_visible (id, email y created_at siguen sin poder cambiarse).
grant update (nombre_visible) on table public.perfiles to authenticated;

create policy "Cada usuario edita su propio nombre visible"
  on public.perfiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- INTEGRANTES DE UNA BANDA (solo nombre público)
-- ---------------------------------------------------------------------------
-- security definer: la RLS de perfiles solo deja leer el perfil propio, y no
-- se amplía para no exponer el email. Esta función es la única vía para ver
-- el nombre de otros, y solo devuelve usuario_id y nombre_visible.
-- Comprueba antes que quien llama (auth.uid()) pertenece a esa banda; si no,
-- falla con 42501 y no devuelve nada. Todas las tablas van con su esquema y
-- search_path vacío para que nadie pueda sustituirlas.

create function public.listar_integrantes_banda(p_banda_id uuid)
returns table (usuario_id uuid, nombre_visible text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.is_band_member(p_banda_id)) then
    raise exception 'Banda no disponible' using errcode = '42501';
  end if;

  return query
    select pertenencia.usuario_id, perfil.nombre_visible
    from public.banda_usuarios as pertenencia
    left join public.perfiles as perfil on perfil.id = pertenencia.usuario_id
    where pertenencia.banda_id = p_banda_id
    order by perfil.nombre_visible nulls last, pertenencia.usuario_id;
end;
$$;

revoke execute on function public.listar_integrantes_banda(uuid) from public, anon;
grant execute on function public.listar_integrantes_banda(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- INDISPONIBILIDADES
-- ---------------------------------------------------------------------------
-- Sin nota y sin updated_at: una fila nunca se modifica, solo se crea o se borra.

create table public.indisponibilidades_usuario (
  id uuid primary key default gen_random_uuid(),
  banda_id uuid not null references public.bandas (id) on delete cascade,
  usuario_id uuid not null,
  -- La app envía y recibe YYYY-MM-DD
  fecha date not null,
  created_at timestamptz not null default now(),
  -- Un día por usuario y banda: en otra banda es una disponibilidad distinta
  unique (banda_id, usuario_id, fecha),
  -- Solo para integrantes de ESA banda. Si la persona sale de la banda (o se
  -- borra su cuenta), sus indisponibilidades en ella se eliminan solas.
  foreign key (banda_id, usuario_id)
    references public.banda_usuarios (banda_id, usuario_id) on delete cascade
);

-- El calendario consulta por banda y fecha. El índice de la restricción
-- unique (banda_id, usuario_id, fecha) ya cubre la clave foránea compuesta.
create index indisponibilidades_usuario_banda_fecha_idx
  on public.indisponibilidades_usuario (banda_id, fecha);

-- Ninguna política usa private.is_band_admin: el rol no da derechos sobre la
-- disponibilidad de otra persona.
alter table public.indisponibilidades_usuario enable row level security;

create policy "Los integrantes de la banda ven sus indisponibilidades"
  on public.indisponibilidades_usuario for select to authenticated
  using ((select private.is_band_member(banda_id)));

create policy "Cada integrante marca solo sus propios días"
  on public.indisponibilidades_usuario for insert to authenticated
  with check (
    usuario_id = (select auth.uid())
    and (select private.is_band_member(banda_id))
  );

create policy "Cada integrante borra solo sus propios días"
  on public.indisponibilidades_usuario for delete to authenticated
  using (
    usuario_id = (select auth.uid())
    and (select private.is_band_member(banda_id))
  );

-- Nada para anon y nada de UPDATE. Al insertar solo se eligen banda, usuario
-- (la RLS exige el propio) y fecha.
revoke all on table public.indisponibilidades_usuario from anon, authenticated;
grant select, delete on table public.indisponibilidades_usuario to authenticated;
grant insert (banda_id, usuario_id, fecha)
  on table public.indisponibilidades_usuario to authenticated;

-- PostgREST vuelve a leer el esquema: expone la columna, la función y la tabla nuevas
notify pgrst, 'reload schema';

commit;
