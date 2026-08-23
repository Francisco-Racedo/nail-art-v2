'use client'

import React, { useState, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
// @ts-ignore
import esLocale from '@fullcalendar/core/locales/es'
import { Calendar as CalendarIcon, Clock, X, Trash2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Reserva {
    id: number
    nombre: string
    servicio: string
    fecha: string
    horario: string
}

export default function AgendaCalendar({ initialReservas }: { initialReservas: Reserva[] }) {
    const router = useRouter()
    const [isMobile, setIsMobile] = useState(false)
    const [modalData, setModalData] = useState<{ id: number; cliente: string; servicio: string; fecha: string; hora: string } | null>(null)

    useEffect(() => {
        const checkIsMobile = () => setIsMobile(window.innerWidth < 768)
        checkIsMobile()
        window.addEventListener('resize', checkIsMobile)
        return () => window.removeEventListener('resize', checkIsMobile)
    }, [])

    const calcularFin = (fecha: string, hora: string) => {
        let parts = hora.split(':');
        let h = parseInt(parts[0], 10);
        let m = parseInt(parts[1], 10);
        m += 90; // Duración base estimada de 90 min por servicio
        h += Math.floor(m / 60);
        m = m % 60;
        return `${fecha}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
    }

    const eventos = initialReservas.map(r => ({
        title: `${r.nombre} - ${r.servicio.split('(')[0]}`, // Clean pricing text
        start: `${r.fecha}T${r.horario}:00`,
        end: calcularFin(r.fecha, r.horario),
        extendedProps: { id: r.id, servicio: r.servicio, cliente: r.nombre }
    }))

    const handleEventClick = (info: any) => {
        setModalData({
            id: info.event.extendedProps.id,
            cliente: info.event.extendedProps.cliente,
            servicio: info.event.extendedProps.servicio,
            fecha: info.event.startStr.split('T')[0],
            hora: info.event.startStr.split('T')[1].substring(0, 5)
        })
    }

    const liberarTurno = async () => {
        if (!modalData) return
        const idToDelete = modalData.id

        // Optimistic UI close
        setModalData(null)
        const toastId = toast.loading('Liberando turno...')

        try {
            const res = await fetch(`/api/admin/reservas/${idToDelete}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Falló servidor')

            toast.success('Turno liberado correctamente', { id: toastId })
            router.refresh() // Trigger Server Component re-fetch
        } catch (error) {
            toast.error('Error al liberar turno', { id: toastId })
            router.refresh()
        }
    }

    return (
        <div className="w-full relative">
            {/* Resumen Superior */}
            <div className="flex gap-4 overflow-x-auto pb-4 mb-2 snap-x hide-scrollbar">
                <div className="snap-center shrink-0 w-64 bg-zinc-900 border border-zinc-800 text-white p-5 rounded-3xl shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <CalendarIcon className="w-16 h-16" />
                    </div>
                    <p className="text-zinc-400 text-sm font-medium mb-1">Total Confirmados</p>
                    <div className="flex items-end gap-2 text-amber-400">
                        <span className="text-4xl font-extrabold text-white">{initialReservas.length}</span>
                        <span className="mb-1 text-sm font-medium">Turnos</span>
                    </div>
                </div>
            </div>

            {/* Calendario Contenedor Glassmorphic */}
            <div className="bg-zinc-900/40 backdrop-blur-3xl md:rounded-[2rem] shadow-xl md:border md:border-zinc-800/80 p-2 md:p-6 mb-8 w-full overflow-hidden">
                <FullCalendar
                    plugins={[timeGridPlugin, interactionPlugin, listPlugin]}
                    initialView={isMobile ? 'listWeek' : 'timeGridWeek'}
                    locale={esLocale}
                    firstDay={1} // Lunes
                    hiddenDays={[0]} // Ocultar domingos
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
                    eventColor="#d4af37"
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

            <style jsx global>{`
        .fc {
            font-family: inherit;
            color: #d4d4d8;
        }
        .fc-theme-standard .fc-scrollgrid { border-color: #27272a; }
        .fc-theme-standard th, .fc-theme-standard td { border-color: #27272a; }
        .fc-col-header-cell { padding: 12px 0; background: rgba(39, 39, 42, 0.3); }
        .fc-event {
            border: none;
            border-radius: 8px;
            padding: 4px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            transition: transform 0.1s;
            cursor: pointer;
        }
        .fc-event:active { transform: scale(0.97); }
        .fc-event-main { font-weight: 600; font-size: 0.8rem; color: #18181b; }
        .fc-timegrid-slot { height: 3em !important; }
        
        .fc-list {
            border-color: #27272a !important;
            border-radius: 16px;
            overflow: hidden;
            background: rgba(39, 39, 42, 0.3);
        }
        .fc-list-day-cushion {
            background: #18181b !important;
            font-weight: 700;
            padding: 12px 16px !important;
        }
        .fc-list-event td {
            padding: 16px 16px !important;
            border-bottom: 1px solid #27272a;
        }
        .fc-list-event-title, .fc-list-event-time { color: #f4f4f5; font-weight: 600; }
        .fc-list-event-dot { border-color: #d4af37 !important; }

        /* Botones de Toolbar */
        .fc .fc-button-primary {
            background: #27272a !important;
            border-color: #27272a !important;
            color: #f4f4f5 !important;
            text-transform: capitalize;
            border-radius: 10px;
        }
        .fc .fc-button-primary:hover { background: #3f3f46 !important; border-color: #3f3f46 !important; }
        .fc .fc-button-active { background: #d4af37 !important; border-color: #d4af37 !important; color: #18181b !important; }
        .fc-toolbar-title { font-weight: 700 !important; color: #f4f4f5; }
      `}</style>

            {/* Modern Modal / Bottom Sheet */}
            {modalData && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center animate-in fade-in duration-200">
                    <div className="absolute inset-0" onClick={() => setModalData(null)} />
                    <div className="bg-zinc-900 border border-zinc-800 rounded-t-3xl md:rounded-3xl w-full max-w-md shadow-2xl p-6 relative animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 md:zoom-in-95 duration-300">
                        <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mb-6 md:hidden" />

                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-sm">
                                💅
                            </div>
                            <button onClick={() => setModalData(null)} className="text-zinc-400 hover:text-zinc-200 p-2 rounded-full bg-zinc-800 transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <h3 className="font-bold text-2xl text-white tracking-tight mb-2">{modalData.cliente}</h3>
                        <p className="text-amber-500 text-sm mb-6 flex items-center gap-1.5 font-medium">
                            <CheckCircle2 className="w-4 h-4" /> Turnero Digital Confirmado
                        </p>

                        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-2xl p-4 mb-4">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">Servicio Solicitado</p>
                            <p className="text-amber-400 font-bold text-base">{modalData.servicio}</p>
                        </div>

                        <div className="flex gap-4 mb-8">
                            <div className="flex-1 bg-zinc-800/50 border border-zinc-700/50 rounded-2xl p-4">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><CalendarIcon className="w-3 h-3" /> Día</p>
                                <p className="text-white font-semibold">{modalData.fecha.split('-').reverse().join('/')}</p>
                            </div>
                            <div className="flex-1 bg-zinc-800/50 border border-zinc-700/50 rounded-2xl p-4">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Horario</p>
                                <p className="text-white font-semibold">{modalData.hora}</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button onClick={liberarTurno} className="w-full flex items-center justify-center gap-2 bg-red-950/40 text-red-400 border border-red-900/50 hover:bg-red-900/60 font-bold py-4 rounded-xl transition">
                                <Trash2 className="w-5 h-5" /> Eliminar Turno
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
