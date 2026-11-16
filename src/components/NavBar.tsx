'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Sparkles, CalendarCheck } from 'lucide-react'
import { DEFAULT_CMS_CONTENIDO, mergeCMSContenido } from '@/lib/cms-types'

export default function NavBar({ initialNombre }: { initialNombre?: string }) {
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

    const nombreNegocio = (
        config?.nombre_negocio ||
        initialNombre ||
        'PINTITAS NAILS'
    ).toUpperCase()

    useEffect(() => {
        if (typeof document !== 'undefined' && nombreNegocio) {
            document.title = `${nombreNegocio} | MANICURA PROFESIONAL EN LULES, TUCUMÁN`
        }
    }, [nombreNegocio])

    if (!cms.navbar.visible) return null

    return (
        <nav className="sticky top-2 sm:top-4 z-50 px-2.5 sm:px-8 pt-2 sm:pt-4">
            <div className="max-w-6xl mx-auto glass-editorial rounded-2xl sm:rounded-full px-3.5 sm:px-8 py-2.5 sm:py-3.5 flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center transition-all duration-500">
                <div className="flex items-center justify-between w-full sm:w-auto gap-2">
                    <a href="#" className="flex items-center gap-2 min-w-0 group">
                        <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-rose-400 via-pink-400 to-amber-300 flex items-center justify-center text-white shadow-md shadow-rose-300/40 shrink-0 group-hover:scale-105 transition-transform duration-300">
                            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </span>
                        <span className="font-editorial text-base sm:text-2xl font-bold tracking-wider text-[#231C19] truncate">
                            {nombreNegocio}
                        </span>
                    </a>

                    <a
                        href="#reserva"
                        className="sm:hidden inline-flex items-center gap-1.5 bg-gradient-to-r from-[#2C221E] via-[#3D2E29] to-[#2C221E] text-[#FDF8F5] text-[11px] font-bold uppercase tracking-wider px-3.5 py-2 rounded-full shadow-md shrink-0"
                    >
                        <CalendarCheck className="w-3 h-3 text-rose-300" />
                        <span>{cms.navbar.texto_boton || 'Reservar'}</span>
                    </a>
                </div>

                {/* Enlaces visibles tanto en móvil (compactos) como en escritorio */}
                <div className="flex items-center justify-center gap-5 sm:gap-8 text-[10px] sm:text-xs uppercase tracking-[0.16em] sm:tracking-[0.2em] font-semibold text-stone-600 border-t border-rose-200/40 pt-1.5 sm:border-0 sm:pt-0">
                    {cms.servicios.visible && (
                        <a
                            href="#servicios"
                            className="hover:text-rose-600 transition-colors py-0.5"
                        >
                            Servicios
                        </a>
                    )}
                    {cms.galeria.visible && (
                        <a
                            href="#galeria"
                            className="hover:text-rose-600 transition-colors py-0.5"
                        >
                            Lookbook
                        </a>
                    )}
                    {cms.reserva.visible && (
                        <a
                            href="#reserva"
                            className="hover:text-rose-600 transition-colors py-0.5"
                        >
                            Agenda
                        </a>
                    )}
                </div>

                <a
                    href="#reserva"
                    className="hidden sm:inline-flex items-center gap-2 bg-gradient-to-r from-[#2C221E] via-[#3D2E29] to-[#2C221E] hover:from-rose-600 hover:to-amber-600 text-[#FDF8F5] text-xs font-bold uppercase tracking-widest px-6 py-2.5 rounded-full shadow-md hover:shadow-lg hover:shadow-rose-400/25 transition-all duration-300 transform hover:-translate-y-0.5 shrink-0"
                >
                    <CalendarCheck className="w-3.5 h-3.5 text-rose-300" />
                    <span>{cms.navbar.texto_boton || 'Reservar'}</span>
                </a>
            </div>
        </nav>
    )
}
