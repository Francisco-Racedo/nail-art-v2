-- ============================================================================
-- MIGRACIÓN DE SEGURIDAD (APPSEC HARDENING) — PINTADITAS NAILS
-- Blindaje de Row Level Security (RLS), bloqueo de lectura directa con ANON_KEY
-- y retiro de tablas con datos personales (PII) de la publicación Realtime pública.
-- ============================================================================

-- 1. Retirar tablas con datos sensibles (reservas y configuracion CRM) de supabase_realtime
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'reservas'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.reservas;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'configuracion'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.configuracion;
    END IF;
END $$;

-- 2. Habilitar Row Level Security (RLS) en todas las tablas del esquema público
ALTER TABLE IF EXISTS public.reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.configuracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.config ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.servicios ENABLE ROW LEVEL SECURITY;

-- 3. Eliminar políticas permisivas previas si existieran
DROP POLICY IF EXISTS "Public read reservas" ON public.reservas;
DROP POLICY IF EXISTS "Anon read reservas" ON public.reservas;
DROP POLICY IF EXISTS "Anon insert reservas" ON public.reservas;
DROP POLICY IF EXISTS "Anon update reservas" ON public.reservas;
DROP POLICY IF EXISTS "Anon delete reservas" ON public.reservas;

DROP POLICY IF EXISTS "Public read configuracion" ON public.configuracion;
DROP POLICY IF EXISTS "Anon read configuracion" ON public.configuracion;
DROP POLICY IF EXISTS "Anon write configuracion" ON public.configuracion;

-- 4. Revocar acceso directo de lectura/escritura al rol anónimo ('anon') sobre tablas con PII
-- Nota: El backend Next.js consulta y escribe estas tablas de forma segura y filtrada
-- utilizando exclusivamente la SERVICE_ROLE_KEY del lado del servidor.
REVOKE ALL ON TABLE public.reservas FROM anon;
REVOKE ALL ON TABLE public.configuracion FROM anon;

-- 5. Permitir lectura pública únicamente sobre el catálogo de servicios (precios públicos)
DROP POLICY IF EXISTS "Lectura publica de servicios" ON public.servicios;
CREATE POLICY "Lectura publica de servicios"
    ON public.servicios
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- 6. Blindar el bucket público 'carousel' en Supabase Storage:
-- Solo lectura pública (SELECT); las subidas y borrados se realizan desde el servidor con Service Role.
DROP POLICY IF EXISTS "Anon upload carousel" ON storage.objects;
DROP POLICY IF EXISTS "Anon delete carousel" ON storage.objects;
DROP POLICY IF EXISTS "Public upload carousel" ON storage.objects;
DROP POLICY IF EXISTS "Public delete carousel" ON storage.objects;
