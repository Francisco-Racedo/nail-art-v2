'use client'

import React, { useState, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import { Calendar as CalendarIcon, Clock, X, Trash2, CheckCircle2, AlertTriangle, CircleDot } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

// M-01: Reserva ahora incluye el campo estado
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
    confirmado: { label: 'Confirmado', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
    completado: { label: 'Completado', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
}

// C-04: Recibe intervaloMinutos para calcular con precisión el fin del bloque en el calendario
export default function AgendaCalendar({ initialReservas, intervaloMinutos = 90 }: { initialReservas: Reserva[]; intervaloMinutos?: number }) {
    const router = useRouter()
    const [isMobile, setIsMobile] = useState(false)
    const [modalData, setModalData] = useState<{ id: number; cliente: string; servicio: string; fecha: string; hora: string; estado: EstadoReserva } | null>(null)
    // C-05: Estado de confirmación de borrado para evitar eliminaciones accidentales
    const [confirmDelete, setConfirmDelete] = useState(false)

    useEffect(() => {
        const checkIsMobile = () => setIsMobile(window.innerWidth < 768)
        checkIsMobile()
        window.addEventListener('resize', checkIsMobile)
        return () => window.removeEventListener('resize', checkIsMobile)
    }, [])

    // C-04: Usa el intervaloMinutos real de la config en lugar del valor hardcodeado
    const calcularFin = (fecha: string, hora: string) => {
        const parts = hora.split(':');
        let h = parseInt(parts[0], 10);
        let m = parseInt(parts[1], 10);
        m += intervaloMinutos;
        h += Math.floor(m / 60);
        m = m % 60;
        return `${fecha}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
    }

    // M-01: Color del evento en el calendario según el estado
    const getEventColor = (estado: EstadoReserva) => {
        if (estado === 'confirmado') return '#0e7490'   // cyan-700
        if (estado === 'completado') return '#15803d'   // green-700
        return '#0284c7'                                 // sky-600 (pendiente — default)
    }

    const eventos = initialReservas.map(r => ({
        title: `${r.nombre} - ${r.servicio.split('(')[0]}`,
        start: `${r.fecha}T${r.horario}:00`,
        end: calcularFin(r.fecha, r.horario),
        backgroundColor: getEventColor(r.estado || 'pendiente'),
        borderColor: 'transparent',
        extendedProps: { id: r.id, servicio: r.servicio, cliente: r.nombre, estado: r.estado || 'pendiente' }
    }))

    const handleEventClick = (info: any) => {
        setConfirmDelete(false)
        setModalData({
            id: info.event.extendedProps.id,
            cliente: info.event.extendedProps.cliente,
            servicio: info.event.extendedProps.servicio,
            fecha: info.event.startStr.split('T')[0],
            hora: info.event.startStr.split('T')[1].substring(0, 5),
            estado: info.event.extendedProps.estado || 'pendiente',
        })
    }

    // C-05: Separar el inicio del flujo de confirmación del DELETE real
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

    // M-01: Actualizar el estado de una reserva desde el panel admin
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
            // Actualizar el modal localmente sin esperar router.refresh
            setModalData(prev => prev ? { ...prev, estado: nuevoEstado } : null)
            router.refresh()
        } catch {
            toast.error('No se pudo actualizar el estado', { id: toastId })
        }
    }

    const estadoCfg = modalData ? ESTADO_CONFIG[modalData.estado] : null

    return (
        <div className="w-full relative">
            {/* Resumen Superior */}
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
                {/* M-01: Mini cards de estado */}
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

            {/* Calendario Contenedor Glassmorphic */}
            <div className="bg-[#050b14]/60 backdrop-blur-[40px] md:rounded-[2rem] shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-indigo-500/10 p-2 md:p-6 mb-8 w-full overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-cyan-500/5 pointer-events-none" />
                <div className="relative z-10">
                    <FullCalendar
                        plugins={[timeGridPlugin, interactionPlugin, listPlugin]}
                        initialView={isMobile ? 'listWeek' : 'timeGridWeek'}
                        locale="es"
                        firstDay={1}
                        hiddenDays={[0]}
                        allDaySlot={false}
                        slotMinTime="08:00:00"
                        slotMaxTime="21:00:00"
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: isMobile ? '' : 'timeGridWeek,timeGridDay'
                        }}
                        events={eventos}
                        eventClick={handleEventClick}
                        height="auto"
                        dayHeaderFormat={{ weekday: 'short', day: 'numeric' }}
                        // @ts-ignore
                        buttonText={{
                            today: 'Hoy',
                            week: 'Semana',
                            day: 'Día',
                            list: 'Lista'
                        }}
                    />
                </div>
            </div>

            {/* Modern Modal / Bottom Sheet */}
            {modalData && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center animate-in fade-in duration-200">
                    <div className="absolute inset-0" onClick={() => { setModalData(null); setConfirmDelete(false) }} />
                    <div className="bg-zinc-900 border border-zinc-800 rounded-t-3xl md:rounded-3xl w-full max-w-md shadow-2xl p-6 relative animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 md:zoom-in-95 duration-300">
                        <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mb-6 md:hidden" />

                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-sm">
                                💅
                            </div>
                            <button onClick={() => { setModalData(null); setConfirmDelete(false) }} className="text-zinc-400 hover:text-zinc-200 p-2 rounded-full bg-zinc-800 transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <h3 className="font-bold text-2xl text-white tracking-tight mb-1">{modalData.cliente}</h3>

                        {/* M-01: Badge de estado + ícono */}
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

                        {/* M-01: Botones para cambiar el estado */}
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

                        {/* C-05: Flujo de confirmación de 2 pasos */}
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
