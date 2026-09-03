import React from 'react'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Reserva, ESTADO_CONFIG, checkCumple } from './agendaTypes'

interface EventGridProps {
    dayReservas: Reserva[];
    selectedDateLabel: string;
    config: any;
    handleEventClick: (r: Reserva) => void;
}

export default function EventGrid({ dayReservas, selectedDateLabel, config, handleEventClick }: EventGridProps) {
    const calcularFin = (fecha: string, hora: string) => {
        const parts = hora.split(':')
        let h = parseInt(parts[0], 10)
        let m = parseInt(parts[1], 10)
        m += Number(config?.intervalo_minutos || 90)
        h += Math.floor(m / 60)
        m = m % 60
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }

    const getEventCardStyle = (estado: string) => {
        const base = 'border-r border-t border-b border-orange-200/50 shadow-sm border-l-[6px]'
        if (estado === 'confirmado') return `${base} border-l-emerald-500 bg-white/90 backdrop-blur-sm`
        if (estado === 'completado') return `${base} border-l-rose-500 bg-white/90 backdrop-blur-sm`
        return `${base} border-l-amber-500 bg-white/90 backdrop-blur-sm`
    }

    return (
        <>
            <div className="mb-6">
                <h3 className="text-xl font-black text-stone-900 capitalize">
                    Agenda Diaria
                </h3>
                <p className="text-stone-500 font-medium text-sm capitalize">{selectedDateLabel}</p>
            </div>

            {dayReservas.length === 0 ? (
                <div className="bg-stone-50 border border-stone-200 rounded-3xl p-10 text-center flex flex-col items-center justify-center min-h-[300px]">
                    <CalendarIcon className="w-12 h-12 text-stone-300 mb-4" />
                    <p className="text-stone-500 font-medium tracking-wide">No hay turnos agendados para este día.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {dayReservas.map(reserva => {
                        const finCalc = calcularFin(reserva.fecha, reserva.horario)
                        const dynamicStyle = getEventCardStyle(reserva.estado)
                        const esCumple = checkCumple(reserva.fecha_nacimiento)
                        const estadoCfg = ESTADO_CONFIG[reserva.estado || 'pendiente']

                        const hStartStr = reserva.horario.substring(0, 5)
                        const hInt = parseInt(hStartStr.split(':')[0])
                        const hAmPm = hInt >= 12 ? 'p. m.' : 'a. m.'

                        const senaPagada = (reserva.estado_pago === 'pagado_sena' || reserva.estado_pago === 'pagado_total') || (typeof reserva.monto_sena === 'number' && reserva.monto_sena > 0)

                        return (
                            <button
                                key={reserva.id}
                                onClick={() => handleEventClick(reserva)}
                                className={`flex w-full ${dynamicStyle} rounded-xl p-0 text-left transition-all duration-300 hover:bg-rose-100 hover:border-rose-300 hover:-translate-y-1 hover:shadow-md group overflow-hidden max-w-full shadow-sm`}
                            >
                                <div className="w-[84px] md:w-36 shrink-0 border-r border-stone-300 bg-stone-50/50 p-3 md:p-5 flex flex-col justify-center">
                                    <span className="text-stone-900 font-bold text-[11px] md:text-base leading-tight">{hStartStr} <span className="hidden md:inline">{hAmPm}</span></span>
                                    <span className="text-stone-500 text-[10px] md:text-xs font-medium md:font-normal mt-0.5">{reserva.horario.substring(0, 5)} - {finCalc}</span>
                                </div>
                                <div className="p-3 md:p-5 flex-1 flex flex-col justify-center relative bg-white min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5 md:gap-3 mb-1.5 md:mb-1">
                                        <span className="text-stone-900 font-bold text-sm md:text-lg tracking-tight truncate max-w-full">{reserva.nombre}</span>
                                        <span className={`px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-[9px] md:text-xs font-bold md:font-semibold uppercase tracking-widest border shrink-0 ${estadoCfg.bg} ${estadoCfg.color} ${estadoCfg.border}`}>
                                            {estadoCfg.label}
                                        </span>
                                        {reserva.reprogramado && (
                                            <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded font-bold shrink-0">
                                                🔄 REPROGRAMADO
                                            </span>
                                        )}
                                        {esCumple && <span title="¡Cumpleaños!" className="shrink-0">🎂</span>}
                                    </div>
                                    <div className="flex items-center flex-wrap gap-1.5 md:gap-4 mt-1">
                                        <span className="text-stone-600 text-[10px] md:text-sm font-medium flex items-center gap-1 md:gap-1.5 truncate max-w-full">
                                            <CalendarIcon className="w-3 h-3 md:w-3.5 md:h-3.5 shrink-0" />
                                            <span className="truncate">{reserva.servicio.split('(')[0]}</span>
                                        </span>
                                        {(!reserva.email || reserva.email === '') && (
                                            <span className="text-stone-500 text-[9px] md:text-xs flex items-center gap-1 rounded bg-stone-50 font-medium md:border md:border-stone-200 px-1 md:px-2 py-0.5 shrink-0">
                                                ✉️ <span className="hidden md:inline">Sin correo</span>
                                            </span>
                                        )}
                                        {senaPagada && (
                                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded text-[9px] md:text-xs font-bold shrink-0 flex items-center gap-1">
                                                💳 <span className="hidden md:inline">SEÑA ACREDITADA</span><span className="md:hidden">SEÑA</span>
                                            </span>
                                        )}
                                        {reserva.estado === 'pendiente' && reserva.metodo_pago === 'mp' && !senaPagada && (
                                            <span className="bg-[#009EE3]/10 text-[#009EE3] border border-[#009EE3]/20 px-1.5 md:px-2 py-0.5 rounded font-bold text-[9px] md:text-xs shrink-0">
                                                💳 <span className="hidden md:inline">Pagará con MP</span><span className="md:hidden">MP</span>
                                            </span>
                                        )}
                                        {reserva.estado === 'pendiente' && reserva.metodo_pago === 'transferencia' && !senaPagada && (
                                            <span className="bg-amber-500/10 text-amber-600 border border-amber-500/20 px-1.5 md:px-2 py-0.5 rounded font-bold text-[9px] md:text-xs shrink-0">
                                                🏦 <span className="hidden md:inline">Pagará Transf.</span><span className="md:hidden">TRANSF</span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                </div>
            )}
        </>
    )
}
