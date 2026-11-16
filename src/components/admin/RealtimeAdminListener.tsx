'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { suscribirCambiosRealtime, RealtimeSyncEvent } from '@/lib/realtime'

export default function RealtimeAdminListener() {
    const router = useRouter()
    const lastToastRef = useRef<number>(0)

    useEffect(() => {
        const handleSync = (evento: RealtimeSyncEvent) => {
            // Disparar evento DOM para que componentes locales (como AgendaCalendar) reaccionen al instante
            if (typeof window !== 'undefined') {
                window.dispatchEvent(
                    new CustomEvent('nail_art_sync_event', { detail: evento })
                )
            }

            // Actualizar el árbol de componentes del servidor en Next.js
            router.refresh()

            // Si es una reserva nueva, avisar visualmente al administrador
            if (evento.tipo === 'reserva_nueva') {
                const now = Date.now()
                if (now - lastToastRef.current > 3000) {
                    lastToastRef.current = now
                    const cliente = evento.detalle?.cliente || 'Una clienta'
                    const horario = evento.detalle?.horario ? ` (${evento.detalle.horario.substring(0, 5)} hs)` : ''
                    toast.info(`🔔 ¡Nueva reserva online!`, {
                        description: `${cliente} acaba de solicitar un turno${horario}.`,
                        duration: 6000
                    })
                }
            }
        }

        // 1. Suscripción en tiempo real (Postgres Changes + Broadcast cross-device + BroadcastChannel local)
        const desuscribir = suscribirCambiosRealtime(handleSync)

        // 2. Refresco suave periódico cuando la pestaña está visible (fallback de seguridad)
        const intervalId = setInterval(() => {
            if (typeof document !== 'undefined' && !document.hidden) {
                router.refresh()
            }
        }, 20_000)

        // 3. Refresco inmediato cuando el administrador regresa a la pestaña o enfoca la ventana
        const onVisibilityChange = () => {
            if (typeof document !== 'undefined' && !document.hidden) {
                router.refresh()
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(
                        new CustomEvent('nail_art_sync_event', { detail: { tipo: 'focus' } })
                    )
                }
            }
        }

        window.addEventListener('visibilitychange', onVisibilityChange)
        window.addEventListener('focus', onVisibilityChange)

        return () => {
            desuscribir()
            clearInterval(intervalId)
            window.removeEventListener('visibilitychange', onVisibilityChange)
            window.removeEventListener('focus', onVisibilityChange)
        }
    }, [router])

    return null
}
