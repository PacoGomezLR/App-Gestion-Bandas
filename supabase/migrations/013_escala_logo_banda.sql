-- Tamaño del logo de la banda: una escala de visualización, la misma para todos.
--
--   bandas.logo_scale  1 = tamaño normal. De 0,5 (la mitad) a 2,5 (ampliado; lo
--                      que se sale de la zona del logo no se ve). Dos decimales.
--
-- El archivo del logo (logo_path, migración 012) no se toca: cambiar el tamaño
-- no recomprime la imagen ni le quita la transparencia.
--
--   miembro de la banda → ve la escala (la lee con la propia banda)
--   admin de la banda   → la cambia (política de UPDATE "Solo el admin de la
--                         banda la modifica", que ya existe)
--   resto               → nada
--
-- Las bandas existentes, tengan logo o no, quedan con escala 1.
--
-- Todo en una transacción: si algo falla, no se aplica nada.

begin;

alter table public.bandas
  add column logo_scale numeric(3, 2) not null default 1
  check (logo_scale between 0.5 and 2.5);

grant update (logo_scale) on table public.bandas to authenticated;

-- PostgREST vuelve a leer el esquema: expone la columna nueva
notify pgrst, 'reload schema';

commit;
