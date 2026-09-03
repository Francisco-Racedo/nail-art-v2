/**
 * Cliente de Supabase con Service Role Key.
 * SOLO usar en contextos de servidor sin sesión de usuario:
 * - Webhooks externos (MercadoPago, Stripe, etc.)
 * - Cron Jobs
 * - Server Actions de sistema
 *
 * NUNCA exponer este cliente al frontend ni usarlo en rutas públicas.
 */
import { createClient } from '@supabase/supabase-js'

export function createServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}
