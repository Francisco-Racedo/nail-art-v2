'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ChevronDown, Gift, Crown, Gem } from 'lucide-react'
import { DEFAULT_CMS_CONTENIDO, mergeCMSContenido } from '@/lib/cms-types'

interface Servicio {
    id: number
    nombre: string
    precio: number
    categoria: string
    subtitulo?: string
    descripcion?: string
    icono?: string
    destacado?: number
}

async function fetchServicios(): Promise<Servicio[]> {
    const res = await fetch('/api/servicios', { cache: 'no-store' })
    if (!res.ok) throw new Error('No se pudieron cargar los servicios')
    return res.json()
}

function ServiceCard({ s, index }: { s: Servicio; index: number }) {
    const [open, setOpen] = useState(false)
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            whileHover={{ y: -3 }}
            className="glass-editorial rounded-2xl cursor-pointer flex overflow-hidden w-full transition-all duration-300 relative group hover:border-rose-300/80"
            onClick={() => setOpen(v => !v)}
        >
            <div className="w-1.5 bg-gradient-to-b from-rose-400 via-pink-400 to-amber-300 shrink-0" />

            <div className="p-5 sm:p-6 flex-1 w-full flex flex-col justify-center">
                <div className="flex justify-between items-start gap-4 w-full">
                    <div className="pr-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="font-editorial font-bold text-[#231C19] text-xl sm:text-2xl tracking-tight group-hover:text-rose-700 transition-colors">
                                {s.nombre}
                            </p>
                            {s.destacado === 1 && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 text-white text-[10px] font-bold uppercase tracking-widest shadow-sm">
                                    <Sparkles className="w-2.5 h-2.5" /> Favorito
                                </span>
                            )}
                        </div>
                        {s.subtitulo && (
                            <p className="text-stone-500 font-medium text-xs mt-1 tracking-wide">
                                {s.subtitulo}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                        <span className="font-editorial font-bold text-rose-700 text-2xl sm:text-3xl tracking-tight bg-rose-50/90 border border-rose-200/70 px-3.5 py-1 rounded-xl">
                            ${Number(s.precio).toLocaleString('es-AR')}
                        </span>
                        {s.descripcion && (
                            <ChevronDown
                                className={`w-4 h-4 text-stone-400 transition-transform duration-300 ${
                                    open ? 'rotate-180 text-rose-500' : ''
                                }`}
                            />
                        )}
                    </div>
                </div>

                <AnimatePresence initial={false}>
                    {s.descripcion && open && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                        >
                            <p className="mt-4 pt-3 border-t border-rose-200/50 text-xs sm:text-sm text-stone-600 leading-relaxed font-normal">
                                {s.descripcion}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    )
}

export default function ListaDePrecios() {
    const {
        data: servicios = [],
        isLoading,
        error
    } = useQuery({
        queryKey: ['servicios'],
        queryFn: fetchServicios,
        staleTime: 60_000
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
    const sv = cms.servicios

    const serviciosLisas = servicios.filter(
        s => s.categoria === 'Servicios Base (Lisas)' || s.categoria === 'Manos'
    )
    const serviciosConDeco = servicios.filter(s => s.categoria === 'Con 2 Decos Simples')
    const adicionales = servicios.filter(
        s => s.categoria === 'Adicionales & Nail Art' || s.categoria === 'Promos'
    )

    return (
        <>
            {sv.visible && (
                <section
                    id="servicios"
                    className="py-20 md:py-24 relative bg-gradient-to-b from-[#FAF6F2] via-[#FDF8F5] to-[#F7ECE6]"
                >
                    <div className="container mx-auto px-5 sm:px-6 max-w-6xl">
                        {/* Cabecera Editorial */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-center mb-14 md:mb-16"
                        >
                            {sv.badge && (
                                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-rose-100/80 border border-rose-200 text-rose-700 text-[10px] font-bold uppercase tracking-[0.25em] mb-3">
                                    <Gem className="w-3 h-3" /> {sv.badge}
                                </div>
                            )}
                            <h2 className="font-editorial text-4xl sm:text-5xl md:text-6xl font-semibold mb-4 text-[#231C19] tracking-tight">
                                {sv.titulo}{' '}
                                <span className="italic font-normal text-rose-gold-gradient">
                                    {sv.titulo_resaltado}
                                </span>
                            </h2>
                            {sv.subtitulo && (
                                <p className="text-stone-600 max-w-xl mx-auto font-normal text-sm sm:text-base leading-relaxed">
                                    {sv.subtitulo}
                                </p>
                            )}
                        </motion.div>

                        {isLoading && (
                            <div className="text-center text-stone-500 py-12 font-semibold tracking-widest uppercase text-xs animate-pulse">
                                Cargando menú de servicios...
                            </div>
                        )}
                        {error && (
                            <div className="text-center text-rose-600 py-8 text-sm font-medium">
                                No se pudo acceder al tarifario en este momento.
                            </div>
                        )}

                        {!isLoading && !error && (
                            <>
                                {/* Grilla de Servicios Base (Lisas) y Servicios con 2 Decos Simples */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 max-w-5xl mx-auto mb-16">
                                    {serviciosLisas.length > 0 && (
                                        <div>
                                            <div className="flex items-center justify-between mb-6 pb-3 border-b border-rose-200/70">
                                                <h3 className="font-editorial text-2xl sm:text-3xl font-bold text-[#231C19] flex items-center gap-2.5">
                                                    <span className="w-8 h-8 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center text-base">
                                                        {sv.icono_manos || '💅'}
                                                    </span>
                                                    {sv.titulo_manos || 'Servicios Base (Lisas)'}
                                                </h3>
                                                <span className="text-[11px] uppercase tracking-widest font-bold text-rose-600">
                                                    {serviciosLisas.length} opciones
                                                </span>
                                            </div>
                                            <div className="space-y-3.5">
                                                {serviciosLisas.map((s, i) => (
                                                    <ServiceCard key={s.id} s={s} index={i} />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {serviciosConDeco.length > 0 && (
                                        <div>
                                            <div className="flex items-center justify-between mb-6 pb-3 border-b border-rose-200/70">
                                                <h3 className="font-editorial text-2xl sm:text-3xl font-bold text-[#231C19] flex items-center gap-2.5">
                                                    <span className="w-8 h-8 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-base">
                                                        {sv.icono_pies || '✨'}
                                                    </span>
                                                    {sv.titulo_pies ||
                                                        'Servicios con 2 Decos Simples'}
                                                </h3>
                                                <span className="text-[11px] uppercase tracking-widest font-bold text-amber-700">
                                                    {serviciosConDeco.length} opciones
                                                </span>
                                            </div>
                                            <div className="space-y-3.5">
                                                {serviciosConDeco.map((s, i) => (
                                                    <ServiceCard key={s.id} s={s} index={i} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Sección Inferior: Adicionales, Nail Art & Arreglos + Tarjeta Día Especial */}
                                {(sv.mostrar_promos || sv.mostrar_cumple) && (
                                    <div
                                        id="promos"
                                        className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mt-16"
                                    >
                                        {sv.mostrar_promos && adicionales.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                whileInView={{ opacity: 1, y: 0 }}
                                                viewport={{ once: true }}
                                                whileHover={{ y: -4 }}
                                                className="bg-gradient-to-br from-[#231C19] via-[#332622] to-[#231C19] text-[#FDF8F5] p-7 sm:p-9 rounded-[2.5rem] shadow-2xl relative overflow-hidden border border-rose-300/20 flex flex-col justify-between"
                                            >
                                                <div className="absolute -top-16 -right-16 w-48 h-48 bg-rose-500/25 rounded-full blur-[60px] pointer-events-none" />

                                                <div className="relative z-10">
                                                    {sv.badge_promos && (
                                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-rose-200 text-[10px] font-bold uppercase tracking-[0.2em] mb-3">
                                                            <Crown className="w-3 h-3 text-amber-300" />{' '}
                                                            {sv.badge_promos}
                                                        </div>
                                                    )}
                                                    <h3 className="font-editorial text-3xl sm:text-4xl font-semibold tracking-wide mb-2 text-white">
                                                        {sv.titulo_promos}{' '}
                                                        <span className="italic text-rose-300">
                                                            {sv.titulo_promos_resaltado}
                                                        </span>
                                                    </h3>
                                                    <p className="text-xs text-stone-300/90 mb-5 leading-relaxed">
                                                        Opciones de deco en 10 dedos, pigmentos, cat
                                                        eye, francesas, diseños complejos y piedrería:
                                                    </p>

                                                    <div className="space-y-2">
                                                        {adicionales.map(s => {
                                                            const esRangoDibujo =
                                                                s.nombre
                                                                    .toLowerCase()
                                                                    .includes('dibujo') ||
                                                                (s.subtitulo || '').includes('3.000')
                                                            return (
                                                                <div
                                                                    key={s.id}
                                                                    className="flex justify-between items-center py-3 px-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                                                                >
                                                                    <div className="flex items-center gap-3 min-w-0 pr-2">
                                                                        <span className="text-lg bg-white/10 rounded-full w-9 h-9 flex items-center justify-center shrink-0">
                                                                            {s.icono || '✨'}
                                                                        </span>
                                                                        <div className="min-w-0">
                                                                            <span className="font-semibold text-white text-sm sm:text-base block truncate">
                                                                                {s.nombre}
                                                                            </span>
                                                                            {(s.subtitulo ||
                                                                                s.descripcion) && (
                                                                                <span className="text-[11px] text-stone-300 line-clamp-1">
                                                                                    {s.subtitulo ||
                                                                                        s.descripcion}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <span className="font-editorial font-bold text-amber-300 text-xl sm:text-2xl shrink-0 ml-2">
                                                                        {esRangoDibujo
                                                                            ? '$2.000 - $3.000'
                                                                            : `$${Number(
                                                                                  s.precio
                                                                              ).toLocaleString(
                                                                                  'es-AR'
                                                                              )}`}
                                                                    </span>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>

                                                    <div className="mt-5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-400/25 text-xs text-amber-100 leading-relaxed">
                                                        ⚠️ <strong>Importante:</strong> Si asistís al
                                                        turno con un trabajo realizado por otra
                                                        profesional y debemos retirarlo,{' '}
                                                        <strong className="text-amber-300 underline">
                                                            el retiro se cobra aparte
                                                        </strong>
                                                        .
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* Tarjeta Beneficio Día Especial */}
                                        {sv.mostrar_cumple && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                whileInView={{ opacity: 1, y: 0 }}
                                                viewport={{ once: true }}
                                                whileHover={{ y: -4 }}
                                                className="glass-editorial p-7 sm:p-9 rounded-[2.5rem] shadow-xl relative overflow-hidden flex flex-col justify-center text-center items-center"
                                            >
                                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-400 to-amber-300 text-white flex items-center justify-center shadow-lg shadow-rose-300/40 mb-5">
                                                    <Gift className="w-7 h-7" />
                                                </div>

                                                {sv.badge_cumple && (
                                                    <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-rose-600 mb-2">
                                                        {sv.badge_cumple}
                                                    </span>
                                                )}

                                                <h3 className="font-editorial text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-[#231C19]">
                                                    {sv.titulo_cumple}{' '}
                                                    <span className="italic font-normal text-rose-gold-gradient">
                                                        {sv.titulo_cumple_resaltado}
                                                    </span>
                                                </h3>
                                                <p className="text-stone-600 font-normal leading-relaxed text-sm sm:text-base max-w-sm mb-6">
                                                    {sv.texto_cumple}
                                                </p>
                                                {sv.boton_cumple && (
                                                    <a
                                                        href="#reserva"
                                                        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-rose-700 hover:text-rose-800 bg-rose-100/80 hover:bg-rose-200/80 border border-rose-200 px-6 py-3 rounded-full transition"
                                                    >
                                                        <Sparkles className="w-3.5 h-3.5" />{' '}
                                                        {sv.boton_cumple}
                                                    </a>
                                                )}
                                            </motion.div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </section>
            )}
        </>
    )
}
