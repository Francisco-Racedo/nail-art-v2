'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { motion } from 'framer-motion'

interface Servicio {
    id: number
    nombre: string
    precio: number
    categoria: string
    subtitulo?: string
    descripcion?: string
    icono?: string
}

async function fetchServicios(): Promise<Servicio[]> {
    const res = await fetch('/api/servicios', { cache: 'no-store' })
    if (!res.ok) throw new Error('No se pudieron cargar los servicios')
    return res.json()
}

function ServiceCard({ s }: { s: Servicio }) {
    const [open, setOpen] = useState(false)
    return (
        <motion.div
            whileHover={{ y: -5, scale: 1.01, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)" }}
            className="rounded-2xl cursor-pointer shadow-sm bg-rose-100 flex overflow-hidden w-full transition-shadow duration-300 relative group"
            onClick={() => setOpen(v => !v)}
        >
            {/* Borde Izquierdo Vibrante Fucsia -> Rosa */}
            <div className="w-1.5 sm:w-2 bg-gradient-to-b from-fuchsia-500 to-pink-400 flex-shrink-0"></div>

            <div className="p-5 sm:p-6 flex-1 w-full flex flex-col justify-center bg-transparent">
                <div className="flex justify-between items-center w-full">
                    <div className="pr-4">
                        <p className="font-semibold text-stone-800 text-base md:text-lg tracking-wide">{s.nombre}</p>
                        {s.subtitulo && <p className="text-stone-700 font-medium text-xs mt-1 tracking-wide">{s.subtitulo}</p>}
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0">
                        <span className="font-bold text-fuchsia-600 text-lg sm:text-xl tracking-wider">${s.precio.toLocaleString('es-AR')}</span>
                    </div>
                </div>

                {s.descripcion && open && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-4 pt-3 border-t border-stone-800/10 text-sm text-stone-800/80 leading-relaxed font-light w-full"
                    >
                        {s.descripcion}
                    </motion.div>
                )}
            </div>
        </motion.div>
    )
}

