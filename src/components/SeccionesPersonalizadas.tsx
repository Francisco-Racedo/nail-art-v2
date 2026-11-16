'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
    Sparkles,
    Crown,
    Gem,
    Heart,
    Star,
    Flame,
    Award,
    Gift,
    ShieldCheck,
    Clock,
    ArrowUpRight
} from 'lucide-react'
import type {
    IconoAnimadoCMS,
    SeccionPersonalizada,
    AnimacionPremiumCMS,
    EstiloFondoCMS
} from '@/lib/cms-types'

export function IconoAnimadoRenderer({
    icono,
    className = 'w-4 h-4'
}: {
    icono: IconoAnimadoCMS | string
    className?: string
}) {
    const map: Record<string, React.ComponentType<{ className?: string }>> = {
        sparkles: Sparkles,
        crown: Crown,
        gem: Gem,
        heart: Heart,
        star: Star,
        flame: Flame,
        award: Award,
        gift: Gift,
        shield: ShieldCheck,
        clock: Clock
    }
    const IconComp = map[icono] || Sparkles
    return (
        <motion.span
            animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.12, 1] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            className="inline-flex items-center justify-center"
        >
            <IconComp className={className} />
        </motion.span>
    )
}

function getVariantesAnimacion(tipo: AnimacionPremiumCMS) {
    switch (tipo) {
        case 'zoom_luxury':
            return {
                initial: { opacity: 0, scale: 0.92 },
                whileInView: { opacity: 1, scale: 1 },
                transition: { duration: 0.7, ease: 'easeOut' as const }
            }
        case 'float_suave':
            return {
                initial: { opacity: 0, y: 30 },
                whileInView: { opacity: 1, y: 0 },
                transition: { duration: 0.8, ease: 'easeOut' as const }
            }
        case 'resplandor_dorado':
            return {
                initial: { opacity: 0, y: 20, filter: 'blur(6px)' },
                whileInView: { opacity: 1, y: 0, filter: 'blur(0px)' },
                transition: { duration: 0.75, ease: 'easeOut' as const }
            }
        case 'fade_up':
        default:
            return {
                initial: { opacity: 0, y: 24 },
                whileInView: { opacity: 1, y: 0 },
                transition: { duration: 0.6, ease: 'easeOut' as const }
            }
    }
}

function getClasesFondo(estilo: EstiloFondoCMS) {
    switch (estilo) {
        case 'espresso_luxury':
            return {
                section:
                    'bg-gradient-to-br from-[#231C19] via-[#322622] to-[#1D1614] text-[#FDF8F5]',
                card: 'bg-white/10 border border-white/15 backdrop-blur-md text-white',
                badge: 'bg-white/10 border-white/20 text-amber-300',
                title: 'text-white',
                desc: 'text-stone-300',
                btn: 'bg-gradient-to-r from-rose-400 to-amber-400 text-[#231C19]'
            }
        case 'rose_gold_glow':
            return {
                section:
                    'bg-gradient-to-br from-rose-100/90 via-pink-50 to-amber-100/80 text-[#231C19]',
                card: 'glass-editorial text-[#231C19]',
                badge: 'bg-white/90 border-rose-300 text-rose-700',
                title: 'text-[#231C19]',
                desc: 'text-stone-700',
                btn: 'bg-gradient-to-r from-rose-500 to-amber-500 text-white'
            }
        case 'cristal_minimal':
            return {
                section: 'bg-white/70 text-[#231C19]',
                card: 'bg-[#FAF6F2] border border-rose-200/70 text-[#231C19]',
                badge: 'bg-rose-50 border-rose-200 text-rose-700',
                title: 'text-[#231C19]',
                desc: 'text-stone-600',
                btn: 'bg-[#231C19] text-white hover:bg-rose-600'
            }
        case 'perla_editorial':
        default:
            return {
                section:
                    'bg-gradient-to-b from-[#FAF6F2] via-[#FDF8F5] to-[#F6EAE3] text-[#231C19]',
                card: 'glass-editorial text-[#231C19]',
                badge: 'bg-rose-100/80 border-rose-200 text-rose-700',
                title: 'text-[#231C19]',
                desc: 'text-stone-600',
                btn: 'bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 text-white'
            }
    }
}

