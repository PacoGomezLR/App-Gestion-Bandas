-- Invitaciones a una banda mediante enlace (sin correo externo).
--
-- Reutiliza la tabla public.invitaciones_banda de 001 tal cual (id, banda_id,
-- rol, token_hash, creada_por, created_at, expires_at, usada_at). Su RLS y sus
-- permisos no cambian: la app sigue sin poder leerla ni escribirla. Todo pasa
-- por estas tres funciones:
--
--   crear_invitacion_banda(banda, rol)  → solo admin de ESA banda; devuelve el
--                                         token real UNA vez y guarda su hash
--   consultar_invitacion_banda(token)   → estado y nombre de la banda (solo si
--                                         el token es válido para quien llama)
--   aceptar_invitacion_banda(token)     → crea banda_usuarios con el rol de la
--                                         invitación y la marca como usada
--
-- Token: 32 bytes de pgcrypto.gen_random_bytes (CSPRNG del servidor) en hex
-- (64 caracteres). En la base solo queda sha256(token) en hex: el token real
-- solo existe en el enlace. Caducidad: 7 días, decidida aquí y devuelta a la
-- app (la app no la calcula).
--
-- Todas: security definer (la tabla no tiene permisos para el cliente),
-- search_path vacío, tablas con esquema, sin acceso para anon y nada de
-- correos, hashes ni datos de otros usuarios en las respuestas.

begin;

-- gen_random_bytes. En Supabase pgcrypto ya viene instalado en el esquema
-- extensions; si fuera así, esta línea no hace nada.
create extension if not exists pgcrypto with schema extensions;

-- Hash común: sha256 del token en hex. pg_catalog.sha256 es del núcleo de PostgreSQL.
create function private.hash_token_invitacion(p_token text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(pg_catalog.sha256(convert_to(p_token, 'UTF8')), 'hex');
$$;

revoke execute on function private.hash_token_invitacion(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- CREAR
-- ---------------------------------------------------------------------------

create function public.crear_invitacion_banda(
  p_banda_id uuid,
  p_rol public.rol_usuario
)
returns table (token text, expires_at timestamptz)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_token text;
  v_caduca timestamptz := now() + interval '7 days';
begin
  -- Solo un admin de ESA banda. No hay admin global.
  if not (select private.is_band_admin(p_banda_id)) then
    raise exception 'Sin permiso para invitar a esta banda' using errcode = '42501';
  end if;

  -- El tipo public.rol_usuario ya limita el valor a admin / usuario
  if p_rol is null then
    raise exception 'Rol no válido' using errcode = '22023';
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  -- creada_por sale de la sesión; el cliente no lo envía
  insert into public.invitaciones_banda (banda_id, rol, token_hash, creada_por, expires_at)
  values (p_banda_id, p_rol, private.hash_token_invitacion(v_token), (select auth.uid()), v_caduca);

  -- Única vez que el token real sale de la base
  return query select v_token, v_caduca;
end;
$$;

-- ---------------------------------------------------------------------------
-- CONSULTAR (antes de aceptar)
-- ---------------------------------------------------------------------------
-- estado: valida | ya_miembro | caducada | usada | no_valida
-- banda_nombre solo se devuelve si el token es válido o si ya perteneces a la
-- banda; nunca token_hash, creada_por, rol, usuarios ni correos.

create function public.consultar_invitacion_banda(p_token text)
returns table (estado text, banda_nombre text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_invitacion record;
begin
  if (select auth.uid()) is null then
    raise exception 'Inicia sesión' using errcode = '42501';
  end if;

  select invitacion.banda_id, invitacion.expires_at, invitacion.usada_at, banda.nombre
    into v_invitacion
  from public.invitaciones_banda as invitacion
  join public.bandas as banda on banda.id = invitacion.banda_id
  where invitacion.token_hash = private.hash_token_invitacion(coalesce(p_token, ''));

  if not found then
    return query select 'no_valida'::text, null::text;
  elsif exists (
    select 1 from public.banda_usuarios as pertenencia
    where pertenencia.banda_id = v_invitacion.banda_id
      and pertenencia.usuario_id = (select auth.uid())
  ) then
    return query select 'ya_miembro'::text, v_invitacion.nombre;
  elsif v_invitacion.usada_at is not null then
    return query select 'usada'::text, null::text;
  elsif v_invitacion.expires_at <= now() then
    return query select 'caducada'::text, null::text;
  else
    return query select 'valida'::text, v_invitacion.nombre;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- ACEPTAR
-- ---------------------------------------------------------------------------
-- resultado: aceptada | ya_miembro | caducada | usada | no_valida
-- El rol es SIEMPRE el guardado en la invitación: no hay parámetro de rol.
-- for update bloquea la fila: dos aceptaciones simultáneas del mismo token se
-- ejecutan una detrás de otra, y la segunda ya ve usada_at. Todo ocurre en la
-- transacción de la llamada: o se crean pertenencia y usada_at, o nada.

create function public.aceptar_invitacion_banda(p_token text)
returns table (resultado text, banda_id uuid, banda_nombre text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := (select auth.uid());
  v_invitacion record;
begin
  if v_usuario is null then
    raise exception 'Inicia sesión' using errcode = '42501';
  end if;

  select invitacion.id, invitacion.banda_id, invitacion.rol, invitacion.expires_at,
         invitacion.usada_at, banda.nombre
    into v_invitacion
  from public.invitaciones_banda as invitacion
  join public.bandas as banda on banda.id = invitacion.banda_id
  where invitacion.token_hash = private.hash_token_invitacion(coalesce(p_token, ''))
  for update of invitacion;

  if not found then
    return query select 'no_valida'::text, null::uuid, null::text;
    return;
  end if;

  -- Ya es integrante: no se duplica, no cambia su rol y no se gasta la invitación
  if exists (
    select 1 from public.banda_usuarios as pertenencia
    where pertenencia.banda_id = v_invitacion.banda_id
      and pertenencia.usuario_id = v_usuario
  ) then
    return query select 'ya_miembro'::text, v_invitacion.banda_id, v_invitacion.nombre;
    return;
  end if;

  if v_invitacion.usada_at is not null then
    return query select 'usada'::text, null::uuid, null::text;
    return;
  end if;

  if v_invitacion.expires_at <= now() then
    return query select 'caducada'::text, null::uuid, null::text;
    return;
  end if;

  insert into public.banda_usuarios (banda_id, usuario_id, rol)
  values (v_invitacion.banda_id, v_usuario, v_invitacion.rol);

  update public.invitaciones_banda as invitacion
  set usada_at = now()
  where invitacion.id = v_invitacion.id;

  return query select 'aceptada'::text, v_invitacion.banda_id, v_invitacion.nombre;
end;
$$;

-- Solo usuarios con sesión. anon no necesita nada: sin sesión la app muestra
-- primero Entrar / Crear cuenta y consulta la invitación después.
revoke execute on function public.crear_invitacion_banda(uuid, public.rol_usuario) from public, anon;
revoke execute on function public.consultar_invitacion_banda(text) from public, anon;
revoke execute on function public.aceptar_invitacion_banda(text) from public, anon;
grant execute on function public.crear_invitacion_banda(uuid, public.rol_usuario) to authenticated;
grant execute on function public.consultar_invitacion_banda(text) to authenticated;
grant execute on function public.aceptar_invitacion_banda(text) to authenticated;

notify pgrst, 'reload schema';

commit;
