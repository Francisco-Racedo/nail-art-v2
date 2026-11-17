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
import { DEFAULT_CMS_CONTENIDO, mergeCMSContenido } from '@/lib/cms-types'

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
    const whatsappNumero = config?.whatsapp_numero || '5493813013850'

    // Sincronización en tiempo real al subir/eliminar videos desde el panel
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

    const swiperRef = useRef<SwiperType | null>(null)
    const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
    const sectionRef = useRef<HTMLElement | null>(null)
    const isMutedRef = useRef(true)
    isMutedRef.current = isMuted

    const isVisibleRef = useRef(false)
    const isUserSwipingRef = useRef(false)

    // Reproducción ultra-optimizada para móviles: un solo decodificador activo a la vez
    const playVideoIndex = useCallback(
        (targetIdx: number, shouldSlideSwiper = false) => {
            setActiveIndex(targetIdx)

            // Solo mover Swiper si fue pedido explícitamente (ej: fin de video en PC o flecha),
            // NUNCA mientras el usuario está deslizando con el dedo en el celular
            if (shouldSlideSwiper && swiperRef.current && !isUserSwipingRef.current) {
                swiperRef.current.slideTo(targetIdx)
            }

            // 1. Pausar inmediatamente todos los videos inactivos para liberar el chip decodificador del celular
            videoRefs.current.forEach((vid, i) => {
                if (!vid) return
                if (i !== targetIdx) {
                    if (!vid.paused) {
                        vid.pause()
                    }
                }
            })

            // 2. Iniciar reproducción del video objetivo
            const targetVid = videoRefs.current[targetIdx]
            if (targetVid) {
                targetVid.muted = isMutedRef.current
                targetVid.defaultMuted = isMutedRef.current

                if (targetVid.ended) {
                    targetVid.currentTime = 0
                }

                const playPromise = targetVid.play()
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            setPlayingState({ [targetIdx]: true })
                        })
                        .catch(err => {
                            if (err.name === 'AbortError') return
                            targetVid.muted = true
                            targetVid.defaultMuted = true
                            targetVid.play()
                                .then(() => {
                                    setPlayingState({ [targetIdx]: true })
                                })
                                .catch(() => {
                                    setPlayingState({ [targetIdx]: false })
                                })
                        })
                }
            }
        },
        []
    )

    // Sensor de visibilidad de la sección
    useEffect(() => {
        const el = sectionRef.current
        if (!el) return

        const observer = new IntersectionObserver(
            ([entry]) => {
                const nowVisible = entry.isIntersecting
                if (nowVisible !== isVisibleRef.current) {
                    isVisibleRef.current = nowVisible

                    if (nowVisible) {
                        playVideoIndex(activeIndex, false)
                    } else {
                        // Al salir de pantalla, pausar el reproductor
                        videoRefs.current.forEach(v => {
                            if (v && !v.paused) v.pause()
                        })
                        setPlayingState({})
                    }
                }
            },
            {
                threshold: 0.15,
                rootMargin: '60px 0px 60px 0px'
            }
        )

        observer.observe(el)
        return () => observer.disconnect()
    }, [activeIndex, playVideoIndex])

    // Eventos de Swiper en celular
    const handleTouchStart = () => {
        isUserSwipingRef.current = true
    }

    const handleTouchEnd = () => {
        setTimeout(() => {
            isUserSwipingRef.current = false
        }, 300)
    }

    const handleSlideChange = (swiper: SwiperType) => {
        const newIdx = swiper.realIndex ?? swiper.activeIndex
        if (newIdx !== activeIndex && isVisibleRef.current) {
            // Reproducir sin forzar slideTo (Swiper ya se está moviendo con el dedo)
            playVideoIndex(newIdx, false)
        }
    }

    // Al finalizar un video: avanzar automáticamente al siguiente reel en bucle continuo
    const handleVideoEnded = (idx: number) => {
        if (reels.length <= 1) {
            const singleVid = videoRefs.current[0]
            if (singleVid) {
                singleVid.currentTime = 0
                singleVid.play().catch(() => {})
            }
            return
        }

        const nextIndex = (idx + 1) % reels.length
        playVideoIndex(nextIndex, true)
    }

    // Alternar sonido global
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

    // Clic / tap directo sobre cualquier reel
    const togglePlayPause = (idx: number) => {
        const vid = videoRefs.current[idx]
        if (!vid) return

        if (idx === activeIndex && playingState[idx]) {
            vid.pause()
            setPlayingState({ [idx]: false })
        } else {
            playVideoIndex(idx, true)
        }
    }

    if (!cms.reels.visible) return null
    if (isLoading && reels.length === 0) return null
    if (reels.length === 0) return null

    return (
        <section
            ref={sectionRef}
            id="reels"
            className="py-14 md:py-20 bg-gradient-to-b from-[#FAF6F2] via-[#FDF8F5] to-[#FAF3EE] border-b border-rose-200/40 relative overflow-hidden"
            style={{ contain: 'paint' }}
        >
            <div className="container mx-auto px-6 mb-8 text-center relative z-10">
                {cms.reels.badge && (
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-rose-100/90 border border-rose-200 text-rose-700 text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] mb-2.5 shadow-sm">
                        <Sparkles className="w-3.5 h-3.5 text-rose-600" /> {cms.reels.badge}
                    </div>
                )}
                <h2 className="font-editorial text-3xl sm:text-4xl md:text-5xl font-semibold text-[#231C19] tracking-tight">
                    {cms.reels.titulo}{' '}
                    <span className="italic font-normal text-rose-gold-gradient">
                        {cms.reels.titulo_resaltado}
                    </span>
                </h2>
                {cms.reels.subtitulo && (
                    <p className="text-stone-500 mt-2 font-normal text-xs sm:text-sm md:text-base max-w-lg mx-auto">
                        {cms.reels.subtitulo}
                    </p>
                )}
            </div>

            {/* Carrusel Swiper de Reels */}
            <div className="w-full relative px-2 sm:px-6 md:px-10 z-10 max-w-7xl mx-auto">
                {/* Botón Navegación Izquierda (Desktop/Tablet) */}
                <button
                    type="button"
                    onClick={() => {
                        const prevIdx = activeIndex === 0 ? reels.length - 1 : activeIndex - 1
                        playVideoIndex(prevIdx, true)
                    }}
                    className="hidden md:flex absolute -left-2 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/95 hover:bg-white text-stone-800 shadow-lg border border-rose-200 items-center justify-center transition-transform hover:scale-110 active:scale-95"
                    title="Anterior reel"
                >
                    <ChevronLeft className="w-6 h-6 text-stone-700" />
                </button>

                {/* Botón Navegación Derecha (Desktop/Tablet) */}
                <button
                    type="button"
                    onClick={() => {
                        const nextIdx = (activeIndex + 1) % reels.length
                        playVideoIndex(nextIdx, true)
                    }}
                    className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/95 hover:bg-white text-stone-800 shadow-lg border border-rose-200 items-center justify-center transition-transform hover:scale-110 active:scale-95"
                    title="Siguiente reel"
                >
                    <ChevronRight className="w-6 h-6 text-stone-700" />
                </button>

                <Swiper
                    modules={[Navigation, Pagination]}
                    onSwiper={swiper => {
                        swiperRef.current = swiper
                    }}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    onSlideChange={handleSlideChange}
                    grabCursor={true}
                    pagination={{ clickable: true, dynamicBullets: true }}
                    breakpoints={{
                        // Celular: 1.22 slides centrado para encuadre nítido y fluido
                        320: {
                            slidesPerView: 1.22,
                            centeredSlides: true,
                            spaceBetween: 12
                        },
                        480: {
                            slidesPerView: 1.45,
                            centeredSlides: true,
                            spaceBetween: 14
                        },
                        // Tablets
                        640: {
                            slidesPerView: 2.2,
                            centeredSlides: false,
                            spaceBetween: 16
                        },
                        768: {
                            slidesPerView: 3,
                            centeredSlides: false,
                            spaceBetween: 18
                        },
                        // PC / Laptops
                        1024: {
                            slidesPerView: 3.5,
                            centeredSlides: false,
                            spaceBetween: 20
                        },
                        1280: {
                            slidesPerView: 4,
                            centeredSlides: false,
                            spaceBetween: 22
                        }
                    }}
                    className="w-full pb-10 pt-1 !overflow-visible"
                >
                    {reels.map((reel: ReelItem, idx: number) => {
                        const isActive = idx === activeIndex
                        const isPlaying = playingState[idx] ?? false

                        // Aceleración de memoria: solo precargar el activo y el vecino inmediato
                        const isAdjacent = Math.abs(idx - activeIndex) <= 1
                        const preloadMode = isActive ? 'auto' : (isAdjacent ? 'metadata' : 'none')

                        return (
                            <SwiperSlide key={reel.name || idx}>
                                <div
                                    onClick={() => togglePlayPause(idx)}
                                    className={`relative w-full rounded-[2rem] overflow-hidden border cursor-pointer select-none bg-stone-950 transition-colors duration-200 ${
                                        isActive
                                            ? 'ring-2 ring-rose-400 border-white shadow-xl'
                                            : 'border-rose-100/70 shadow-md'
                                    }`}
                                    style={{
                                        aspectRatio: '9/16',
                                        transform: 'translateZ(0)',
                                        WebkitTransform: 'translateZ(0)',
                                        backfaceVisibility: 'hidden',
                                        WebkitBackfaceVisibility: 'hidden'
                                    }}
                                >
                                    {/* Video Player nativo con aceleración por hardware */}
                                    <video
                                        ref={el => {
                                            videoRefs.current[idx] = el
                                            if (el) {
                                                el.muted = isMutedRef.current
                                                el.defaultMuted = isMutedRef.current
                                            }
                                        }}
                                        src={reel.url}
                                        className="w-full h-full object-cover"
                                        playsInline
                                        // @ts-ignore
                                        webkit-playsinline="true"
                                        muted={isMuted}
                                        preload={preloadMode}
                                        // @ts-ignore
                                        disablePictureInPicture={true}
                                        // @ts-ignore
                                        disableRemotePlayback={true}
                                        onEnded={() => handleVideoEnded(idx)}
                                        onPlay={() =>
                                            setPlayingState({ [idx]: true })
                                        }
                                        onPause={() =>
                                            setPlayingState(prev => (prev[idx] ? { [idx]: false } : prev))
                                        }
                                        style={{
                                            transform: 'translateZ(0)',
                                            WebkitTransform: 'translateZ(0)'
                                        }}
                                    />

                                    {/* Overlay ligero optimizado sin backdrop-blur pesado para 60fps en celular */}
                                    <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent via-50% to-black/85 pointer-events-none" />

                                    {/* Header de la tarjeta */}
                                    <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between z-10 pointer-events-none">
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 border border-white/20 text-white text-[10px] font-bold">
                                            <Film className="w-3 h-3 text-rose-300" /> REEL #{idx + 1}
                                        </div>

                                        {/* Botón de Sonido con fondo sólido translúcido (0% costo GPU) */}
                                        <button
                                            type="button"
                                            onClick={toggleSound}
                                            className="pointer-events-auto w-8 h-8 rounded-full bg-black/75 text-white flex items-center justify-center hover:bg-black transition shadow border border-white/20"
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
                                        <div className="absolute inset-0 m-auto w-13 h-13 rounded-full bg-white/95 text-stone-900 shadow-xl flex items-center justify-center pointer-events-none">
                                            <Play className="w-5 h-5 ml-0.5 fill-current text-rose-600" />
                                        </div>
                                    )}

                                    {/* Indicador estático liviano de Reel Activo */}
                                    {isActive && isPlaying && (
                                        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
                                            <span className="inline-block w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
                                        </div>
                                    )}

                                    {/* Footer con información y CTA de WhatsApp */}
                                    <div className="absolute bottom-3.5 left-3.5 right-3.5 z-10 flex flex-col gap-2 pointer-events-none">
                                        <div>
                                            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-rose-300">
                                                Pintaditas Nails • Mili
                                            </p>
                                            <p className="text-white text-xs sm:text-sm font-semibold drop-shadow line-clamp-1">
                                                Diseño en Movimiento ✨
                                            </p>
                                        </div>

                                        <a
                                            href={`https://wa.me/${whatsappNumero}?text=Hola!%20Vi%20este%20dise%C3%B1o%20en%20los%20Reels%20de%20tu%20web%20y%20me%20encant%C3%B3!%20%C2%BFTen%C3%A9s%20turno%20disponible?`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={e => e.stopPropagation()}
                                            className="pointer-events-auto inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition active:scale-95"
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
