-- Nombre visible desde el registro.
--
-- La app envía el nombre al crear la cuenta en los metadatos de Supabase Auth
-- (signUp options.data.nombre_visible). El trigger de 001 que crea el perfil
-- (al_crear_usuario_auth → private.crear_perfil_usuario) lo copia ahora a
-- perfiles.nombre_visible (columna creada en 004). Funciona también cuando hay
-- que confirmar el correo: el perfil se crea al insertar en auth.users, sin
-- necesitar una sesión.
--
-- Solo se lee la clave nombre_visible: ningún otro metadato (rol, banda,
-- email, id...) llega al perfil. Rol y banda siguen viviendo solo en
-- banda_usuarios, que el cliente no puede escribir.
--
-- Un valor que no cumpla la check de 004 (recortado, 2-80 caracteres) se guarda
-- como null en vez de fallar: así nunca se bloquea la creación de una cuenta, y
-- la app pedirá el nombre al entrar (igual que a las cuentas anteriores).
--
-- No cambia el trigger, las políticas ni los permisos: solo el cuerpo de la función.

begin;

create or replace function private.crear_perfil_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nombre text := btrim(coalesce(new.raw_user_meta_data ->> 'nombre_visible', ''));
begin
  if char_length(v_nombre) not between 2 and 80 then
    v_nombre := null;
  end if;

  insert into public.perfiles (id, email, nombre_visible)
  values (new.id, coalesce(new.email, ''), v_nombre);

  return new;
end;
$$;

-- Igual que en 001: nadie la ejecuta directamente, solo el trigger
revoke execute on function private.crear_perfil_usuario() from public, anon, authenticated;

commit;
