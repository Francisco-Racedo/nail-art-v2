-- ============================================================================
-- HABILITAR REALTIME EN SUPABASE (Postgres Changes)
-- ============================================================================
-- Agrega las tablas 'reservas' y 'configuracion' a la publicación de Supabase Realtime
-- para emitir eventos 'postgres_changes' automáticamente a los navegadores conectados.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'reservas'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.reservas;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'configuracion'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.configuracion;
    END IF;
END $$;