export default function SeccionesPersonalizadas({
    secciones,
    posicion
}: {
    secciones?: SeccionPersonalizada[]
    posicion: 'antes_servicios' | 'despues_servicios' | 'despues_reserva'
}) {
    const { data: config } = useQuery({
        queryKey: ['config'],
        queryFn: async () => {
            const res = await fetch('/api/config', { cache: 'no-store' })
            if (!res.ok) return null
            return res.json()
        },
        staleTime: 10_000
    })

    const lista =
        config?.cms?.secciones_personalizadas !== undefined
            ? (config.cms.secciones_personalizadas as SeccionPersonalizada[])
            : secciones || []

    const activas = lista.filter(s => s.visible && s.posicion === posicion)
    if (activas.length === 0) return null

    return (
        <>
            {activas.map(sec => {
                const anim = getVariantesAnimacion(sec.animacion || 'fade_up')
                const tema = getClasesFondo(sec.estilo_fondo || 'perla_editorial')
                const tieneMedia =
                    sec.media_tipo !== 'ninguno' && sec.media_url && sec.media_url.trim() !== ''

                return (
                    <section
                        key={sec.id}
                        className={`py-16 md:py-22 px-5 sm:px-8 relative overflow-hidden border-t border-rose-200/30 ${tema.section}`}
                    >
                        {sec.animacion === 'resplandor_dorado' && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-rose-400/20 rounded-full blur-[110px] pointer-events-none" />
                        )}

                        <motion.div
                            initial={anim.initial}
                            whileInView={anim.whileInView}
                            viewport={{ once: true }}
                            transition={anim.transition}
                            className="max-w-6xl mx-auto relative z-10"
                        >
                            <div
                                className={`grid grid-cols-1 ${
                                    tieneMedia ? 'lg:grid-cols-12 gap-10 items-center' : ''
                                }`}
                            >
                                {/* Columna de Texto */}
                                <div
                                    className={`${
                                        tieneMedia
                                            ? 'lg:col-span-7 text-left'
                                            : 'max-w-3xl mx-auto text-center'
                                    }`}
                                >
                                    {sec.badge && (
                                        <div
                                            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[11px] font-bold uppercase tracking-[0.22em] mb-4 ${tema.badge}`}
                                        >
                                            <IconoAnimadoRenderer
                                                icono={sec.icono_animado}
                                                className="w-3.5 h-3.5"
                                            />
                                            <span>{sec.badge}</span>
                                        </div>
                                    )}

                                    <h2
                                        className={`font-editorial text-4xl sm:text-5xl font-semibold tracking-tight mb-4 leading-tight ${tema.title}`}
                                    >
                                        {sec.titulo}{' '}
                                        {sec.titulo_resaltado && (
                                            <span className="italic font-normal text-rose-gold-gradient">
                                                {sec.titulo_resaltado}
                                            </span>
                                        )}
                                    </h2>

                                    {sec.descripcion && (
                                        <p
                                            className={`text-sm sm:text-base leading-relaxed mb-6 whitespace-pre-line ${tema.desc}`}
                                        >
                                            {sec.descripcion}
                                        </p>
                                    )}

                                    {/* Tarjetas o ítems destacados dentro de la sección */}
                                    {sec.items && sec.items.length > 0 && (
                                        <div
                                            className={`grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-6 mb-6 text-left`}
                                        >
                                            {sec.items.map(it => (
                                                <motion.div
                                                    key={it.id}
                                                    whileHover={{ y: -3 }}
                                                    className={`rounded-2xl p-4 shadow-sm flex items-start gap-3 ${tema.card}`}
                                                >
                                                    <span className="text-xl shrink-0">
                                                        {it.icono || '✨'}
                                                    </span>
                                                    <div>
                                                        <p className="font-bold text-sm mb-0.5">
                                                            {it.titulo}
                                                        </p>
                                                        <p className="text-xs opacity-80 leading-relaxed">
                                                            {it.descripcion}
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}

                                    {sec.boton_texto && (
                                        <a
                                            href={sec.boton_link || '#reserva'}
                                            className={`inline-flex items-center gap-2 font-bold text-xs uppercase tracking-[0.18em] px-7 py-3.5 rounded-full shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 ${tema.btn}`}
                                        >
                                            <IconoAnimadoRenderer
                                                icono={sec.icono_animado}
                                                className="w-4 h-4"
                                            />
                                            <span>{sec.boton_texto}</span>
                                            <ArrowUpRight className="w-4 h-4" />
                                        </a>
                                    )}
                                </div>

                                {/* Columna Multimedia (Imagen o Video) */}
                                {tieneMedia && (
                                    <motion.div
                                        animate={
                                            sec.animacion === 'float_suave'
                                                ? { y: [0, -8, 0] }
                                                : undefined
                                        }
                                        transition={
                                            sec.animacion === 'float_suave'
                                                ? {
                                                      repeat: Infinity,
                                                      duration: 6,
                                                      ease: 'easeInOut'
                                                  }
                                                : undefined
                                        }
                                        className="lg:col-span-5"
                                    >
                                        <div className="rounded-[2.25rem] overflow-hidden border-[6px] border-white shadow-2xl bg-stone-900/10">
                                            {sec.media_tipo === 'video' ? (
                                                <video
                                                    src={sec.media_url}
                                                    autoPlay
                                                    muted
                                                    loop
                                                    playsInline
                                                    controls
                                                    className="w-full max-h-[460px] object-cover"
                                                />
                                            ) : (
                                                <img
                                                    src={sec.media_url}
                                                    alt={sec.titulo}
                                                    className="w-full max-h-[460px] object-cover hover:scale-105 transition-transform duration-700"
                                                />
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    </section>
                )
            })}
        </>
    )
}
