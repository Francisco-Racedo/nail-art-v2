import { createServiceClient } from '@/lib/supabase/service'

export async function notificarCambioServidor(tipo: string = 'reservas', detalle?: any) {
    try {
        const supabaseAdmin = createServiceClient()
        const channel = supabaseAdmin.channel('nail_art_live')
        await channel.send({
            type: 'broadcast',
            event: 'cambio_datos',
            payload: {
                tipo,
                detalle,
                ts: Date.now()
            }
        })
    } catch (e) {
        // Silencioso en caso de timeout
    }
}
