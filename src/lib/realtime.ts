import { createClient } from '@/lib/supabase/client'

export type RealtimeSyncEvent = {
    tipo: 'reservas' | 'config' | 'reserva_nueva' | 'reserva_actualizada' | 'all' | string
    detalle?: any
    ts: number
}

// Canal único global para la aplicación
const REALTIME_CHANNEL_NAME = 'nail_art_live'
const LOCAL_BC_NAME = 'nail_art_sync'

/**
 * Emite un evento en tiempo real:
 * 1. A todas las pestañas locales del mismo navegador (BroadcastChannel).
 * 2. A todos los dispositivos remotos (celulares de clientes, PC del admin) vía Supabase Realtime Broadcast.
 */
export async function emitirCambioRealtime(tipo: string = 'reservas', detalle?: any) {
    if (typeof window === 'undefined') return

    const payload: RealtimeSyncEvent = {
        tipo,
        detalle,
        ts: Date.now()
    }

    // 1. Notificar localmente
    try {
        if ('BroadcastChannel' in window) {
            const bc = new BroadcastChannel(LOCAL_BC_NAME)
            bc.postMessage(payload)
            bc.close()
        }
    } catch {}

    // 2. Notificar remotamente vía Supabase Realtime Broadcast
    try {
        const supabase = createClient()
        const channel = supabase.channel(REALTIME_CHANNEL_NAME)
        await channel.send({
            type: 'broadcast',
            event: 'cambio_datos',
            payload
        })
    } catch (e) {
        // Silencioso si no hay conexión o soporte
    }
}

/**
 * Suscribe un callback a cualquier cambio en tiempo real:
 * - Cambios de base de datos Postgres (INSERT / UPDATE / DELETE en reservas o configuracion).
 * - Broadcasts remotos de Supabase Realtime (cuando un cliente reserva desde su celular o el admin modifica).
 * - Mensajes locales de BroadcastChannel (entre pestañas del mismo navegador).
 */
export function suscribirCambiosRealtime(callback: (evento: RealtimeSyncEvent) => void) {
    if (typeof window === 'undefined') return () => {}

    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let bc: BroadcastChannel | null = null

    try {
        // 1. Escuchar BroadcastChannel local
        if ('BroadcastChannel' in window) {
            bc = new BroadcastChannel(LOCAL_BC_NAME)
            bc.onmessage = (event) => {
                if (event.data) {
                    callback(event.data)
                }
            }
        }

        // 2. Escuchar Supabase Realtime (Postgres Changes + Broadcast)
        channel = supabase.channel(REALTIME_CHANNEL_NAME)

        channel
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'reservas' },
                (payload) => {
                    callback({
                        tipo: 'reservas',
                        detalle: payload,
                        ts: Date.now()
                    })
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'configuracion' },
                (payload) => {
                    callback({
                        tipo: 'config',
                        detalle: payload,
                        ts: Date.now()
                    })
                }
            )
            .on('broadcast', { event: 'cambio_datos' }, ({ payload }) => {
                if (payload) {
                    callback(payload as RealtimeSyncEvent)
                }
            })
            .subscribe()
    } catch (err) {
        console.warn('Error inicializando suscripción Realtime:', err)
    }

    return () => {
        try {
            if (bc) bc.close()
            if (channel) supabase.removeChannel(channel)
        } catch {}
    }
}
