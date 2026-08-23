'use client'

import { useQuery } from '@tanstack/react-query'
import { Swiper, SwiperSlide } from 'swiper/react'
import { EffectCoverflow, Autoplay, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/effect-coverflow'
import 'swiper/css/pagination'

async function fetchCarousel(): Promise<string[]> {
    const res = await fetch('/api/carousel')
    if (!res.ok) throw new Error('Error al cargar galería')
    return res.json()
}

export default function CarouselGaleria() {
    const { data: fotos = [], isLoading } = useQuery({
        queryKey: ['carousel'],
        queryFn: fetchCarousel,
        staleTime: 10 * 60 * 1000, // Imágenes se refrescan solo cada 10 minutos
    })

    if (isLoading || fotos.length === 0) return null

    return (
        <section id="galeria" className="pt-16 pb-8 bg-white overflow-hidden">
            <div className="container mx-auto px-6 mb-8 text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-zinc-900" style={{ fontFamily: 'serif' }}>
                    Últimos{' '}
                    <span style={{ background: 'linear-gradient(to right, #C59B27, #E5C158, #C59B27)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                        Trabajos
                    </span>
                </h2>
                <p className="text-zinc-500 mt-2">Desliza para ver la perfección en cada detalle.</p>
            </div>

            <Swiper
                modules={[EffectCoverflow, Autoplay, Pagination]}
                effect="coverflow"
                grabCursor
                centeredSlides
                slidesPerView="auto"
                coverflowEffect={{ rotate: 15, stretch: 0, depth: 100, modifier: 1, slideShadows: true }}
                loop={fotos.length > 2}
                autoplay={{ delay: 3000, disableOnInteraction: false }}
                pagination={{ clickable: true }}
                className="w-full px-6 py-8"
            >
                {fotos.map((url, i) => (
                    <SwiperSlide key={i} style={{ width: 280 }}>
                        <img
                            src={url}
                            alt={`Trabajo ${i + 1}`}
                            style={{ height: 380, width: '100%', objectFit: 'cover' }}
                            className="rounded-[2rem] shadow-xl border-4 border-amber-50"
                        />
                    </SwiperSlide>
                ))}
            </Swiper>
        </section>
    )
}
