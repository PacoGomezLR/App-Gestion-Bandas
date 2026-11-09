-- Dos categorías nuevas de Finanzas:
--   sobrante_concierto → solo ingresos
--   alquiler_furgoneta → solo gastos
--
-- Sustituye la restricción que 007 creó sin nombre (PostgreSQL la llamó
-- movimientos_financieros_check) por otra igual con estas dos categorías. Sin
-- "if exists" a propósito: si el nombre no coincide, falla entera y no aplica
-- nada. Las filas existentes se revisan al añadirla. Los permisos, la RLS y los
-- datos no cambian.
--
-- Todo en una transacción: si algo falla, no se aplica nada.

begin;

alter table public.movimientos_financieros
  drop constraint movimientos_financieros_check;

alter table public.movimientos_financieros
  add constraint movimientos_financieros_categoria_por_tipo_check check (
    (
      tipo = 'ingreso'
      and categoria in (
        'saldo_inicial',
        'concierto',
        'sobrante_concierto',
        'aportacion',
        'merchandising',
        'otro'
      )
    )
    or (
      tipo = 'gasto'
      and categoria in (
        'transporte',
        'alquiler_furgoneta',
        'tecnico',
        'material',
        'local_ensayo',
        'comida',
        'alojamiento',
        'promocion',
        'comision',
        'otro'
      )
    )
  );

commit;
