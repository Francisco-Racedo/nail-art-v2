'use client'

import React, { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Play, Pause, Volume2, VolumeX, Sparkles, MessageCircle, Film } from 'lucide-react'

interface ReelItem {
    name: string
    url: string
    created_at?: string
}

async function fetchReels(): Promise<ReelItem[]> {
    const res = await fetch('/api/reels')
    if (!res.ok) throw new Error('Error al cargar reels')
    return res.json()
}

// Muestras por defecto si la dueña aún no cargó sus propios videos
const DEMO_REELS: ReelItem[] = [
    {
        name: 'demo-nail-art-1',
        url: 'https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-woman-applying-nail-polish-40899-large.mp4',
        created_at: '2026-11-16'
    },
    {
        name: 'demo-nail-art-2',
        url: 'https://assets.mixkit.co/videos/preview/mixkit-woman-with-manicured-hands-doing-a-hand-gesture-40902-large.mp4',
        created_at: '2026-11-16'
    }
]

export default function ReelsSection() {
    const { data: uploadedReels = [], isLoading } = useQuery({
        queryKey: ['reels'],
        queryFn: fetchReels,
        staleTime: 5 * 60 * 1000
    })

    const reels: ReelItem[] = uploadedReels.length > 0 ? uploadedReels : DEMO_REELS
    const [mutedStates, setMutedStates] = useState<Record<number, boolean>>({})
    const [playingStates, setPlayingStates] = useState<Record<number, boolean>>({ 0: true })
    const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({})

    const togglePlay = (idx: number) => {
        const video = videoRefs.current[idx]
        if (!video) return

        if (video.paused) {
            video.play().catch(() => {})
            setPlayingStates(prev => ({ ...prev, [idx]: true }))
        } else {
            video.pause()
            setPlayingStates(prev => ({ ...prev, [idx]: false }))
        }
    }

    const toggleSound = (e: React.MouseEvent, idx: number) => {
        e.stopPropagation()
        const video = videoRefs.current[idx]
        if (!video) return

        const currentMuted = video.muted
        video.muted = !currentMuted
        setMutedStates(prev => ({ ...prev, [idx]: !currentMuted }))
    }

    if (isLoading) return null

    return (
        <section
            id="reels"
            className="py-14 sm:py-18 bg-gradient-to-b from-[#FAF6F2] via-[#FDF8F5] to-[#FAF3EE] border-b border-rose-200/40 relative overflow-hidden"
        >
            {/* Elemento decorativo sutil */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-rose-200/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-amber-200/20 rounded-full blur-3xl pointer-events-none" />

            <div className="container mx-auto px-6 mb-8 text-center relative z-10">
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
                    Descubrí el brillo, los relieves y la terminación de cada diseño en video. Tocá cualquier reel para pausar o activar sonido.
                </p>
            </div>

            {/* Contenedor de Reels con scroll horizontal suave y centrado */}
            <div className="container mx-auto px-4 sm:px-6 relative z-10">
                <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-6 pt-2 snap-x snap-mandatory scroll-smooth justify-start md:justify-center no-scrollbar">
                    {reels.map((reel: ReelItem, idx: number) => {
                        const isMuted = mutedStates[idx] ?? true
                        const isPlaying = playingStates[idx] ?? false

                        return (
                            <div
                                key={reel.name || idx}
                                className="snap-center shrink-0 w-[240px] sm:w-[270px] md:w-[290px] h-[430px] sm:h-[480px] md:h-[510px] rounded-[2.25rem] overflow-hidden relative shadow-xl shadow-rose-950/15 border border-rose-200/70 group bg-stone-900 cursor-pointer select-none"
                                onClick={() => togglePlay(idx)}
                            >
                                {/* Video Player */}
                                <video
                                    ref={el => {
                                        videoRefs.current[idx] = el
                                    }}
                                    src={reel.url}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                    loop
                                    playsInline
                                    muted={isMuted}
                                    autoPlay={idx === 0}
                                    onPlay={() =>
                                        setPlayingStates(prev => ({ ...prev, [idx]: true }))
                                    }
                                    onPause={() =>
                                        setPlayingStates(prev => ({ ...prev, [idx]: false }))
                                    }
                                />

                                {/* Overlay degradé tipo Instagram/TikTok */}
                                <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/80 pointer-events-none" />

                                {/* Header del Reel */}
                                <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold">
                                        <Film className="w-3 h-3 text-rose-300" /> REEL
                                    </div>

                                    {/* Botón de Sonido */}
                                    <button
                                        type="button"
                                        onClick={e => toggleSound(e, idx)}
                                        className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/70 transition shadow-md border border-white/20"
                                        title={isMuted ? 'Activar sonido' : 'Silenciar'}
                                    >
                                        {isMuted ? (
                                            <VolumeX className="w-4 h-4 text-white/90" />
                                        ) : (
                                            <Volume2 className="w-4 h-4 text-emerald-300" />
                                        )}
                                    </button>
                                </div>

                                {/* Botón Play flotante cuando está pausado */}
                                {!isPlaying && (
                                    <div className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-white/90 text-stone-900 shadow-2xl flex items-center justify-center pointer-events-none transform scale-100 group-hover:scale-110 transition duration-300">
                                        <Play className="w-6 h-6 ml-1 fill-current text-rose-600" />
                                    </div>
                                )}

                                {/* Footer con Acción para pedir el diseño */}
                                <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-col gap-2">
                                    <div>
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-rose-300">
                                            Pintaditas Nails
                                        </p>
                                        <p className="text-white text-xs sm:text-sm font-semibold drop-shadow-md line-clamp-1">
                                            Diseño de Autor en Video ✨
                                        </p>
                                    </div>

                                    <a
                                        href={`https://wa.me/5493816988692?text=Hola%20Mili!%20Vi%20este%20reel%20en%20la%20web%20y%20me%20encant%C3%B3%20el%20dise%C3%B1o,%20%C2%BFten%C3%A9s%20disponibilidad%20para%20hac%C3%A9rmelo?`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={e => e.stopPropagation()}
                                        className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-lg shadow-emerald-950/30 transition transform hover:-translate-y-0.5 active:translate-y-0"
                                    >
                                        <MessageCircle className="w-3.5 h-3.5" />
                                        Pedir este diseño
                                    </a>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
