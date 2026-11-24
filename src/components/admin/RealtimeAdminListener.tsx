'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { suscribirCambiosRealtime, RealtimeSyncEvent } from '@/lib/realtime'

/**
 * Verifica si el administrador tiene el cursor activo dentro de un campo de edición
 * (input, textarea, select) o un modal abierto, para no interrumpir su escritura con router.refresh().
 */
function estaEditandoFormulario(): boolean {
    if (typeof document === 'undefined') return false
    const el = document.activeElement
    if (el) {
        const tag = el.tagName.toUpperCase()
        if (
            tag === 'INPUT' ||
            tag === 'TEXTAREA' ||
            tag === 'SELECT' ||
            (el as HTMLElement).isContentEditable
        ) {
            return true
        }
    }
    // Si hay un modal abierto (que bloquea el scroll del body), tampoco refrescamos en segundo plano
    if (document.body?.style?.overflow === 'hidden') {
        return true
    }
    return false
}

export default function RealtimeAdminListener() {
    const router = useRouter()
    const pathname = usePathname()
    const lastToastRef = useRef<number>(0)
    const pathnameRef = useRef<string>(pathname)

    useEffect(() => {
        pathnameRef.current = pathname
    }, [pathname])

    useEffect(() => {
        const esPaginaEdicionEstable = () => {
            const p = pathnameRef.current || ''
            // En Ajustes y Carrusel el administrador redacta textos y sube contenido:
            // nunca disparamos router.refresh() automáticos por temporizador ni por foco
            return p.includes('/ajustes') || p.includes('/carrusel')
        }

        const handleSync = (evento: RealtimeSyncEvent) => {
            // Disparar evento DOM para que componentes locales (como AgendaCalendar) reaccionen al instante
            if (typeof window !== 'undefined') {
                window.dispatchEvent(
                    new CustomEvent('nail_art_sync_event', { detail: evento })
                )
            }

            // Si es una reserva nueva, avisar visualmente al administrador siempre
            if (evento.tipo === 'reserva_nueva') {
                const now = Date.now()
                if (now - lastToastRef.current > 3000) {
                    lastToastRef.current = now
                    const cliente = evento.detalle?.cliente || 'Una clienta'
                    const horario = evento.detalle?.horario
                        ? ` (${evento.detalle.horario.substring(0, 5)} hs)`
                        : ''
                    toast.info(`🔔 ¡Nueva reserva online!`, {
                        description: `${cliente} acaba de solicitar un turno${horario}.`,
                        duration: 6000
                    })
                }
            }

            // Solo refrescar el árbol SSR si no estamos en la pantalla de edición de Ajustes/Carrusel
            // y el usuario no está escribiendo activamente en un input
            if (!esPaginaEdicionEstable() && !estaEditandoFormulario()) {
                router.refresh()
            }
        }

        // 1. Suscripción en tiempo real a eventos de reservas/cambios
        const desuscribir = suscribirCambiosRealtime(handleSync)

        // 2. Refresco suave periódico SOLO en Agenda/Rendimiento/Clientes y SOLO cuando no se está editando ningún campo
        const intervalId = setInterval(() => {
            if (
                typeof document !== 'undefined' &&
                !document.hidden &&
                !esPaginaEdicionEstable() &&
                !estaEditandoFormulario()
            ) {
                router.refresh()
            }
        }, 60_000)

        // 3. Refresco al regresar a la pestaña SOLO si estaba oculta y no se está en Ajustes ni editando un campo
        const onVisibilityChange = () => {
            if (
                typeof document !== 'undefined' &&
                !document.hidden &&
                !esPaginaEdicionEstable() &&
                !estaEditandoFormulario()
            ) {
                router.refresh()
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(
                        new CustomEvent('nail_art_sync_event', { detail: { tipo: 'focus' } })
                    )
                }
            }
        }

        document.addEventListener('visibilitychange', onVisibilityChange)

        return () => {
            desuscribir()
            clearInterval(intervalId)
            document.removeEventListener('visibilitychange', onVisibilityChange)
        }
    }, [router])

    return null
}
