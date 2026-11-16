'use client'

import React, { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Swiper, SwiperSlide } from 'swiper/react'
import { EffectCoverflow, Autoplay, Pagination } from 'swiper/modules'
import { Sparkles } from 'lucide-react'
import { DEFAULT_CMS_CONTENIDO, mergeCMSContenido } from '@/lib/cms-types'
import { suscribirCambiosRealtime } from '@/lib/realtime'
import 'swiper/css'
import 'swiper/css/effect-coverflow'
import 'swiper/css/pagination'

async function fetchCarousel(): Promise<string[]> {
    const res = await fetch('/api/carousel')
    if (!res.ok) throw new Error('Error al cargar galería')
    return res.json()
}

export default function CarouselGaleria() {
    const queryClient = useQueryClient()

    const { data: fotos = [], isLoading } = useQuery({
        queryKey: ['carousel'],
        queryFn: fetchCarousel,
        staleTime: 60 * 1000,
        refetchInterval: 15_000,
        refetchOnWindowFocus: true
    })

    // Sincronización en tiempo real al subir/borrar fotos
    useEffect(() => {
        const unsub = suscribirCambiosRealtime((evento) => {
            if (evento.tipo === 'media_actualizado' || evento.tipo === 'all') {
                queryClient.invalidateQueries({ queryKey: ['carousel'] })
            }
        })
        return () => unsub()
    }, [queryClient])

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
    if (!cms.galeria.visible || isLoading || fotos.length === 0) return null

    const g = cms.galeria

    return (
        <section
            id="galeria"
            className="py-16 md:py-20 bg-gradient-to-b from-[#FAF3EE] via-[#FDF9F6] to-[#FAF6F2] overflow-hidden border-y border-rose-200/40"
        >
            <div className="container mx-auto px-6 mb-10 text-center">
                {g.badge && (
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-rose-100/70 border border-rose-200 text-rose-700 text-[10px] font-bold uppercase tracking-[0.25em] mb-3">
                        <Sparkles className="w-3 h-3" /> {g.badge}
                    </div>
                )}
                <h2 className="font-editorial text-4xl md:text-5xl font-semibold text-[#231C19] tracking-tight">
                    {g.titulo}{' '}
                    <span className="italic font-normal text-rose-gold-gradient">
                        {g.titulo_resaltado}
                    </span>
                </h2>
                {g.subtitulo && (
                    <p className="text-stone-500 mt-3 font-normal text-sm sm:text-base max-w-md mx-auto">
                        {g.subtitulo}
                    </p>
                )}
            </div>

            <Swiper
                modules={[EffectCoverflow, Autoplay, Pagination]}
                effect="coverflow"
                grabCursor
                centeredSlides
                slidesPerView="auto"
                coverflowEffect={{
                    rotate: 10,
                    stretch: 0,
                    depth: 110,
                    modifier: 1,
                    slideShadows: false
                }}
                loop={true}
                autoplay={{ delay: 3200, disableOnInteraction: false }}
                pagination={{ clickable: true }}
                className="w-full px-6 py-8"
            >
                {(fotos.length < 6 ? [...fotos, ...fotos, ...fotos] : fotos).map((url, i) => (
                    <SwiperSlide key={i} style={{ width: 290 }}>
                        <div className="group relative rounded-[2rem] overflow-hidden p-1.5 bg-white shadow-xl shadow-rose-900/10 border border-rose-100 transition-all duration-500 hover:-translate-y-1.5">
                            <img
                                src={url}
                                alt={`Diseño Nail Art ${i + 1}`}
                                style={{ height: 380, width: '100%', objectFit: 'cover' }}
                                className="rounded-[1.65rem] group-hover:scale-[1.03] transition-transform duration-700"
                            />
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>
        </section>
    )
}
