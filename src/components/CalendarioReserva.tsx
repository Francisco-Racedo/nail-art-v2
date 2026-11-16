'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { DisponibilidadDia } from '@/lib/reservas-server'

interface CalendarioReservaProps {
    fechaSeleccionada: string
    onSelectFecha: (fecha: string) => void
    disponibilidadPorDia: Record<string, DisponibilidadDia>
    hoy: string
    maxFecha: string
    mesesVisibles?: number
    loading?: boolean
}

const NOMBRES_MESES = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre'
]

const DIAS_SEMANA = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']

function construirGrillaMes(anio: number, mes0: number) {
    const primerDia = new Date(anio, mes0, 1)
    const ultimoDia = new Date(anio, mes0 + 1, 0)
    const diasEnMes = ultimoDia.getDate()

    // Lunes = 0 ... Domingo = 6
    const offsetLunes = (primerDia.getDay() + 6) % 7
    const celdas: (string | null)[] = []

    for (let i = 0; i < offsetLunes; i++) {
        celdas.push(null)
    }

    for (let d = 1; d <= diasEnMes; d++) {
        const fStr = `${anio}-${String(mes0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        celdas.push(fStr)
    }

    return {
        anio,
        mes0,
        titulo: `${NOMBRES_MESES[mes0]} ${anio}`,
        celdas
    }
}

export default function CalendarioReserva({
    fechaSeleccionada,
    onSelectFecha,
    disponibilidadPorDia,
    hoy,
    maxFecha,
    mesesVisibles = 3,
    loading = false
}: CalendarioReservaProps) {
    const cantidadMeses = Math.max(1, Math.min(12, Number(mesesVisibles) || 3))
    const [mesIdx, setMesIdx] = useState(0)

    const meses = useMemo(() => {
        const base = hoy
            ? new Date(Number(hoy.slice(0, 4)), Number(hoy.slice(5, 7)) - 1, 1)
            : new Date()
        const lista = []
        for (let i = 0; i < cantidadMeses; i++) {
            const d = new Date(base.getFullYear(), base.getMonth() + i, 1)
            lista.push(construirGrillaMes(d.getFullYear(), d.getMonth()))
        }
        return lista
    }, [hoy, cantidadMeses])

    useEffect(() => {
        if (mesIdx >= meses.length) {
            setMesIdx(0)
        }
    }, [mesIdx, meses.length])

    const mesActual = meses[mesIdx] || meses[0]
    const puedeAnterior = mesIdx > 0
    const puedeSiguiente = mesIdx < meses.length - 1

    return (
        <div className="w-full select-none" data-testid="calendario-reserva">
            {/* UN SOLO recuadro de calendario con navegación entre los meses habilitados */}
            <div className="bg-white/95 rounded-2xl p-3.5 sm:p-4 border border-pink-200/80 shadow-sm">
                {/* Cabecera del mes con flechas Anterior / Siguiente y selector directo */}
                <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-stone-100">
                    <button
                        type="button"
                        disabled={!puedeAnterior}
                        onClick={() => puedeAnterior && setMesIdx(mesIdx - 1)}
                        aria-label="Mes anterior"
                        className={`p-2 rounded-xl border transition min-h-[40px] min-w-[40px] flex items-center justify-center ${
                            puedeAnterior
                                ? 'bg-pink-50 hover:bg-pink-100 text-pink-700 border-pink-200 cursor-pointer'
                                : 'bg-stone-50 text-stone-300 border-stone-100 cursor-not-allowed'
                        }`}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="flex flex-col items-center">
                        {meses.length > 1 ? (
                            <select
                                id="selector_mes_calendario"
                                name="selector_mes_calendario"
                                aria-label="Seleccionar mes"
                                value={mesIdx}
                                onChange={e => setMesIdx(Number(e.target.value))}
                                className="bg-transparent text-stone-900 font-black text-sm sm:text-base text-center cursor-pointer focus:outline-none"
                            >
                                {meses.map((m, idx) => (
                                    <option key={m.titulo} value={idx}>
                                        {m.titulo}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <span className="text-stone-900 font-black text-sm sm:text-base">
                                {mesActual.titulo}
                            </span>
                        )}
                        <span className="text-[10px] text-stone-400 font-medium">
                            Mes {mesIdx + 1} de {meses.length}{' '}
                            {meses.length === 1 ? 'habilitado' : 'habilitados'}
                        </span>
                    </div>

                    <button
                        type="button"
                        disabled={!puedeSiguiente}
                        onClick={() => puedeSiguiente && setMesIdx(mesIdx + 1)}
                        aria-label="Mes siguiente"
                        className={`p-2 rounded-xl border transition min-h-[40px] min-w-[40px] flex items-center justify-center ${
                            puedeSiguiente
                                ? 'bg-pink-50 hover:bg-pink-100 text-pink-700 border-pink-200 cursor-pointer'
                                : 'bg-stone-50 text-stone-300 border-stone-100 cursor-not-allowed'
                        }`}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Encabezado de días de la semana */}
                <div className="grid grid-cols-7 gap-1 mb-1.5 text-center">
                    {DIAS_SEMANA.map((d, i) => (
                        <div
                            key={d}
                            className={`text-[11px] font-bold uppercase tracking-wider py-1 ${
                                i === 6 ? 'text-rose-400' : 'text-stone-400'
                            }`}
                        >
                            {d}
                        </div>
                    ))}
                </div>

                {/* Grilla de días del mes seleccionado */}
                <div className="grid grid-cols-7 gap-1.5">
                    {mesActual.celdas.map((fStr, idx) => {
                        if (!fStr) {
                            return <div key={`empty-${idx}`} className="h-11" />
                        }

                        const diaNum = Number(fStr.slice(8, 10))
                        const esPasado = hoy ? fStr < hoy : false
                        const fueraDeRango = maxFecha ? fStr > maxFecha : false
                        const info = disponibilidadPorDia[fStr]

                        const parts = fStr.split('-').map(Number)
                        const dateObj = new Date(parts[0], parts[1] - 1, parts[2])
                        const esDomingo = dateObj.getDay() === 0

                        const cerrado = info ? info.cerrado : esDomingo
                        const semaforo =
                            info?.semaforo || (esDomingo ? 'cerrado' : 'disponible')
                        const sinTurnos = semaforo === 'completo'
                        const deshabilitado =
                            esPasado || fueraDeRango || cerrado || sinTurnos
                        const seleccionado = fechaSeleccionada === fStr
                        const esHoy = fStr === hoy

                        let clasesBoton =
                            'bg-emerald-50/90 text-emerald-900 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300'
                        let dotColor = 'bg-emerald-500'

                        if (esPasado || fueraDeRango) {
                            clasesBoton =
                                'bg-stone-50 text-stone-300 border-transparent cursor-not-allowed opacity-50'
                            dotColor = 'bg-transparent'
                        } else if (cerrado) {
                            clasesBoton =
                                'bg-stone-100/80 text-stone-400 border-stone-200/60 cursor-not-allowed'
                            dotColor = 'bg-stone-300'
                        } else if (sinTurnos) {
                            clasesBoton =
                                'bg-rose-50/80 text-rose-400 border-rose-200 cursor-not-allowed line-through'
                            dotColor = 'bg-rose-400'
                        } else if (semaforo === 'pocos') {
                            clasesBoton =
                                'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                            dotColor = 'bg-amber-500'
                        }

                        if (seleccionado) {
                            clasesBoton =
                                'bg-gradient-to-br from-fuchsia-600 to-orange-500 text-white border-transparent shadow-md scale-[1.04] font-black'
                            dotColor = 'bg-white'
                        }

                        return (
                            <button
                                key={fStr}
                                type="button"
                                data-fecha={fStr}
                                disabled={deshabilitado}
                                onClick={() => onSelectFecha(fStr)}
                                title={
                                    info?.motivo
                                        ? `${fStr}: ${info.motivo}`
                                        : info
                                          ? `${info.libresCount} turnos disponibles`
                                          : fStr
                                }
                                className={`relative min-h-[44px] rounded-xl border text-sm font-semibold flex flex-col items-center justify-center transition-all ${clasesBoton}`}
                            >
                                <span>{diaNum}</span>
                                <span
                                    className={`w-1.5 h-1.5 rounded-full mt-0.5 ${dotColor}`}
                                />
                                {esHoy && !seleccionado && (
                                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-pink-500" />
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* Leyenda de disponibilidad */}
                <div className="flex flex-wrap items-center justify-center gap-3 mt-3 pt-3 border-t border-stone-100 text-[11px] text-stone-600 font-medium">
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Disponible
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500" /> Pocos lugares
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-rose-400" /> Completo
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-stone-300" /> Cerrado
                    </span>
                    {loading && (
                        <span className="text-pink-500 animate-pulse">Actualizando...</span>
                    )}
                </div>
            </div>
        </div>
    )
}
