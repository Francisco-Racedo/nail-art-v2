'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { DEFAULT_CMS_CONTENIDO, mergeCMSContenido } from '@/lib/cms-types'

export default function FloatingCTA() {
    const [visible, setVisible] = useState(true)

    const { data: config } = useQuery({
        queryKey: ['config'],
        queryFn: async () => {
            const res = await fetch('/api/config', { cache: 'no-store' })
            if (!res.ok) return null
            return res.json()
        },
        staleTime: 10_000
    })

    const cms = config?.cms ? mergeCMSContenido(config.cms) : DEFAULT_CMS_CONTENIDO

    useEffect(() => {
        const reserva = document.getElementById('reserva')
        if (!reserva) return
        const obs = new IntersectionObserver(
            ([e]) => setVisible(!e.isIntersecting),
            { threshold: 0.1 }
        )
        obs.observe(reserva)
        return () => obs.disconnect()
    }, [])

    if (!cms.navbar.mostrar_floating_cta) return null

    return (
        <div
            className={`fixed bottom-6 left-0 w-full flex justify-center z-50 px-4 pointer-events-none transition-all duration-500 ${
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
        >
            <a
                href="#reserva"
                className="pointer-events-auto bg-gradient-to-r from-[#231C19] via-[#3A2B26] to-[#231C19] hover:from-rose-600 hover:to-amber-600 text-[#FDF8F5] tracking-[0.2em] font-bold text-xs py-4 px-9 rounded-full shadow-2xl shadow-rose-950/30 transform transition duration-300 hover:scale-[1.03] hover:-translate-y-1 flex items-center gap-2.5 border border-rose-200/30"
            >
                <Sparkles className="w-4 h-4 text-rose-300" />
                <span>{cms.navbar.texto_floating_cta || 'RESERVAR TURNO AHORA'}</span>
            </a>
        </div>
    )
}
