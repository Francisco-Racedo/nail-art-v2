'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { emitirCambioRealtime, suscribirCambiosRealtime } from '@/lib/realtime'

export function notificarCambioEnTiempoReal(tipo = 'all', detalle?: any) {
    emitirCambioRealtime(tipo, detalle).catch(() => {})
}

export default function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 10_000,
                        refetchOnWindowFocus: true,
                        retry: 1
                    }
                }
            })
    )

    useEffect(() => {
        // Suscripción universal en tiempo real: Postgres + Broadcast + Local BroadcastChannel
        const desuscribir = suscribirCambiosRealtime((evento) => {
            queryClient.invalidateQueries()
        })

        return () => {
            desuscribir()
        }
    }, [queryClient])

    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
