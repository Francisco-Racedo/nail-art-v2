'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

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
    const res = await fetch('/api/servicios')
    if (!res.ok) throw new Error('No se pudieron cargar los servicios')
    return res.json()
}

function ServiceCard({ s }: { s: Servicio }) {
    const [open, setOpen] = useState(false)
    return (
        <div
            className="p-5 rounded-xl transition-all duration-300 cursor-pointer hover:shadow-lg border-l-4 border-rose-400 bg-white/60 border border-amber-100 backdrop-blur-sm"
            onClick={() => setOpen(v => !v)}
        >
            <div className="flex justify-between items-center">
                <div>
                    <p className="font-semibold text-zinc-800 text-base md:text-lg">{s.nombre}</p>
                    {s.subtitulo && <p className="text-rose-600 font-semibold text-xs mt-1">{s.subtitulo}</p>}
                </div>
                <span className="font-bold text-amber-700 text-lg">${s.precio.toLocaleString('es-AR')}</span>
            </div>
            {s.descripcion && open && (
                <div className="mt-3 pt-3 border-t border-amber-200/50 text-sm text-zinc-700 leading-relaxed">
                    {s.descripcion}
                </div>
            )}
        </div>
    )
}

export default function ListaDePrecios() {
    const { data: servicios = [], isLoading, error } = useQuery({
        queryKey: ['servicios'],
        queryFn: fetchServicios,
        staleTime: 5 * 60 * 1000,
    })

    const manos = servicios.filter(s => s.categoria === 'Manos')
    const pies = servicios.filter(s => s.categoria === 'Pies & Extras')
    const promos = servicios.filter(s => s.categoria === 'Promos')

    return (
        <section id="servicios" className="py-20 relative bg-white">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 text-zinc-900" style={{ fontFamily: 'serif' }}>
                        Lista de{' '}
                        <span style={{ background: 'linear-gradient(to right, #C59B27, #E5C158, #C59B27)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                            Tarifas
                        </span>
                    </h2>
                    <p className="text-zinc-500 max-w-2xl mx-auto">Precios sugeridos Agosto 2026. Servicio de alta calidad.</p>
                </div>

                {isLoading && (
                    <div className="text-center text-zinc-400 py-12">Cargando servicios...</div>
                )}
                {error && (
                    <div className="text-center text-red-400 py-8 text-sm">No se pudo cargar el listado de precios.</div>
                )}

                {!isLoading && !error && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto mb-12">
                            {manos.length > 0 && (
                                <div>
                                    <h3 className="text-2xl font-bold mb-6 text-rose-800 flex items-center gap-2">💅 Manos</h3>
                                    <div className="space-y-4">{manos.map(s => <ServiceCard key={s.id} s={s} />)}</div>
                                </div>
                            )}
                            {pies.length > 0 && (
                                <div>
                                    <h3 className="text-2xl font-bold mb-6 text-rose-800 flex items-center gap-2">🦶 Pies &amp; Extras</h3>
                                    <div className="space-y-4">{pies.map(s => <ServiceCard key={s.id} s={s} />)}</div>
                                </div>
                            )}
                        </div>

                        {promos.length > 0 && (
                            <div id="promos" className="max-w-5xl mx-auto mt-8 bg-gradient-to-br from-rose-100 to-amber-50 p-6 rounded-2xl border border-rose-200 shadow-sm relative overflow-hidden">
                                <div className="absolute -right-4 -top-4 text-6xl opacity-10">🔥</div>
                                <h3 className="text-xl font-bold mb-4 text-rose-800">Promos del Mes</h3>
                                <div className="space-y-3">
                                    {promos.map(s => (
                                        <div key={s.id} className="p-4 rounded-xl bg-white/60 border border-amber-100">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <span className="bg-white p-2 text-center rounded-full shadow-sm text-lg w-10">{s.icono || '🔥'}</span>
                                                    <span className="font-bold text-zinc-900 text-sm md:text-base">{s.nombre}</span>
                                                </div>
                                                <span className="font-bold text-amber-700 text-base md:text-lg">${s.precio.toLocaleString('es-AR')}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    )
}
