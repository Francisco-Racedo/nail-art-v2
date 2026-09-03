'use client'

import React, { useState, useEffect, useMemo } from 'react'
import WeekNavigator from './admin/WeekNavigator'
import EventGrid from './admin/EventGrid'
import TurnoModal from './admin/TurnoModal'
import { Reserva, ModalData, formatDateStr } from './admin/agendaTypes'

// Helper to get monday of the week
const getStartOfWeek = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    d.setHours(0, 0, 0, 0)
    return d
}

const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
const dayNamesLong = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

export default function AgendaCalendar({ initialReservas, config }: { initialReservas: Reserva[]; config: any }) {
    const [viewDate, setViewDate] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState(new Date())
    const [mounted, setMounted] = useState(false)
    const [modalData, setModalData] = useState<ModalData | null>(null)

    useEffect(() => {
        const localNow = new Date()
        setViewDate(localNow)
        setSelectedDate(localNow)
        setMounted(true)
    }, [])

    const startOfWeek = useMemo(() => getStartOfWeek(viewDate), [viewDate])

    const weekDays = useMemo(() => {
        return [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13].map(offset => {
            const date = new Date(startOfWeek)
            date.setDate(startOfWeek.getDate() + (offset - 1))
            return date
        })
    }, [startOfWeek])

    const handlePrevWeek = () => {
        const newDate = new Date(viewDate)
        newDate.setDate(viewDate.getDate() - 14)
        setViewDate(newDate)
    }

    const handleNextWeek = () => {
        const newDate = new Date(viewDate)
        newDate.setDate(viewDate.getDate() + 14)
        setViewDate(newDate)
    }

    const handleEventClick = (reserva: Reserva) => {
        setModalData({
            id: reserva.id,
            cliente: reserva.nombre,
            servicio: reserva.servicio,
            fecha: reserva.fecha,
            hora: reserva.horario.substring(0, 5),
            estado: reserva.estado || 'pendiente',
            celular: reserva.celular,
            email: reserva.email,
            notificacion_enviada: reserva.notificacion_enviada,
            fecha_nacimiento: reserva.fecha_nacimiento,
            descuento_aplicado: reserva.descuento_aplicado,
            monto_sena: reserva.monto_sena,
            metodo_pago: reserva.metodo_pago,
            estado_pago: reserva.estado_pago,
            reprogramado: reserva.reprogramado
        })
    }

    const dayReservas = useMemo(() => {
        const selectedDayStr = formatDateStr(selectedDate)
        return initialReservas.filter(r => r.fecha === selectedDayStr).sort((a, b) => a.horario.localeCompare(b.horario))
    }, [initialReservas, selectedDate])

    const selectedDateLabel = `${dayNamesLong[selectedDate.getDay()]}, ${selectedDate.getDate()} de ${monthNames[selectedDate.getMonth()]}`

    if (!mounted) {
        return (
            <div className="w-full flex justify-center items-center py-20 min-h-[400px] bg-white/90 backdrop-blur-sm rounded-[2rem] border border-orange-200/50">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-rose-300 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-stone-500 font-medium text-sm">Sincronizando reloj...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full relative bg-white/90 backdrop-blur-sm p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-orange-200/50 shadow-md overflow-hidden">
            <WeekNavigator
                viewDate={viewDate}
                handlePrevWeek={handlePrevWeek}
                handleNextWeek={handleNextWeek}
                weekDays={weekDays}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                startOfWeek={startOfWeek}
            />

            <EventGrid
                dayReservas={dayReservas}
                selectedDateLabel={selectedDateLabel}
                config={config}
                handleEventClick={handleEventClick}
            />

            {modalData && (
                <TurnoModal
                    modalData={modalData}
                    setModalData={setModalData}
                    config={config}
                />
            )}
        </div>
    )
}
