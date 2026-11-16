'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Sparkles, ArrowDownRight } from 'lucide-react'
import { DEFAULT_CMS_CONTENIDO, mergeCMSContenido } from '@/lib/cms-types'
import { IconoAnimadoRenderer } from './SeccionesPersonalizadas'

export default function HeroSection({ initialNombre }: { initialNombre?: string }) {
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])

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
    if (!cms.hero.visible) return null

    const firmaNegocio = config?.nombre_negocio || initialNombre || 'Fran & Romy'
    const h = cms.hero

    return (
        <header className="relative w-full max-w-[1400px] mx-auto pt-8 md:pt-14 pb-16 md:pb-24 px-5 sm:px-8 md:px-14 mb-12 font-sans overflow-hidden">
            {/* Halos de luz seda y oro rosa */}
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-rose-200/45 rounded-full blur-[90px] pointer-events-none" />
            <div className="absolute top-1/3 -right-24 w-96 h-96 bg-amber-200/40 rounded-full blur-[100px] pointer-events-none" />

            <div className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-12 items-center relative z-10">
                {/* Columna Editorial Izquierda (7 cols) */}
                <div className="w-full lg:col-span-7 pb-8 lg:pb-0">
                    {mounted ? (
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={{
                                hidden: {},
                                visible: { transition: { staggerChildren: 0.12 } }
                            }}
                            className="flex flex-col items-center text-center lg:items-start lg:text-left"
                        >
                            {/* Insignia Superior Luxury */}
                            {h.badge && (
                                <motion.div
                                    variants={{
                                        hidden: { opacity: 0, y: 15 },
                                        visible: { opacity: 1, y: 0 }
                                    }}
                                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/85 border border-rose-200/80 shadow-sm mb-6"
                                >
                                    <IconoAnimadoRenderer
                                        icono={h.icono_badge || 'crown'}
                                        className="w-3.5 h-3.5 text-amber-600"
                                    />
                                    <span className="text-[11px] uppercase tracking-[0.25em] font-bold text-stone-700">
                                        {h.badge}
                                    </span>
                                </motion.div>
                            )}

                            {/* Titular Editorial de Alto Contraste */}
                            <motion.h1
                                variants={{
                                    hidden: { opacity: 0, y: 25 },
                                    visible: {
                                        opacity: 1,
                                        y: 0,
                                        transition: { duration: 0.7, ease: 'easeOut' }
                                    }
                                }}
                                className="font-editorial text-4xl sm:text-6xl lg:text-7xl xl:text-[5rem] font-semibold leading-[1.06] tracking-tight mb-6 text-[#231C19] break-words"
                            >
                                {h.titulo_parte1}{' '}
                                <span className="italic font-normal text-rose-gold-gradient block sm:inline">
                                    {h.titulo_resaltado}
                                </span>{' '}
                                {h.titulo_parte2}
                            </motion.h1>

                            {/* Cita de Autor con Resaltado */}
                            {(h.cita_texto || h.cita_destacado || h.cita_final) && (
                                <motion.p
                                    variants={{
                                        hidden: { opacity: 0, y: 15 },
                                        visible: {
                                            opacity: 1,
                                            y: 0,
                                            transition: { duration: 0.7 }
                                        }
                                    }}
                                    className="text-stone-600 text-sm sm:text-base md:text-lg font-normal leading-relaxed mb-8 max-w-xl"
                                >
                                    &ldquo;{h.cita_texto}{' '}
                                    {h.cita_destacado && (
                                        <strong className="font-semibold text-[#231C19] underline decoration-rose-300 decoration-2 underline-offset-4">
                                            {h.cita_destacado}
                                        </strong>
                                    )}{' '}
                                    {h.cita_final}&rdquo;
                                    <span className="font-editorial italic text-lg block mt-2.5 text-rose-700/90 font-semibold">
                                        — {firmaNegocio}
                                    </span>
                                </motion.p>
                            )}

                            {/* Botones de Acción Principal */}
                            <motion.div
                                variants={{
                                    hidden: { opacity: 0, y: 15 },
                                    visible: { opacity: 1, y: 0 }
                                }}
                                className="flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto mb-10"
                            >
                                {h.boton_primario && (
                                    <a
                                        href="#reserva"
                                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-xs sm:text-sm uppercase tracking-[0.18em] px-8 py-4 rounded-full shadow-xl shadow-rose-500/25 transition-all duration-300 transform hover:-translate-y-0.5"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        <span>{h.boton_primario}</span>
                                        <ArrowDownRight className="w-4 h-4" />
                                    </a>
                                )}
                                {h.boton_secundario && (
                                    <a
                                        href="#servicios"
                                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/85 hover:bg-white text-[#231C19] border border-rose-200/80 font-semibold text-xs sm:text-sm uppercase tracking-[0.16em] px-7 py-4 rounded-full shadow-sm hover:shadow-md transition-all duration-300"
                                    >
                                        <span>{h.boton_secundario}</span>
                                    </a>
                                )}
                            </motion.div>

                            {/* Pilares de Experiencia con Iconos Animados */}
                            {h.pilares && h.pilares.length > 0 && (
                                <motion.div
                                    variants={{
                                        hidden: { opacity: 0 },
                                        visible: { opacity: 1, transition: { delay: 0.3 } }
                                    }}
                                    className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl"
                                >
                                    {h.pilares.map(p => (
                                        <div
                                            key={p.id}
                                            className="glass-editorial rounded-2xl p-3.5 flex items-center gap-3 text-left"
                                        >
                                            <div className="w-9 h-9 rounded-xl bg-rose-100/80 text-rose-600 flex items-center justify-center shrink-0">
                                                <IconoAnimadoRenderer
                                                    icono={p.icono}
                                                    className="w-4 h-4"
                                                />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-stone-800">
                                                    {p.titulo}
                                                </p>
                                                <p className="text-[11px] text-stone-500">
                                                    {p.subtitulo}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </motion.div>
                    ) : (
                        <div className="opacity-0 h-[420px]" />
                    )}
                </div>

                {/* Columna Visual Derecha (5 cols) — Composición Editorial en Arco */}
                {mounted && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.94 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.25, duration: 0.9, ease: 'easeOut' }}
                        className="relative w-full lg:col-span-5 h-[360px] sm:h-[500px] lg:h-[580px] max-w-xs sm:max-w-md lg:max-w-none mx-auto"
                    >
                        {/* Marco Principal en Arco (Imagen o Video) */}
                        <motion.div
                            animate={{ y: [0, -8, 0] }}
                            transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut' }}
                            className="absolute inset-0 w-full h-full rounded-t-full rounded-b-[3rem] border-[8px] border-white overflow-hidden shadow-[0_25px_60px_rgba(130,60,75,0.18)] bg-stone-100"
                        >
                            {h.media_principal_tipo === 'video' && h.imagen_principal ? (
                                <video
                                    src={h.imagen_principal}
                                    autoPlay
                                    muted
                                    loop
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <img
                                    src={h.imagen_principal || '/img/nail-1.png'}
                                    alt="Arte en Uñas de Alta Gama"
                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                                    onError={e => {
                                        e.currentTarget.src =
                                            'https://images.unsplash.com/photo-1519014816548-bf5fe059c98b?auto=format&fit=crop&w=800&q=85'
                                    }}
                                />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#231C19]/35 via-transparent to-transparent" />
                        </motion.div>

                        {/* Retrato Secundario Superpuesto */}
                        {h.imagen_secundaria && (
                            <motion.div
                                animate={{ y: [0, 10, 0] }}
                                transition={{ repeat: Infinity, duration: 5.5, ease: 'easeInOut' }}
                                className="absolute -bottom-6 -right-3 sm:-left-8 sm:right-auto w-[48%] aspect-[3/4] rounded-[2rem] border-[6px] border-white overflow-hidden shadow-2xl z-20 bg-stone-100"
                            >
                                <img
                                    src={h.imagen_secundaria}
                                    alt="Detalle de manicuría premium"
                                    className="w-full h-full object-cover"
                                    onError={e => {
                                        e.currentTarget.src =
                                            'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=600&q=85'
                                    }}
                                />
                            </motion.div>
                        )}

                        {/* Tarjeta Flotante de Confianza */}
                        {h.badge_flotante_titulo && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.6, duration: 0.6 }}
                                className="glass-editorial absolute top-4 right-2 sm:top-8 sm:-right-4 z-30 rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-lg flex items-center gap-2"
                            >
                                <span className="text-xl">{h.badge_flotante_icono || '💅'}</span>
                                <div className="text-left">
                                    <p className="text-xs font-black text-[#231C19] leading-tight">
                                        {h.badge_flotante_titulo}
                                    </p>
                                    <p className="text-[10px] text-rose-600 font-semibold">
                                        {h.badge_flotante_subtitulo}
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </div>
        </header>
    )
}