export default function ListaDePrecios() {
    const { data: servicios = [], isLoading, error } = useQuery({
        queryKey: ['servicios'],
        queryFn: fetchServicios,
        refetchInterval: 5000,
        staleTime: 5000,
    })

    const manos = servicios.filter(s => s.categoria === 'Manos')
    const pies = servicios.filter(s => s.categoria === 'Pies & Extras')
    const promos = servicios.filter(s => s.categoria === 'Promos')

    return (
        <section id="servicios" className="py-24 relative bg-gradient-to-br from-[#FDF8F5] via-[#FDF8F5] md:via-[#E8B4B8]/40 to-[#D4A373]/30">
            <div className="container mx-auto px-6 max-w-7xl">

                {/* Cabecera Principal */}
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold mb-4 text-stone-800 tracking-tight" style={{ fontFamily: 'serif' }}>
                        Lista de Tarifas
                    </h2>
                    <p className="text-stone-700 max-w-2xl mx-auto font-light tracking-wide text-base">
                        Precios sugeridos. Experiencia y dedicación en cada servicio de alta gama.
                    </p>
                </div>



                {isLoading && (
                    <div className="text-center text-stone-600/40 py-12 font-light tracking-widest uppercase text-xs">Cargando la experiencia...</div>
                )}
                {error && (
                    <div className="text-center text-red-500/80 py-8 text-sm font-light">No se pudo acceder a nuestro tarifario en este momento.</div>
                )}

                {!isLoading && !error && (
                    <>
                        {/* Listado Primario: Manos y Pies */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto mb-16">
                            {manos.length > 0 && (
                                <div>
                                    <h3 className="text-2xl font-semibold tracking-wide mb-8 text-stone-800 flex items-center gap-3 border-b border-stone-800/10 pb-4" style={{ fontFamily: 'serif' }}>
                                        <span className="text-xl drop-shadow-sm">💅</span> Manos
                                    </h3>
                                    <div className="space-y-4">{manos.map(s => <ServiceCard key={s.id} s={s} />)}</div>
                                </div>
                            )}
                            {pies.length > 0 && (
                                <div>
                                    <h3 className="text-2xl font-semibold tracking-wide mb-8 text-stone-800 flex items-center gap-3 border-b border-stone-800/10 pb-4" style={{ fontFamily: 'serif' }}>
                                        <span className="text-xl drop-shadow-sm">🦶</span> Pies &amp; Extras
                                    </h3>
                                    <div className="space-y-4">{pies.map(s => <ServiceCard key={s.id} s={s} />)}</div>
                                </div>
                            )}
                        </div>

                        {/* Layout Side-by-Side (Grid Inferior) - Fucsia Difuminado Glow/Blur Inmersivo */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mt-20">

                            {/* Tarjeta 1: Promos del Mes */}
                            {promos.length > 0 && (
                                <motion.div
                                    whileHover={{ scale: 1.02, y: -5 }}
                                    animate={{ boxShadow: ["0px 0px 0px rgba(217,70,239,0)", "0px 0px 25px rgba(217,70,239,0.3)", "0px 0px 0px rgba(217,70,239,0)"] }}
                                    transition={{ boxShadow: { repeat: Infinity, duration: 4, ease: "easeInOut" }, scale: { duration: 0.3 }, y: { duration: 0.3 } }}
                                    className="bg-[#FCFAF8] p-8 md:p-10 rounded-[2.5rem] shadow-sm relative overflow-hidden border border-fuchsia-400/20 flex flex-col justify-center"
                                >
                                    {/* Efectos Aurora Inmersiva */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180%] h-[180%] bg-fuchsia-300 rounded-full blur-[100px] opacity-70 pointer-events-none z-0" />
                                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-fuchsia-500 rounded-full blur-[60px] opacity-80 pointer-events-none z-0" />

                                    <div className="absolute -right-4 -top-8 text-[8rem] opacity-[0.03] mix-blend-overlay z-0">🔥</div>
                                    <h3 className="text-2xl md:text-3xl font-bold tracking-wide mb-6 text-[#2C2421] relative z-10 flex items-center justify-between" style={{ fontFamily: 'serif' }}>
                                        <span>Promos del <span className="text-fuchsia-600">Mes</span></span>
                                        <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }} className="text-2xl drop-shadow-sm">✨</motion.span>
                                    </h3>

                                    <div className="space-y-1 relative z-10">
                                        {promos.map(s => (
                                            <div key={s.id} className="flex justify-between items-center py-4 border-b border-[#2C2421]/10 last:border-0 hover:bg-white/30 transition-colors rounded-xl px-2">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xl bg-white/50 shadow-sm rounded-full w-8 h-8 flex items-center justify-center text-stone-800">{s.icono || '💎'}</span>
                                                    <span className="font-semibold tracking-wide text-[#2C2421] text-sm md:text-base">{s.nombre}</span>
                                                </div>
                                                <span className="font-bold text-fuchsia-600 tracking-wider text-base">${s.precio.toLocaleString('es-AR')}</span>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* Tarjeta 2: Beneficio de Cumpleaños */}
                            <motion.div
                                whileHover={{ scale: 1.02, y: -5 }}
                                animate={{ boxShadow: ["0px 0px 0px rgba(217,70,239,0)", "0px 0px 30px rgba(217,70,239,0.2)", "0px 0px 0px rgba(217,70,239,0)"] }}
                                transition={{ boxShadow: { repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 0.5 }, scale: { duration: 0.3 }, y: { duration: 0.3 } }}
                                className="bg-[#FCFAF8] p-8 md:p-10 rounded-[2.5rem] shadow-sm relative overflow-hidden border border-fuchsia-400/20 flex flex-col justify-center text-center items-center"
                            >
                                {/* Efectos Aurora Inmersiva */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180%] h-[180%] bg-pink-300 rounded-full blur-[100px] opacity-70 pointer-events-none z-0" />
                                <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-pink-500 rounded-full blur-[60px] opacity-80 pointer-events-none z-0" />

                                <motion.span
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                                    className="absolute top-6 left-8 text-3xl opacity-80 z-10"
                                >✨</motion.span>
                                <motion.span
                                    animate={{ y: [0, -15, 0] }}
                                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 1 }}
                                    className="absolute top-12 right-12 text-2xl opacity-70 z-10"
                                >✨</motion.span>
                                <motion.span
                                    animate={{ y: [0, -8, 0] }}
                                    transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut", delay: 1.5 }}
                                    className="absolute bottom-10 left-10 text-xl opacity-60 z-10"
                                >✨</motion.span>

                                <h3 className="text-3xl font-bold tracking-wide mb-6 text-[#2C2421] relative z-10" style={{ fontFamily: 'serif' }}>
                                    ¡Celebramos tu Día Especial!
                                </h3>
                                <p className="text-[#2C2421]/90 font-medium leading-relaxed tracking-wide text-sm md:text-base relative z-10 max-w-sm">
                                    Sabemos cuándo es tu cumpleaños. Al reservar tu cita en tu día, aplicamos automáticamente un descuento exclusivo en tu servicio en el salón. ¡Déjate mimar, te lo mereces! 🥂
                                </p>
                            </motion.div>

                        </div>
                    </>
                )}
            </div>
        </section>
    )
}
