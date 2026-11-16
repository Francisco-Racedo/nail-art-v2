'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination } from 'swiper/modules'
import type { Swiper as SwiperType } from 'swiper'
import {
    Play,
    Pause,
    Volume2,
    VolumeX,
    Sparkles,
    MessageCircle,
    Film,
    ChevronLeft,
    ChevronRight
} from 'lucide-react'
import { suscribirCambiosRealtime } from '@/lib/realtime'

import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

export interface ReelItem {
    name: string
    url: string
    created_at?: string
    size?: number
}

async function fetchReels(): Promise<ReelItem[]> {
    const res = await fetch('/api/reels', { cache: 'no-store' })
    if (!res.ok) throw new Error('Error al cargar reels')
    return res.json()
}

export default function ReelsSection() {
    const queryClient = useQueryClient()
    const { data: uploadedReels = [], isLoading } = useQuery<ReelItem[]>({
        queryKey: ['reels'],
        queryFn: fetchReels,
        staleTime: 30 * 1000,
        refetchInterval: 10_000,
        refetchOnWindowFocus: true
    })

    // Sincronización en tiempo real inmediata al subir/borrar desde el panel admin
    useEffect(() => {
        const unsub = suscribirCambiosRealtime((evento) => {
            if (evento.tipo === 'media_actualizado' || evento.tipo === 'all') {
                queryClient.invalidateQueries({ queryKey: ['reels'] })
            }
        })
        return () => unsub()
    }, [queryClient])

    const reels = uploadedReels
    const [activeIndex, setActiveIndex] = useState(0)
    const [isMuted, setIsMuted] = useState(true)
    const [playingState, setPlayingState] = useState<Record<number, boolean>>({})
    const [sectionVisible, setSectionVisible] = useState(false)

    const swiperRef = useRef<SwiperType | null>(null)
    const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
    const sectionRef = useRef<HTMLElement | null>(null)
    const isMutedRef = useRef(true)
    isMutedRef.current = isMuted

    // Reproducir un reel específico y pausar todos los demás
    const playVideoIndex = useCallback(
        (targetIdx: number) => {
            setActiveIndex(targetIdx)

            // Intentar deslizar el carrusel hacia ese slide si no está centrado
            if (swiperRef.current) {
                swiperRef.current.slideTo(targetIdx)
            }

            videoRefs.current.forEach((vid, i) => {
                if (!vid) return
                if (i === targetIdx) {
                    vid.muted = isMutedRef.current
                    vid.defaultMuted = isMutedRef.current
                    vid.currentTime = 0

                    const playPromise = vid.play()
                    if (playPromise !== undefined) {
                        playPromise
                            .then(() => {
                                setPlayingState({ [i]: true })
                            })
                            .catch(err => {
                                console.warn('Autoplay bloqueado con audio, forzando mute:', err)
                                vid.muted = true
                                vid.defaultMuted = true
                                vid.play()
                                    .then(() => {
                                        setPlayingState({ [i]: true })
                                    })
                                    .catch(() => {
                                        setPlayingState({ [i]: false })
                                    })
                            })
                    }
                } else {
                    vid.pause()
                    vid.currentTime = 0
                }
            })
        },
        []
    )

    // Detectar si la sección está visible en pantalla (PC y celular)
    useEffect(() => {
        const el = sectionRef.current
        if (!el) return

        const checkInView = () => {
            const rect = el.getBoundingClientRect()
            const inView = rect.top < window.innerHeight && rect.bottom > 0
            if (inView && !sectionVisible) {
                setSectionVisible(true)
            } else if (!inView && sectionVisible) {
                setSectionVisible(false)
            }
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                setSectionVisible(entry.isIntersecting)
            },
            {
                threshold: [0, 0.05, 0.1, 0.25],
                rootMargin: '100px 0px 100px 0px'
            }
        )

        observer.observe(el)
        window.addEventListener('scroll', checkInView, { passive: true })
        window.addEventListener('resize', checkInView, { passive: true })

        checkInView()

        return () => {
            observer.disconnect()
            window.removeEventListener('scroll', checkInView)
            window.removeEventListener('resize', checkInView)
        }
    }, [sectionVisible])

    // Reaccionar a cambios de visibilidad de la sección
    useEffect(() => {
        if (!sectionVisible) {
            // Pausar todos los videos si la sección salió de la pantalla
            videoRefs.current.forEach(vid => {
                if (vid && !vid.paused) vid.pause()
            })
            setPlayingState({})
        } else {
            // Reproducir el video activo en cuanto la sección entra en pantalla
            playVideoIndex(activeIndex)
        }
    }, [sectionVisible, activeIndex, playVideoIndex])

    // Al deslizar en celular o avanzar con flechas
    const handleSlideChange = (swiper: SwiperType) => {
        const newIdx = swiper.realIndex ?? swiper.activeIndex
        if (newIdx !== activeIndex) {
            playVideoIndex(newIdx)
        }
    }

    // Al finalizar un video: avanzar automáticamente al siguiente reel en bucle continuo
    const handleVideoEnded = (idx: number) => {
        if (reels.length <= 1) {
            // Si hay un solo video, reiniciarlo en bucle
            const singleVid = videoRefs.current[0]
            if (singleVid) {
                singleVid.currentTime = 0
                singleVid.play().catch(() => {})
            }
            return
        }

        // Pasar siempre al siguiente video de forma consecutiva (0 -> 1 -> 2 -> 3 -> 4 -> 0...)
        const nextIndex = (idx + 1) % reels.length
        playVideoIndex(nextIndex)
    }

    // Alternar sonido global para los reels
    const toggleSound = (e: React.MouseEvent) => {
        e.stopPropagation()
        const newMuted = !isMuted
        setIsMuted(newMuted)
        isMutedRef.current = newMuted

        const activeVid = videoRefs.current[activeIndex]
        if (activeVid) {
            activeVid.muted = newMuted
            activeVid.defaultMuted = newMuted
        }
    }

    // Tocar o hacer clic en cualquier reel (sea el activo o cualquier otro)
    const togglePlayPause = (idx: number) => {
        const vid = videoRefs.current[idx]
        if (!vid) return

        // Si es el reel que ya está reproduciéndose, pausarlo
        if (idx === activeIndex && playingState[idx]) {
            vid.pause()
            setPlayingState({ [idx]: false })
        } else {
            // Si estaba pausado o es otro reel, reproducirlo directamente
            playVideoIndex(idx)
        }
    }

    // Si no hay reels aún o está cargando y no hay datos, no mostrar nada
    if (isLoading && reels.length === 0) return null
    if (reels.length === 0) return null

    return (
        <section
            ref={sectionRef}
            id="reels"
            className="py-16 md:py-20 bg-gradient-to-b from-[#FAF6F2] via-[#FDF8F5] to-[#FAF3EE] border-b border-rose-200/40 relative overflow-hidden"
        >
            {/* Resplandores decorativos */}
            <div className="absolute top-0 right-10 w-96 h-96 bg-rose-200/25 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-10 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl pointer-events-none" />

            <div className="container mx-auto px-6 mb-10 text-center relative z-10">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-rose-100/90 border border-rose-200 text-rose-700 text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] mb-3 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5" /> NAILS EN MOVIMIENTO
                </div>
                <h2 className="font-editorial text-3xl sm:text-4xl md:text-5xl font-semibold text-[#231C19] tracking-tight">
                    Reels &amp;{' '}
                    <span className="italic font-normal text-rose-gold-gradient">
                        Trabajos Reales
                    </span>
                </h2>
                <p className="text-stone-500 mt-2.5 font-normal text-xs sm:text-sm md:text-base max-w-lg mx-auto">
                    Apreciá el brillo, los relieves y la terminación en video. Se reproducen de forma continua uno tras otro.
                </p>
            </div>

            {/* Carrusel Swiper de Reels */}
            <div className="w-full relative px-2 sm:px-6 md:px-10 z-10 max-w-7xl mx-auto">
                {/* Botón Navegación Izquierda (Desktop/Tablet) */}
                <button
                    type="button"
                    onClick={() => {
                        const prevIdx = activeIndex === 0 ? reels.length - 1 : activeIndex - 1
                        playVideoIndex(prevIdx)
                    }}
                    className="hidden md:flex absolute -left-2 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/95 hover:bg-white text-stone-800 shadow-xl border border-rose-200 items-center justify-center transition-transform hover:scale-110 active:scale-95"
                    title="Anterior reel"
                >
                    <ChevronLeft className="w-6 h-6 text-stone-700" />
                </button>

                {/* Botón Navegación Derecha (Desktop/Tablet) */}
                <button
                    type="button"
                    onClick={() => {
                        const nextIdx = (activeIndex + 1) % reels.length
                        playVideoIndex(nextIdx)
                    }}
                    className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/95 hover:bg-white text-stone-800 shadow-xl border border-rose-200 items-center justify-center transition-transform hover:scale-110 active:scale-95"
                    title="Siguiente reel"
                >
                    <ChevronRight className="w-6 h-6 text-stone-700" />
                </button>

                <Swiper
                    modules={[Navigation, Pagination]}
                    onSwiper={swiper => {
                        swiperRef.current = swiper
                    }}
                    onSlideChange={handleSlideChange}
                    grabCursor={true}
                    pagination={{ clickable: true, dynamicBullets: true }}
                    breakpoints={{
                        // Celular: centrado, 1.22 slides para encuadre simétrico sin cortes
                        320: {
                            slidesPerView: 1.22,
                            centeredSlides: true,
                            spaceBetween: 14
                        },
                        480: {
                            slidesPerView: 1.45,
                            centeredSlides: true,
                            spaceBetween: 16
                        },
                        // Tablets
                        640: {
                            slidesPerView: 2.2,
                            centeredSlides: false,
                            spaceBetween: 18
                        },
                        768: {
                            slidesPerView: 3,
                            centeredSlides: false,
                            spaceBetween: 20
                        },
                        // PC / Laptops
                        1024: {
                            slidesPerView: 3.5,
                            centeredSlides: false,
                            spaceBetween: 22
                        },
                        1280: {
                            slidesPerView: 4,
                            centeredSlides: false,
                            spaceBetween: 24
                        }
                    }}
                    className="w-full pb-12 pt-2 !overflow-visible"
                >
                    {reels.map((reel: ReelItem, idx: number) => {
                        const isActive = idx === activeIndex
                        const isPlaying = playingState[idx] ?? false

                        return (
                            <SwiperSlide key={reel.name || idx}>
                                <div
                                    onClick={() => togglePlayPause(idx)}
                                    className={`relative w-full rounded-[2.25rem] overflow-hidden shadow-xl border transition-all duration-500 cursor-pointer select-none bg-stone-950 group ${
                                        isActive
                                            ? 'ring-2 ring-rose-400 border-white shadow-2xl scale-[1.02]'
                                            : 'border-rose-100/80 shadow-md opacity-90 hover:opacity-100 hover:scale-[1.01]'
                                    }`}
                                    style={{ aspectRatio: '9/16' }}
                                >
                                    {/* Video Player */}
                                    <video
                                        ref={el => {
                                            videoRefs.current[idx] = el
                                            if (el) {
                                                el.muted = isMuted
                                                el.defaultMuted = isMuted
                                            }
                                        }}
                                        src={reel.url}
                                        className="w-full h-full object-cover"
                                        playsInline
                                        autoPlay={idx === 0}
                                        muted={isMuted}
                                        preload="auto"
                                        onEnded={() => handleVideoEnded(idx)}
                                        onPlay={() =>
                                            setPlayingState({ [idx]: true })
                                        }
                                        onPause={() =>
                                            setPlayingState(prev => (prev[idx] ? { [idx]: false } : prev))
                                        }
                                    />

                                    {/* Gradiente estilo Instagram Reels */}
                                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent via-55% to-black/85 pointer-events-none" />

                                    {/* Header de la tarjeta */}
                                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold">
                                            <Film className="w-3 h-3 text-rose-300" /> REEL #{idx + 1}
                                        </div>

                                        {/* Botón de Sonido interactivo */}
                                        <button
                                            type="button"
                                            onClick={toggleSound}
                                            className="pointer-events-auto w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition shadow-md border border-white/20"
                                            title={isMuted ? 'Activar sonido' : 'Silenciar'}
                                        >
                                            {isMuted ? (
                                                <VolumeX className="w-4 h-4 text-white/90" />
                                            ) : (
                                                <Volume2 className="w-4 h-4 text-emerald-300" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Botón central de Play si está pausado */}
                                    {!isPlaying && (
                                        <div className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-white/90 text-stone-900 shadow-2xl flex items-center justify-center pointer-events-none transform scale-100 group-hover:scale-110 transition duration-300">
                                            <Play className="w-6 h-6 ml-1 fill-current text-rose-600" />
                                        </div>
                                    )}

                                    {/* Indicador de Reel Activo */}
                                    {isActive && isPlaying && (
                                        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
                                            <span className="flex h-2 w-2 relative">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                                            </span>
                                        </div>
                                    )}

                                    {/* Footer con información y CTA de WhatsApp */}
                                    <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-col gap-2 pointer-events-none">
                                        <div>
                                            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-rose-300">
                                                Pintaditas Nails • Mili
                                            </p>
                                            <p className="text-white text-xs sm:text-sm font-semibold drop-shadow line-clamp-1">
                                                Diseño en Movimiento ✨
                                            </p>
                                        </div>

                                        <a
                                            href={`https://wa.me/5493816988692?text=Hola%20Mili!%20Vi%20este%20dise%C3%B1o%20en%20los%20Reels%20de%20tu%20web%20y%20me%20encant%C3%B3!%20%C2%BFTen%C3%A9s%20turno%20disponible?`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={e => e.stopPropagation()}
                                            className="pointer-events-auto inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition transform hover:-translate-y-0.5 active:translate-y-0"
                                        >
                                            <MessageCircle className="w-3.5 h-3.5" />
                                            Pedir este diseño
                                        </a>
                                    </div>
                                </div>
                            </SwiperSlide>
                        )
                    })}
                </Swiper>
            </div>
        </section>
    )
}
