-- Repertorio de la banda: cada canción es una sola línea de texto.
--
--   estado = 'repertorio' → la banda ya la toca
--   estado = 'nueva'      → la quiere incorporar
-- Son dos vistas de la misma tabla: pasar una canción al repertorio solo cambia
-- su estado, nunca la duplica.
--
--   miembro de la banda → lee
--   admin de la banda   → lee, crea, edita y elimina
--   resto               → nada
--
-- Sin restricción unique sobre el nombre: puede haber dos versiones con nombres
-- parecidos, y decidirlo es cosa de la banda.
--
-- Todo en una transacción: si algo falla, no se aplica nada.

begin;

create table public.canciones (
  id uuid primary key default gen_random_uuid(),
  banda_id uuid not null references public.bandas (id) on delete cascade,
  -- Tal cual se escribe, solo sin espacios alrededor: ni título y artista por
  -- separado ni cambios de mayúsculas
  nombre text not null check (
    nombre = btrim(nombre)
    and char_length(nombre) between 1 and 160
  ),
  -- Sin default: la app decide siempre en qué apartado nace la canción
  estado text not null check (estado in ('repertorio', 'nueva')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Las canciones de una banda, por nombre: la única consulta de la app
create index canciones_banda_id_nombre_idx on public.canciones (banda_id, nombre);

create trigger canciones_updated_at
  before update on public.canciones
  for each row
  execute function private.actualizar_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.canciones enable row level security;

create policy "Los miembros de la banda ven sus canciones"
  on public.canciones for select to authenticated
  using ((select private.is_band_member(banda_id)));

create policy "Solo el admin de la banda crea canciones"
  on public.canciones for insert to authenticated
  with check ((select private.is_band_admin(banda_id)));

create policy "Solo el admin de la banda edita canciones"
  on public.canciones for update to authenticated
  using ((select private.is_band_admin(banda_id)))
  with check ((select private.is_band_admin(banda_id)));

create policy "Solo el admin de la banda elimina canciones"
  on public.canciones for delete to authenticated
  using ((select private.is_band_admin(banda_id)));

-- ---------------------------------------------------------------------------
-- PERMISOS DE TABLA
-- ---------------------------------------------------------------------------
-- Nada para anon. banda_id solo se escribe al insertar: una canción no se puede
-- mover a otra banda.

revoke all on table public.canciones from anon, authenticated;
grant select, delete on table public.canciones to authenticated;
grant insert (banda_id, nombre, estado) on table public.canciones to authenticated;
grant update (nombre, estado) on table public.canciones to authenticated;

-- PostgREST vuelve a leer el esquema: expone la tabla nueva
notify pgrst, 'reload schema';

commit;
