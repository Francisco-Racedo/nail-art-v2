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
        <section id="galeria" className="pt-16 pb-8 bg-gradient-to-b from-[#FAECE3] to-stone-50 overflow-hidden">
            <div className="container mx-auto px-6 mb-12 text-center">
                <h2 className="text-3xl md:text-4xl font-light text-stone-800 tracking-wide" style={{ fontFamily: 'serif' }}>
                    Últimos{' '}
                    <span className="font-bold tracking-widest" style={{ background: 'linear-gradient(to right, #C59B27, #D4AF37, #C59B27)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                        Trabajos
                    </span>
                </h2>
                <p className="text-stone-500 mt-4 font-light text-sm tracking-wide">Desliza para ver la perfección en cada detalle.</p>
            </div>

            <Swiper
                modules={[EffectCoverflow, Autoplay, Pagination]}
                effect="coverflow"
                grabCursor
                centeredSlides
                slidesPerView="auto"
                coverflowEffect={{ rotate: 15, stretch: 0, depth: 100, modifier: 1, slideShadows: true }}
                loop={true}
                autoplay={{ delay: 3000, disableOnInteraction: false }}
                pagination={{ clickable: true }}
                className="w-full px-6 py-8"
            >
                {(fotos.length < 6 ? [...fotos, ...fotos, ...fotos] : fotos).map((url, i) => (
                    <SwiperSlide key={i} style={{ width: 280 }}>
                        <img
                            src={url}
                            alt={`Trabajo ${i + 1}`}
                            style={{ height: 380, width: '100%', objectFit: 'cover' }}
                            className="rounded-3xl shadow-md hover:shadow-xl hover:scale-[1.02] transition-all duration-500 border border-white/60"
                        />
                    </SwiperSlide>
                ))}
            </Swiper>
        </section>
    )
}
