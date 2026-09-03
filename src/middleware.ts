import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
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
