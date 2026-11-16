import { createClient } from '@/lib/supabase/client'

export type RealtimeSyncEvent = {
    tipo: 'reservas' | 'config' | 'reserva_nueva' | 'reserva_actualizada' | 'media_actualizado' | 'all' | string
    detalle?: any
    ts: number
}

// Canal único global para la aplicación
const REALTIME_CHANNEL_NAME = 'nail_art_live'
const LOCAL_BC_NAME = 'nail_art_sync'

// Registro centralizado de suscriptores para evitar suscribir el canal de Supabase más de una vez
const subscribers = new Set<(evento: RealtimeSyncEvent) => void>()
let sharedChannel: any = null
let sharedBc: BroadcastChannel | null = null
let isConnected = false

function notifySubscribers(evento: RealtimeSyncEvent) {
    subscribers.forEach(cb => {
        try {
            cb(evento)
        } catch (err) {
            console.error('Error en callback de sincronización:', err)
        }
    })
}

function initSharedConnection() {
    if (typeof window === 'undefined' || isConnected) return
    isConnected = true

    // 1. Canal local BroadcastChannel para pestañas del mismo navegador
    try {
        if ('BroadcastChannel' in window && !sharedBc) {
            sharedBc = new BroadcastChannel(LOCAL_BC_NAME)
            sharedBc.onmessage = (event) => {
                if (event.data) {
                    notifySubscribers(event.data)
                }
            }
        }
    } catch {}

    // 2. Canal Supabase Realtime (se crea y suscribe UNA SOLA VEZ)
    try {
        const supabase = createClient()
        sharedChannel = supabase.channel(REALTIME_CHANNEL_NAME)

        sharedChannel
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'reservas' },
                (payload: any) => {
                    notifySubscribers({
                        tipo: 'reservas',
                        detalle: payload,
                        ts: Date.now()
                    })
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'configuracion' },
                (payload: any) => {
                    notifySubscribers({
                        tipo: 'config',
                        detalle: payload,
                        ts: Date.now()
                    })
                }
            )
            .on('broadcast', { event: 'cambio_datos' }, ({ payload }: any) => {
                if (payload) {
                    notifySubscribers(payload as RealtimeSyncEvent)
                }
            })
            .subscribe((status: string) => {
                if (status === 'SUBSCRIBED') {
                    // Conexión exitosa sin duplicar canales
                }
            })
    } catch (err) {
        console.warn('Error inicializando canal Realtime compartido:', err)
    }
}

/**
 * Emite un evento en tiempo real a todas las pestañas locales y dispositivos remotos.
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
        const channel = sharedChannel || supabase.channel(REALTIME_CHANNEL_NAME)
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
 * Suscribe un callback a cambios en tiempo real.
 * Reutiliza una única conexión para evitar el error "cannot add postgres_changes callbacks after subscribe()".
 */
export function suscribirCambiosRealtime(callback: (evento: RealtimeSyncEvent) => void) {
    if (typeof window === 'undefined') return () => {}

    subscribers.add(callback)
    initSharedConnection()

    return () => {
        subscribers.delete(callback)
    }
}
