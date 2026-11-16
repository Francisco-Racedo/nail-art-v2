import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
    return await updateSession(request)
}

export const config = {
    matcher: [
        /*
         * Aplicar middleware EXCLUSIVAMENTE a las rutas de administrador.
         * Evita bloqueos (Timeout 504) en endpoints públicos y webhooks de Mercado Pago.
         */
        '/admin/:path*',
    ],
}
