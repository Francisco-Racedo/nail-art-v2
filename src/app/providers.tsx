'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export default function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 5 * 60 * 1000, // Datos frescos por 5 minutos → no re-fetching innecesario
                        retry: 1,
                    },
                },
            })
    )

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
}
