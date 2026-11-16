'use client'

import React, { useState, useMemo } from 'react'
import { Cake, Search, Send, Star, AlertTriangle } from 'lucide-react'
import { celularParaWhatsapp } from '@/lib/utils'
import type { ResumenCliente } from '@/lib/reservas-server'

export default function ClientesPanel({
    clientes,
    nombreNegocio
}: {
    clientes: ResumenCliente[]
    nombreNegocio: string
}) {
    const [busqueda, setBusqueda] = useState('')
    const [soloCumple, setSoloCumple] = useState(false)

    const filtrados = useMemo(() => {
        const q = busqueda.toLowerCase().trim()
        return clientes.filter(c => {
            if (soloCumple && !c.esCumpleSemana) return false
            if (!q) return true
            return (
                c.nombre.toLowerCase().includes(q) ||
                c.celularDisplay.includes(q) ||
                (c.email && c.email.toLowerCase().includes(q))
            )
        })
    }, [clientes, busqueda, soloCumple])

    const cumpleanierosCount = useMemo(
        () => clientes.filter(c => c.esCumpleSemana).length,
        [clientes]
    )

    const linkSaludoCumple = (c: ResumenCliente) => {
        const num = celularParaWhatsapp(c.celularDisplay)
        const msg = `¡Hola *${c.nombre}*! 🎂✨\nDesde *${nombreNegocio}* queremos desearte un muy feliz cumpleaños y regalarte un beneficio especial para tu próximo turno con nosotras. ¡Escribinos cuando quieras coordinar! 💅🎉`
        return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
    }

    return (
        <div className="w-full space-y-6">
            {/* Filtros y buscador */}
            <div className="bg-white/90 rounded-2xl p-4 sm:p-5 border border-orange-200/60 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                        placeholder="Buscar por nombre o WhatsApp..."
                        className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-800 focus:outline-none focus:border-pink-400"
                    />
                </div>
                <button
                    type="button"
                    onClick={() => setSoloCumple(!soloCumple)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition ${
                        soloCumple
                            ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    }`}
                >
                    <Cake className="w-4 h-4" />
                    Cumpleaños de la semana ({cumpleanierosCount})
                </button>
            </div>

            {/* Listado de fichas de clientes */}
            {filtrados.length === 0 ? (
                <div className="bg-white/80 rounded-2xl p-10 text-center border border-stone-200">
                    <p className="text-stone-500 text-sm">
                        No se encontraron clientes con ese criterio.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtrados.map((c, idx) => (
                        <div
                            key={`${c.celularNorm || c.nombre}-${idx}`}
                            className="bg-white/95 rounded-2xl p-5 border border-orange-200/60 shadow-sm flex flex-col justify-between gap-4"
                        >
                            <div>
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <h3 className="font-bold text-lg text-stone-900">
                                        {c.nombre}
                                    </h3>
                                    {c.esCumpleSemana && (
                                        <span className="bg-rose-100 text-rose-700 border border-rose-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                                            🎂 Cumple esta semana
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-stone-500 font-medium mb-3">
                                    📱 {c.celularDisplay || 'Sin celular'}
                                    {c.fecha_nacimiento &&
                                        ` • 🎂 Nac.: ${c.fecha_nacimiento.split('-').reverse().join('/')}`}
                                </p>

                                <div className="flex flex-wrap gap-2 text-xs">
                                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1">
                                        <Star className="w-3.5 h-3.5" /> {c.completados} servicios
                                    </span>
                                    <span className="bg-stone-100 text-stone-700 px-2.5 py-1 rounded-lg font-medium">
                                        Total reservas: {c.totalTurnos}
                                    </span>
                                    {c.ausencias > 0 && (
                                        <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1">
                                            <AlertTriangle className="w-3.5 h-3.5" /> {c.ausencias}{' '}
                                            ausencias
                                        </span>
                                    )}
                                </div>
                            </div>

                            {c.celularDisplay && (
                                <div className="flex items-center gap-2 pt-3 border-t border-stone-100">
                                    <a
                                        href={linkSaludoCumple(c)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 bg-gradient-to-r from-pink-500 to-orange-400 hover:from-pink-600 hover:to-orange-500 text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
                                    >
                                        <Cake className="w-3.5 h-3.5" /> Saludar / Enviar Promo
                                    </a>
                                    <a
                                        href={`https://wa.me/${celularParaWhatsapp(c.celularDisplay)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-[#25D366] hover:bg-[#20b857] text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1"
                                    >
                                        <Send className="w-3.5 h-3.5" /> WhatsApp
                                    </a>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
