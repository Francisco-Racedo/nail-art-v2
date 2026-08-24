'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Calendar as CalendarIcon, Clock, X, Trash2, CheckCircle2, AlertTriangle, CircleDot, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Reserva {
    id: number
    nombre: string
    servicio: string
    fecha: string
    horario: string
    estado: 'pendiente' | 'confirmado' | 'completado'
}

type EstadoReserva = 'pendiente' | 'confirmado' | 'completado'

const ESTADO_CONFIG: Record<EstadoReserva, { label: string; color: string; bg: string; border: string }> = {
    pendiente: { label: 'Pendiente', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
    confirmado: { label: 'Confirmado', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
    completado: { label: 'Completado', color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/30' },
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8) // 8 to 21
const DAYS_OF_WEEK = [1, 2, 3, 4, 5, 6] // Lunes a Sábado

const getStartOfWeek = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    d.setHours(0, 0, 0, 0)
    return d
}

const formatDateStr = (date: Date) => {
    return date.toISOString().split('T')[0]
}

const parseDateStr = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d)
}

export default function AgendaCalendar({ initialReservas, intervaloMinutos = 90 }: { initialReservas: Reserva[]; intervaloMinutos?: number }) {
    const router = useRouter()
    const [currentDate, setCurrentDate] = useState(new Date())
    const [modalData, setModalData] = useState<{ id: number; cliente: string; servicio: string; fecha: string; hora: string; estado: EstadoReserva } | null>(null)
    const [confirmDelete, setConfirmDelete] = useState(false)

    // Ensure we start on a valid date relative to timezone without shifts
    const startOfWeek = useMemo(() => getStartOfWeek(currentDate), [currentDate])

    const weekDays = useMemo(() => {
        return DAYS_OF_WEEK.map(offset => {
            const date = new Date(startOfWeek)
            date.setDate(startOfWeek.getDate() + (offset - 1))
            return date
        })
    }, [startOfWeek])

    const handlePrevWeek = () => {
        const newDate = new Date(currentDate)
        newDate.setDate(currentDate.getDate() - 7)
        setCurrentDate(newDate)
    }

    const handleNextWeek = () => {
        const newDate = new Date(currentDate)
        newDate.setDate(currentDate.getDate() + 7)
        setCurrentDate(newDate)
    }

    const handleToday = () => {
        setCurrentDate(new Date())
    }

    const calcularFin = (fecha: string, hora: string) => {
        const parts = hora.split(':')
        let h = parseInt(parts[0], 10)
        let m = parseInt(parts[1], 10)
        m += intervaloMinutos
        h += Math.floor(m / 60)
        m = m % 60
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }

    const getEventColorHover = (estado: EstadoReserva) => {
        if (estado === 'confirmado') return 'hover:bg-emerald-600/90'
        if (estado === 'completado') return 'hover:bg-pink-600/90'
        return 'hover:bg-amber-600/90'
    }

    const getEventColorSolid = (estado: EstadoReserva) => {
        if (estado === 'confirmado') return 'bg-emerald-600'
        if (estado === 'completado') return 'bg-pink-600'
        return 'bg-amber-600'
    }

    const handleEventClick = (reserva: Reserva) => {
        setConfirmDelete(false)
        setModalData({
            id: reserva.id,
            cliente: reserva.nombre,
            servicio: reserva.servicio,
            fecha: reserva.fecha,
            hora: reserva.horario.substring(0, 5),
            estado: reserva.estado || 'pendiente',
        })
    }

    const iniciarBorrado = () => {
        setConfirmDelete(true)
    }

    const liberarTurno = async () => {
        if (!modalData) return
        const idToDelete = modalData.id

        setConfirmDelete(false)
        setModalData(null)
        const toastId = toast.loading('Liberando turno...')

        try {
            const res = await fetch(`/api/admin/reservas/${idToDelete}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Falló servidor')

            toast.success('Turno liberado correctamente', { id: toastId })
            router.refresh()
        } catch (error) {
            toast.error('Error al liberar turno', { id: toastId })
            router.refresh()
        }
    }

    const actualizarEstado = async (nuevoEstado: EstadoReserva) => {
        if (!modalData) return
        const toastId = toast.loading('Actualizando estado...')
        try {
            const res = await fetch(`/api/admin/reservas/${modalData.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: nuevoEstado })
            })
            if (!res.ok) throw new Error()
            toast.success(`Estado → ${ESTADO_CONFIG[nuevoEstado].label}`, { id: toastId })
            setModalData(prev => prev ? { ...prev, estado: nuevoEstado } : null)
            router.refresh()
        } catch {
            toast.error('No se pudo actualizar el estado', { id: toastId })
        }
    }

    const estadoCfg = modalData ? ESTADO_CONFIG[modalData.estado] : null

    // Filter events for the current week mapped
    const currentWeekReservas = useMemo(() => {
        return initialReservas.filter(r => {
            const rDate = parseDateStr(r.fecha)
            rDate.setHours(0, 0, 0, 0)
            const endOfWeek = new Date(startOfWeek)
            endOfWeek.setDate(startOfWeek.getDate() + 5) 
            endOfWeek.setHours(23, 59, 59, 999)
            return rDate >= startOfWeek && rDate <= endOfWeek 
        })
    }, [initialReservas, startOfWeek])

    // Utility to calculate absolute top and height percentages
    const getEventStyle = (horarioStr: string, durationMinutes: number) => {
        const [h, m] = horarioStr.split(':').map(Number)
        // Only render between 8:00 (index 0) and 21:00
        const totalMinutesDay = (21 - 8) * 60 // 13 hours = 780 minutes
        const startMinutes = (h - 8) * 60 + m
        
        let displayDuration = durationMinutes
        // Cap the block so it doesn't overflow past 21:00
        if (startMinutes + durationMinutes > totalMinutesDay) {
            displayDuration = totalMinutesDay - startMinutes
        }

        const topPercent = (startMinutes / totalMinutesDay) * 100
        const heightPercent = (displayDuration / totalMinutesDay) * 100

        return {
            top: `${Math.max(0, topPercent)}%`,
            height: `${Math.max(2, heightPercent)}%` // Ensuring at least a small height
        }
    }

    const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
    const formatHeaderDate = (dates: Date[]) => {
        if (!dates.length) return ""
        const first = dates[0]
        const last = dates[dates.length - 1]
        
        if (first.getMonth() === last.getMonth()) {
            return `${first.getDate()} – ${last.getDate()} ${monthNames[first.getMonth()]} flex-1 ${first.getFullYear()}`
        }
        return `${first.getDate()} ${monthNames[first.getMonth()]} – ${last.getDate()} ${monthNames[last.getMonth()]} ${first.getFullYear()}`
    }

    const dayNames = ["lun", "mar", "mié", "jue", "vie", "sáb"]
    const formatHeaderFull = formatHeaderDate(weekDays)

    return (
        <div className="w-full relative">
            <div className="flex gap-4 overflow-x-auto pb-4 mb-2 snap-x hide-scrollbar">
                <div className="snap-center shrink-0 w-64 bg-[#0a1128]/80 border border-indigo-500/20 text-white p-5 rounded-3xl shadow-[0_10px_30px_rgba(79,70,229,0.15)] relative overflow-hidden backdrop-blur-md">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <CalendarIcon className="w-16 h-16 text-cyan-400" />
                    </div>
                    <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-indigo-600/20 blur-3xl rounded-full pointer-events-none" />
                    <p className="text-indigo-200 text-sm font-medium mb-1">Total Confirmados</p>
                    <div className="flex items-end gap-2 text-cyan-400">
                        <span className="text-4xl font-extrabold text-white drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">{initialReservas.length}</span>
                        <span className="mb-1 text-sm font-medium">Turnos</span>
                    </div>
                </div>
                {(['pendiente', 'confirmado', 'completado'] as EstadoReserva[]).map(e => {
                    const count = initialReservas.filter(r => (r.estado || 'pendiente') === e).length
                    const cfg = ESTADO_CONFIG[e]
                    return (
                        <div key={e} className={`snap-center shrink-0 w-48 ${cfg.bg} border ${cfg.border} p-5 rounded-3xl backdrop-blur-md`}>
                            <p className={`${cfg.color} text-xs font-bold uppercase tracking-widest mb-1`}>{cfg.label}</p>
                            <p className={`text-3xl font-extrabold ${cfg.color}`}>{count}</p>
                        </div>
                    )
                })}
            </div>

            <div className="bg-[#050b14]/60 backdrop-blur-[40px] md:rounded-[2rem] shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-indigo-500/10 mb-8 w-full overflow-hidden relative flex flex-col h-[70vh] min-h-[600px]">
                {/* Header Navbar */}
                <div className="flex flex-col md:flex-row items-center justify-between p-4 md:p-6 border-b border-indigo-500/20 shrink-0">
                    <div className="flex items-center gap-2 mb-4 md:mb-0 w-full md:w-auto overflow-x-auto hide-scrollbar">
                        <div className="flex rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-1 shrink-0">
                            <button onClick={handlePrevWeek} className="p-1.5 hover:bg-indigo-500/20 rounded-md text-indigo-300 transition-colors">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button onClick={handleNextWeek} className="p-1.5 hover:bg-indigo-500/20 rounded-md text-indigo-300 transition-colors">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                        <button onClick={handleToday} className="px-3 py-1.5 rounded-lg border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/10 transition-colors text-sm font-medium shrink-0">
                            Hoy
                        </button>
                    </div>
                    <h2 className="text-lg md:text-2xl font-bold text-white tracking-tight text-center flex-1">{formatHeaderFull.replace(' flex-1', '')}</h2>
                    <div className="hidden md:flex rounded-lg bg-indigo-500/10 border border-indigo-500/20 overflow-hidden shrink-0">
                        <button className="px-4 py-1.5 bg-indigo-500/30 text-white text-sm font-medium">Semana</button>
                        <button className="px-4 py-1.5 text-indigo-300 hover:bg-indigo-500/20 text-sm font-medium transition-colors">Día</button>
                    </div>
                </div>

                {/* Calendar Body Area */}
                <div className="flex-1 overflow-auto rounded-b-[2rem] hide-scrollbar bg-black/20 relative">
                    <div className="min-w-[700px] w-full h-full flex flex-col">
                        
                        {/* Day Headers */}
                        <div className="grid grid-cols-[60px_repeat(6,1fr)] shrink-0 border-b border-indigo-500/20 bg-[#0a1128]/95 sticky top-0 z-30">
                            <div className="border-r border-indigo-500/10 p-3"></div>
                            {weekDays.map((date, i) => {
                                const isToday = formatDateStr(date) === formatDateStr(new Date())
                                return (
                                    <div key={i} className={`p-2 md:p-3 text-center border-r border-indigo-500/10 last:border-r-0 flex flex-col items-center justify-center ${isToday ? 'bg-indigo-500/20' : ''}`}>
                                        <span className={`text-[10px] md:text-xs font-bold uppercase ${isToday ? 'text-indigo-300' : 'text-zinc-500'}`}>{dayNames[i]}</span>
                                        <span className={`text-base md:text-lg font-extrabold mt-0.5 ${isToday ? 'text-white' : 'text-zinc-300'}`}>{date.getDate()}</span>
                                    </div>
                                )
                            })}
                        </div>
                        
                        {/* Grid container with hours and events */}
                        <div className="relative flex-1 grid grid-cols-[60px_repeat(6,1fr)] min-h-[800px]">
                            
                            {/* Time axis strictly fixed */}
                            <div className="col-span-1 border-r border-indigo-500/10 relative z-10 bg-[#050b14]">
                                {HOURS.slice(0, -1).map((hour, idx) => {
                                    // Calculate top manually. Total 13 hours = 780 minutes.
                                    // Math: idx / 13 * 100%
                                    const topPercent = (idx / 13) * 100
                                    return (
                                        <div key={hour} className="absolute w-full right-0 text-right pr-2" style={{ top: `${topPercent}%`, transform: 'translateY(-50%)' }}>
                                            <span className="text-[10px] md:text-xs font-semibold text-zinc-500 bg-[#050b14] px-1">{hour}</span>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Background lines for each day column */}
                            {weekDays.map((_, i) => (
                                <div key={i} className="col-span-1 border-r border-indigo-500/10 last:border-r-0 relative group">
                                    {/* Horizontal grid lines */}
                                    {HOURS.slice(0, -1).map((hour, idx) => {
                                        const topPercent = (idx / 13) * 100
                                        return (
                                            <div key={hour} className="absolute w-full border-t border-indigo-500/10 pointer-events-none group-hover:border-indigo-500/30 transition-colors" style={{ top: `${topPercent}%` }}></div>
                                        )
                                    })}
                                    
                                    {/* Vertical Day Highlight overlay */}
                                    {formatDateStr(weekDays[i]) === formatDateStr(new Date()) && (
                                        <div className="absolute inset-0 bg-indigo-500/5 pointer-events-none" />
                                    )}
                                </div>
                            ))}

                            {/* Event blocks */}
                            <div className="absolute inset-0 grid grid-cols-[60px_repeat(6,1fr)] pointer-events-none">
                                <div className="col-span-1" /> {/* skip time axis */}
                                {weekDays.map((date, colIndex) => {
                                    const dayStr = formatDateStr(date)
                                    const dayReservas = currentWeekReservas.filter(r => r.fecha === dayStr)
                                    
                                    return (
                                        <div key={colIndex} className="col-span-1 relative h-full w-full">
                                            {dayReservas.map(reserva => {
                                                const style = getEventStyle(reserva.horario, intervaloMinutos)
                                                if (style.height === "0%") return null
                                                
                                                const bgSolid = getEventColorSolid(reserva.estado)
                                                const bgHover = getEventColorHover(reserva.estado)
                                                const finCalc = calcularFin(reserva.fecha, reserva.horario)
                                                
                                                return (
                                                    <div 
                                                        key={reserva.id}
                                                        style={{ top: style.top, height: style.height }}
                                                        className={`absolute left-0.5 right-0.5 pointer-events-auto cursor-pointer p-1.5 md:p-2 rounded-lg text-white shadow-md overflow-hidden transition-all duration-200 hover:-translate-y-[1px] hover:shadow-xl ${bgSolid} ${bgHover} border border-white/10`}
                                                        onClick={() => handleEventClick(reserva)}
                                                    >
                                                        <div className="text-[9px] md:text-[10px] font-extrabold uppercase tracking-widest leading-none flex items-center justify-between mb-1 opacity-90">
                                                            <span>{reserva.horario.substring(0,5)} - {finCalc}</span>
                                                        </div>
                                                        <div className="text-xs md:text-sm font-bold truncate leading-tight drop-shadow-sm">
                                                            {reserva.nombre}
                                                        </div>
                                                        <div className="text-[10px] md:text-xs font-medium truncate opacity-90 mt-0.5">
                                                            {reserva.servicio.split('(')[0]}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal / Bottom Sheet */}
            {modalData && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center animate-in fade-in duration-200">
                    <div className="absolute inset-0" onClick={() => { setModalData(null); setConfirmDelete(false) }} />
                    <div className="bg-zinc-900 border border-zinc-800 rounded-t-3xl md:rounded-3xl w-full max-w-md shadow-2xl p-6 pb-32 md:p-6 md:pb-6 relative animate-bottom-sheet max-h-[85dvh] md:max-h-[90vh] overflow-y-auto overscroll-contain">
                        <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mb-6 md:hidden cursor-pointer hover:bg-zinc-600 transition" onClick={() => { setModalData(null); setConfirmDelete(false) }} />

                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-sm">
                                💅
                            </div>
                            <button onClick={() => { setModalData(null); setConfirmDelete(false) }} className="text-zinc-400 hover:text-zinc-200 p-2 rounded-full bg-zinc-800 transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <h3 className="font-bold text-2xl text-white tracking-tight mb-1">{modalData.cliente}</h3>

                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-5 border ${estadoCfg?.bg} ${estadoCfg?.color} ${estadoCfg?.border}`}>
                            <CircleDot className="w-3 h-3" />
                            {estadoCfg?.label}
                        </div>

                        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-2xl p-4 mb-4">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Servicio Solicitado</p>
                            <p className="text-amber-400 font-bold text-base">{modalData.servicio}</p>
                        </div>

                        <div className="flex gap-4 mb-6">
                            <div className="flex-1 bg-zinc-800/50 border border-zinc-700/50 rounded-2xl p-4">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><CalendarIcon className="w-3 h-3" /> Día</p>
                                <p className="text-white font-semibold">{modalData.fecha.split('-').reverse().join('/')}</p>
                            </div>
                            <div className="flex-1 bg-zinc-800/50 border border-zinc-700/50 rounded-2xl p-4">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Horario</p>
                                <p className="text-white font-semibold">{modalData.hora}</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 mb-3">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Cambiar Estado</p>
                            <div className="grid grid-cols-3 gap-2">
                                {(['pendiente', 'confirmado', 'completado'] as EstadoReserva[]).map(e => {
                                    const cfg = ESTADO_CONFIG[e]
                                    const isActive = modalData.estado === e
                                    return (
                                        <button
                                            key={e}
                                            onClick={() => !isActive && actualizarEstado(e)}
                                            disabled={isActive}
                                            className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${isActive ? `${cfg.bg} ${cfg.color} ${cfg.border} cursor-default` : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'}`}
                                        >
                                            {isActive && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                                            {cfg.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 mt-4">
                            {!confirmDelete ? (
                                <button
                                    onClick={iniciarBorrado}
                                    className="w-full flex items-center justify-center gap-2 bg-red-950/40 text-red-400 border border-red-900/50 hover:bg-red-900/60 font-bold py-3.5 rounded-xl transition"
                                >
                                    <Trash2 className="w-5 h-5" /> Eliminar Turno
                                </button>
                            ) : (
                                <div className="bg-red-950/50 border border-red-700/50 rounded-xl p-4 animate-in fade-in duration-200">
                                    <div className="flex items-center gap-2 text-red-400 font-bold mb-3">
                                        <AlertTriangle className="w-5 h-5" />
                                        <span>¿Confirmar eliminación?</span>
                                    </div>
                                    <p className="text-zinc-400 text-sm mb-4">Esta acción es irreversible. El turno será eliminado permanentemente.</p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setConfirmDelete(false)}
                                            className="flex-1 bg-zinc-800 text-zinc-300 font-bold py-2.5 rounded-lg hover:bg-zinc-700 transition text-sm"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={liberarTurno}
                                            className="flex-1 bg-red-700 hover:bg-red-600 text-white font-bold py-2.5 rounded-lg transition text-sm flex items-center justify-center gap-1.5"
                                        >
                                            <Trash2 className="w-4 h-4" /> Sí, eliminar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
