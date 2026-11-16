'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'

export function notificarCambioEnTiempoReal(tipo = 'all') {
    if (typeof window === 'undefined') return
    try {
        const bc = new BroadcastChannel('nail_art_sync')
        bc.postMessage({ tipo, ts: Date.now() })
        bc.close()
    } catch {}
}

export default function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 15_000,
                        refetchOnWindowFocus: true,
                        retry: 1
                    }
                }
            })
    )

    useEffect(() => {
        if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return
        const bc = new BroadcastChannel('nail_art_sync')
        bc.onmessage = () => {
            queryClient.invalidateQueries()
        }
        return () => bc.close()
    }, [queryClient])

    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
