-- ============================================================================
-- MIGRACIÓN v3 — FRAN & ROMY NAILS
-- Ejecutar en el SQL Editor de Supabase (https://supabase.com/dashboard)
-- ============================================================================

-- 1. Actualizar configuración base a Opción B (Lunes a Sábado 10:00 a 22:00, bloques de 120 min)
UPDATE public.config
SET hora_inicio = '10:00',
    hora_fin = '22:00',
    intervalo_minutos = 120
WHERE id = 1;

INSERT INTO public.configuracion (clave, valor) VALUES
    ('pagos_habilitados', 'false'),
    ('minutos_autoconfirmacion', '10'),
    ('intervalo_minutos', '120'),
    ('hora_inicio', '10:00'),
    ('hora_fin', '22:00')
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor;

-- 2. Ampliar los estados permitidos en la tabla reservas
ALTER TABLE public.reservas DROP CONSTRAINT IF EXISTS reservas_estado_check;
ALTER TABLE public.reservas ADD CONSTRAINT reservas_estado_check
    CHECK (estado IN ('pendiente', 'confirmado', 'completado', 'reprogramar', 'cancelado', 'ausente', 'rechazado'));

-- 3. Índice único parcial para impedir doble reserva simultánea en el mismo horario
CREATE UNIQUE INDEX IF NOT EXISTS uniq_turno_activo
    ON public.reservas (fecha, horario)
    WHERE estado IN ('pendiente', 'confirmado', 'completado');

-- 4. (Opcional) Tarea programada pg_cron cada minuto para auto-confirmar turnos tras 10 minutos
-- Descomentar si la extensión pg_cron está habilitada en Database -> Extensions:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule(
--   'autoconfirmar-turnos-10m',
--   '* * * * *',
--   $$
--   UPDATE public.reservas
--   SET estado = 'confirmado'
--   WHERE estado = 'pendiente'
--     AND mp_preference_id LIKE '{%'
--     AND (mp_preference_id::jsonb ->> 'createdAt')::timestamptz <= (now() - interval '10 minutes');
--   $$
-- );
