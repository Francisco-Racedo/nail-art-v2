'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ChevronDown, Gift, Crown, Gem, Heart, Star, Award, Send } from 'lucide-react'
import { DEFAULT_CMS_CONTENIDO, mergeCMSContenido } from '@/lib/cms-types'
import GiftCardModal from './GiftCardModal'

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
    const [giftCardOpen, setGiftCardOpen] = useState(false)
    const {
        data: servicios = [],
        isLoading,
        error
    } = useQuery<Servicio[]>({
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
        (s: Servicio) => s.categoria === 'Servicios Base (Lisas)' || s.categoria === 'Manos'
    )
    const serviciosConDeco = servicios.filter((s: Servicio) => s.categoria === 'Con 2 Decos Simples')
    const adicionales = servicios.filter(
        (s: Servicio) => s.categoria === 'Adicionales & Nail Art' || s.categoria === 'Promos'
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
                                                {serviciosLisas.map((s: Servicio, i: number) => (
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
                                                {serviciosConDeco.map((s: Servicio, i: number) => (
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

                                                    <div className="space-y-2.5">
                                                        {adicionales.map((s: Servicio) => {
                                                            const esRangoDibujo =
                                                                s.nombre
                                                                    .toLowerCase()
                                                                    .includes('dibujo') ||
                                                                (s.subtitulo || '').includes('3.000')
                                                            return (
                                                                <div
                                                                    key={s.id}
                                                                    className="flex justify-between items-start sm:items-center gap-3 py-3.5 px-3.5 sm:px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                                                                >
                                                                    <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                                                                        <span className="text-lg bg-white/10 rounded-full w-9 h-9 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                                                                            {s.icono || '✨'}
                                                                        </span>
                                                                        <div className="min-w-0 flex-1">
                                                                            <span className="font-semibold text-white text-sm sm:text-base block leading-snug break-words">
                                                                                {s.nombre}
                                                                            </span>
                                                                            {s.subtitulo && (
                                                                                <span className="text-xs text-stone-200/95 block leading-relaxed mt-0.5 break-words">
                                                                                    {s.subtitulo}
                                                                                </span>
                                                                            )}
                                                                            {s.descripcion &&
                                                                                s.descripcion !==
                                                                                    s.subtitulo && (
                                                                                    <span className="text-[11px] text-stone-300/85 block leading-relaxed mt-0.5 break-words">
                                                                                        {
                                                                                            s.descripcion
                                                                                        }
                                                                                    </span>
                                                                                )}
                                                                        </div>
                                                                    </div>
                                                                    <span className="font-editorial font-bold text-amber-300 text-lg sm:text-2xl shrink-0 whitespace-nowrap bg-white/5 border border-amber-300/20 px-2.5 py-0.5 rounded-xl self-center">
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

                                                    {/* Desglose oficial de Retirado de otro profesional */}
                                                    <div className="mt-5 p-4 rounded-2xl bg-white/10 border border-white/15 text-xs text-stone-100">
                                                        <div className="flex items-center gap-2 mb-2.5 text-amber-300 font-bold uppercase tracking-wider text-[11px]">
                                                            <span>✨</span> Retiro de Trabajo de Otro Profesional
                                                        </div>
                                                        <div className="space-y-2 text-stone-200 text-xs">
                                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5 py-1.5 border-b border-white/10">
                                                                <span className="font-medium text-stone-100">• Retiro Semipermanente:</span>
                                                                <span className="font-bold text-amber-300 sm:text-white pl-3 sm:pl-0">
                                                                    $4.000{' '}
                                                                    <span className="text-stone-300 font-normal">
                                                                        ($3.000 con nuevo esmaltado)
                                                                    </span>
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5 py-1.5 border-b border-white/10">
                                                                <span className="font-medium text-stone-100">• Retiro Capping Gel:</span>
                                                                <span className="font-bold text-amber-300 sm:text-white pl-3 sm:pl-0">
                                                                    $5.000{' '}
                                                                    <span className="text-stone-300 font-normal">
                                                                        ($4.000 con nuevo esmaltado)
                                                                    </span>
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5 py-1">
                                                                <span className="font-medium text-stone-100">• Retiro Soft Gel:</span>
                                                                <span className="font-bold text-amber-300 sm:text-white pl-3 sm:pl-0">
                                                                    $6.000{' '}
                                                                    <span className="text-stone-300 font-normal">
                                                                        ($4.500 con nuevo servicio)
                                                                    </span>
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <p className="mt-2.5 pt-2 border-t border-white/10 text-[11px] text-stone-300 font-light">
                                                            💵 Medios de pago en el salón: Efectivo y Transferencia bancaria.
                                                        </p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* Columna Derecha: Tarjeta Gift Card Oficial + Beneficios & Fidelidad */}
                                        <div className="flex flex-col gap-6">
                                            {/* Tarjeta 1: GIFT CARD OFICIAL */}
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                whileInView={{ opacity: 1, y: 0 }}
                                                viewport={{ once: true }}
                                                whileHover={{ y: -4 }}
                                                className="bg-gradient-to-br from-[#FFF5F8] via-[#FFEBF1] to-[#FCE6EE] p-7 sm:p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden border-2 border-rose-200/80 flex flex-col justify-between text-center"
                                            >
                                                <div className="absolute -top-12 -right-12 w-40 h-40 bg-pink-300/30 rounded-full blur-2xl pointer-events-none" />

                                                <div className="relative z-10">
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-300 text-rose-700 text-[10px] font-bold uppercase tracking-[0.25em] mb-3">
                                                        <Gift className="w-3 h-3 text-rose-600" /> Vales de Regalo
                                                    </div>

                                                    <h3 className="font-editorial text-3xl sm:text-4xl font-extrabold tracking-wide text-stone-900 mb-1">
                                                        GIFT CARD
                                                    </h3>
                                                    <p className="font-editorial italic text-stone-700 text-sm sm:text-base font-medium mb-4">
                                                        ¡Nada mejora tu actitud, cómo unas uñas preciosas!
                                                    </p>

                                                    <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-rose-200/80 text-left text-xs space-y-2 mb-5 shadow-sm">
                                                        <div>
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block">
                                                                Vale por:
                                                            </span>
                                                            <p className="font-bold text-stone-900 text-sm">
                                                                Cualquier servicio a elección (o monto libre)
                                                            </p>
                                                        </div>
                                                        <div className="pt-2 border-t border-rose-100 flex items-center justify-between text-[11px] text-stone-600">
                                                            <span>PintaditasNails by Mili Tripolone</span>
                                                            <span className="font-semibold text-rose-600">Cel: 3816988692</span>
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => setGiftCardOpen(true)}
                                                        className="w-full inline-flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-white bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 px-6 py-3.5 rounded-full shadow-md shadow-rose-200 transition cursor-pointer"
                                                    >
                                                        <Sparkles className="w-4 h-4" /> Solicitar Gift Card de Regalo
                                                    </button>
                                                </div>
                                            </motion.div>

                                            {/* Tarjeta 2: Beneficios de Cumpleaños & Fidelidad (10% en servicio #12) */}
                                            {sv.mostrar_cumple && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 20 }}
                                                    whileInView={{ opacity: 1, y: 0 }}
                                                    viewport={{ once: true }}
                                                    whileHover={{ y: -4 }}
                                                    className="glass-editorial p-7 sm:p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden flex flex-col justify-between"
                                                >
                                                    <div className="text-center">
                                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-300 text-amber-800 text-[10px] font-bold uppercase tracking-[0.2em] mb-3">
                                                            <Star className="w-3 h-3 text-amber-600" /> Beneficios Exclusivos
                                                        </div>

                                                        <h3 className="font-editorial text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-[#231C19]">
                                                            {sv.titulo_cumple}{' '}
                                                            <span className="italic font-normal text-rose-gold-gradient">
                                                                {sv.titulo_cumple_resaltado}
                                                            </span>
                                                        </h3>
                                                        <p className="text-stone-600 font-normal leading-relaxed text-xs sm:text-sm max-w-sm mx-auto mb-4">
                                                            {sv.texto_cumple}
                                                        </p>

                                                        {/* Alerta del 10% OFF en el Servicio #12 */}
                                                        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-pink-50 border border-amber-200/80 text-left mb-4 shadow-sm">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-base">🏆</span>
                                                                <p className="text-xs font-black text-amber-900 tracking-wide uppercase">
                                                                    10% OFF en tu 12° Servicio
                                                                </p>
                                                            </div>
                                                            <p className="text-[11px] text-stone-600 leading-snug">
                                                                ¡Premiamos tu constancia! En tu servicio número 12 disfrutás de un <strong>10% de descuento de fidelidad</strong> en el salón.
                                                            </p>
                                                        </div>

                                                        {sv.boton_cumple && (
                                                            <a
                                                                href="#reserva"
                                                                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-rose-700 hover:text-rose-800 bg-rose-100/80 hover:bg-rose-200/80 border border-rose-200 px-6 py-2.5 rounded-full transition"
                                                            >
                                                                <Sparkles className="w-3.5 h-3.5" /> {sv.boton_cumple}
                                                            </a>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </section>
            )}

            {/* Modal interactivo de Gift Card */}
            <GiftCardModal
                isOpen={giftCardOpen}
                onClose={() => setGiftCardOpen(false)}
            />
        </>
    )
}
