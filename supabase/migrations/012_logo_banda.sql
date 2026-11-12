-- Logo de cada banda: una imagen en Storage y su ruta en bandas.logo_path.
--
--   bandas.logo_path   null = sin logo. Ruta dentro del bucket, siempre en la
--                      carpeta de su banda: "<banda_id>/logo-<marca>.jpg"
--   bucket logos-bandas lectura pública (el logo es la imagen de la banda, como
--                      su nombre en un cartel); solo JPEG, PNG o WebP de hasta 2 MB
--
--   miembro de la banda → ve el logo (lo lee con la propia banda)
--   admin de la banda   → sube, cambia y quita el logo
--   resto               → nada (aunque conozca la ruta, no puede escribir)
--
-- Cada cambio sube un archivo nuevo y después borra el anterior: así ninguna
-- caché enseña el logo viejo con la ruta nueva.
--
-- Todo en una transacción: si algo falla, no se aplica nada.

begin;

-- ---------------------------------------------------------------------------
-- COLUMNA
-- ---------------------------------------------------------------------------

alter table public.bandas
  add column logo_path text
  check (
    logo_path is null
    or (logo_path like id::text || '/%' and char_length(logo_path) <= 200)
  );

-- Lo actualiza el admin con la política de UPDATE que ya existe ("Solo el admin
-- de la banda la modifica"); aquí solo se abre la columna
grant update (logo_path) on table public.bandas to authenticated;

-- ---------------------------------------------------------------------------
-- STORAGE
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos-bandas', 'logos-bandas', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']);

-- ¿Es admin de la banda dueña de la carpeta? La primera carpeta de la ruta es el
-- id de la banda; si no es un uuid, no es de ninguna banda
create function private.es_admin_logo_banda(p_ruta text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return private.is_band_admin(((storage.foldername(p_ruta))[1])::uuid);
exception
  when invalid_text_representation then
    return false;
end;
$$;

revoke execute on function private.es_admin_logo_banda(text) from public, anon;
grant execute on function private.es_admin_logo_banda(text) to authenticated;

-- Solo archivos nuevos (sin upsert): subir necesita INSERT. Borrar el anterior
-- necesita SELECT y DELETE. Nada de UPDATE: un logo no se sobrescribe
create policy "Solo el admin sube el logo de su banda"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'logos-bandas' and private.es_admin_logo_banda(name));

create policy "Solo el admin ve los archivos de logo de su banda"
  on storage.objects for select to authenticated
  using (bucket_id = 'logos-bandas' and private.es_admin_logo_banda(name));

create policy "Solo el admin borra el logo de su banda"
  on storage.objects for delete to authenticated
  using (bucket_id = 'logos-bandas' and private.es_admin_logo_banda(name));

-- PostgREST vuelve a leer el esquema: expone la columna nueva
notify pgrst, 'reload schema';

commit;
