-- Usuarios de la aplicación, bandas y permisos POR BANDA.
--
-- perfiles        → cuenta global (sin rol)
-- bandas          → cada banda
-- banda_usuarios  → qué cuentas acceden a qué banda y con qué rol
--
-- Un rol no es global: la misma persona puede ser admin en una banda y
-- usuario en otra. Una cuenta con acceso a una banda no es lo mismo que un
-- Miembro musical; más adelante se podrán vincular.
-- Las credenciales las gestiona Supabase Auth: aquí no se guarda ninguna contraseña.

-- Rol de una cuenta dentro de una banda
create type public.rol_usuario as enum (
  'admin',
  'usuario'
);

-- Funciones internas fuera del schema public, que es el expuesto por la API
create schema if not exists private;

grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- PERFILES
-- ---------------------------------------------------------------------------

create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.perfiles enable row level security;

-- Crea el perfil al crearse una cuenta en Auth. No asigna ningún rol.
create function private.crear_perfil_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, email)
  values (new.id, coalesce(new.email, ''));

  return new;
end;
$$;

revoke execute on function private.crear_perfil_usuario() from public, anon, authenticated;

create trigger al_crear_usuario_auth
  after insert on auth.users
  for each row
  execute function private.crear_perfil_usuario();

-- Solo lectura del propio perfil; el trigger es quien escribe
revoke all on table public.perfiles from anon, authenticated;
grant select on table public.perfiles to authenticated;

create policy "Cada usuario lee su propio perfil"
  on public.perfiles
  for select
  to authenticated
  using (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- BANDAS Y PERTENENCIAS
-- ---------------------------------------------------------------------------

create table public.bandas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(btrim(nombre)) > 0),
  creada_por uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

alter table public.bandas enable row level security;

create table public.banda_usuarios (
  banda_id uuid not null references public.bandas (id) on delete cascade,
  usuario_id uuid not null references auth.users (id) on delete cascade,
  rol public.rol_usuario not null default 'usuario',
  created_at timestamptz not null default now(),
  primary key (banda_id, usuario_id)
);

-- Se consultan las bandas de cada usuario
create index banda_usuarios_usuario_id_idx on public.banda_usuarios (usuario_id);

alter table public.banda_usuarios enable row level security;

-- ¿El usuario actual pertenece a la banda? security definer: lee
-- banda_usuarios sin pasar por sus políticas (evita recursión de RLS)
create function private.is_band_member(p_banda_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.banda_usuarios
    where banda_id = p_banda_id
      and usuario_id = (select auth.uid())
  );
$$;

-- ¿El usuario actual es admin de ESA banda? No existe ningún admin global.
create function private.is_band_admin(p_banda_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.banda_usuarios
    where banda_id = p_banda_id
      and usuario_id = (select auth.uid())
      and rol = 'admin'::public.rol_usuario
  );
$$;

revoke execute on function private.is_band_member(uuid) from public, anon;
revoke execute on function private.is_band_admin(uuid) from public, anon;
grant execute on function private.is_band_member(uuid) to authenticated;
grant execute on function private.is_band_admin(uuid) to authenticated;

-- Quien crea una banda queda como admin de ella. Lo garantiza la base, en la
-- misma transacción que el INSERT: el cliente no inserta el admin por su cuenta.
create function private.anadir_creador_como_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.banda_usuarios (banda_id, usuario_id, rol)
  values (new.id, new.creada_por, 'admin');

  return new;
end;
$$;

revoke execute on function private.anadir_creador_como_admin() from public, anon, authenticated;

create trigger al_crear_banda
  after insert on public.bandas
  for each row
  execute function private.anadir_creador_como_admin();

-- Permisos de bandas: solo se puede insertar nombre y creada_por, y cambiar el nombre
revoke all on table public.bandas from anon, authenticated;
grant select, delete on table public.bandas to authenticated;
grant insert (nombre, creada_por) on table public.bandas to authenticated;
grant update (nombre) on table public.bandas to authenticated;

create policy "Los miembros ven su banda"
  on public.bandas
  for select
  to authenticated
  using ((select private.is_band_member(id)));

-- Nadie puede crear una banda en nombre de otro usuario
create policy "Cualquier usuario crea bandas a su nombre"
  on public.bandas
  for insert
  to authenticated
  with check (creada_por = (select auth.uid()));

create policy "Solo el admin de la banda la modifica"
  on public.bandas
  for update
  to authenticated
  using ((select private.is_band_admin(id)))
  with check ((select private.is_band_admin(id)));

create policy "Solo el admin de la banda la elimina"
  on public.bandas
  for delete
  to authenticated
  using ((select private.is_band_admin(id)));

-- Pertenencias: desde la app solo se leen. Sin INSERT, UPDATE ni DELETE de
-- cliente: nadie puede añadirse a una banda ni hacerse admin.
-- Las altas llegarán al aceptar una invitación y los cambios de rol
-- (por ejemplo usuario → admin) con una operación de servidor que compruebe
-- antes private.is_band_admin(banda_id).
revoke all on table public.banda_usuarios from anon, authenticated;
grant select on table public.banda_usuarios to authenticated;

create policy "Cada usuario ve sus pertenencias y las de sus bandas"
  on public.banda_usuarios
  for select
  to authenticated
  using (
    usuario_id = (select auth.uid())
    or (select private.is_band_member(banda_id))
  );

-- ---------------------------------------------------------------------------
-- INVITACIONES
-- ---------------------------------------------------------------------------

-- El rol lo decide el admin al crear la invitación; el invitado no lo elige.
-- Solo se guarda el hash del token: el token real viaja únicamente en el enlace.
create table public.invitaciones_banda (
  id uuid primary key default gen_random_uuid(),
  banda_id uuid not null references public.bandas (id) on delete cascade,
  rol public.rol_usuario not null,
  token_hash text not null unique,
  creada_por uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  usada_at timestamptz null,
  check (expires_at > created_at)
);

alter table public.invitaciones_banda enable row level security;

-- Sin políticas ni permisos para la app: nadie lee token_hash ni crea
-- invitaciones desde el cliente. Todo pasará por el servidor.
revoke all on table public.invitaciones_banda from anon, authenticated;

-- FLUJO FUTURO DE INVITACIÓN (no implementado todavía)
--
--   Admin pulsa Invitar y elige usuario / admin
--     → Edge Function verifica private.is_band_admin(banda_id)
--     → el servidor genera un token con aleatoriedad criptográfica
--     → guarda solo su hash en invitaciones_banda (con rol y expires_at)
--     → devuelve el enlace con el token
--     → la app lo comparte con Expo Share / WhatsApp
--     → el invitado abre la app y acepta la invitación
--     → el servidor comprueba el hash, la caducidad y que no esté usada,
--       marca usada_at y crea banda_usuarios con el rol de la invitación
--
-- El token nunca se genera en la app, y la app nunca usa claves
-- administrativas ni supabase.auth.admin.
