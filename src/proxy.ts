import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
    return await updateSession(request)
}

export const config = {
    matcher: [
        /*
         * Aplicar middleware a todas las rutas de vistas y APIs de administrador.
         * Evita bloqueos (Timeout 504) en endpoints públicos y webhooks de Mercado Pago.
         */
        '/admin/:path*',
        '/api/admin/:path*'
    ]
}
