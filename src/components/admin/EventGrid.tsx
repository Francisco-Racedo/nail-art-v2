import React from 'react'
import {
    Calendar as CalendarIcon,
    Plus,
    Lock,
    Bell,
    FileText,
    ChevronRight,
    Clock
} from 'lucide-react'
import { Reserva, ESTADO_CONFIG, checkCumple, getEstadoEfectivo } from './agendaTypes'
import { generarHorariosDisponibles, parseReservaMeta } from '@/lib/utils'

interface EventGridProps {
    dayReservas: Reserva[]
    selectedDateStr: string
    selectedDateLabel: string
    isSunday: boolean
    jornadaEspecial?: {
        fecha: string
        tipo: 'cerrado' | 'reducido'
        horarios?: string[]
        motivo?: string
    }
    config: any
    handleEventClick: (r: Reserva) => void
    onSelectFreeSlot?: (horario: string) => void
}

const parsePrecioGrilla = (str: string) => {
    const m = (str || '').match(/\$([\d.,]+)/)
    return m ? parseInt(m[1].replace(/[.,]/g, ''), 10) || 0 : 0
}

export default function EventGrid({
    dayReservas,
    selectedDateLabel,
    isSunday,
    jornadaEspecial,
    config,
    handleEventClick,
    onSelectFreeSlot
}: EventGridProps) {
    const intervalo = Number(config?.intervalo_minutos || 120)

    const calcularFin = (hora: string, dobleBloque = false) => {
        const parts = hora.split(':')
        let h = parseInt(parts[0], 10)
        let m = parseInt(parts[1], 10)
        m += dobleBloque ? intervalo * 2 : intervalo
        h += Math.floor(m / 60)
        m = m % 60
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }

    const getEventCardStyle = (estado: string) => {
        const base =
            'border-r border-t border-b border-orange-200/60 shadow-sm border-l-[6px]'
        if (estado === 'confirmado')
            return `${base} border-l-emerald-500 bg-white/95 backdrop-blur-sm`
        if (estado === 'completado')
            return `${base} border-l-rose-500 bg-white/95 backdrop-blur-sm`
        if (estado === 'reprogramar')
            return `${base} border-l-indigo-500 bg-indigo-50/40 backdrop-blur-sm`
        if (estado === 'cancelado' || estado === 'ausente')
            return `${base} border-l-stone-400 bg-stone-50/80 opacity-75`
        return `${base} border-l-amber-500 bg-white/95 backdrop-blur-sm`
    }

    const todosLosHorarios = generarHorariosDisponibles(
        config?.hora_inicio || '10:00',
        config?.hora_fin || '22:00',
        intervalo
    )

    const diaCerrado =
        jornadaEspecial?.tipo === 'cerrado' || (isSunday && !jornadaEspecial)

    const horariosGrilla = diaCerrado
        ? []
        : jornadaEspecial?.tipo === 'reducido' &&
            Array.isArray(jornadaEspecial.horarios) &&
            jornadaEspecial.horarios.length > 0
          ? jornadaEspecial.horarios
          : todosLosHorarios

    // Detectar si un turno anterior tiene ocupaBloqueSiguiente
    const bloqueadosPorTurnoLargo = new Map<string, Reserva>()
    for (const r of dayReservas) {
        const ef = getEstadoEfectivo(r)
        if (ef === 'cancelado' || ef === 'reprogramar') continue
        const meta = parseReservaMeta(r.mp_preference_id, r.id)
        if (meta.ocupaBloqueSiguiente) {
            const hNorm = (r.horario || '')
                .replace(/^~/, '')
                .split('#')[0]
                .substring(0, 5)
            const idx = todosLosHorarios.indexOf(hNorm)
            if (idx >= 0 && idx + 1 < todosLosHorarios.length) {
                bloqueadosPorTurnoLargo.set(todosLosHorarios[idx + 1], r)
            }
        }
    }

    // Construir lista combinada: todos los bloques de 2 hs del día + cualquier turno en horario personalizado
    const horasSet = new Set<string>(horariosGrilla)
    for (const r of dayReservas) {
        const hClean = (r.horario || '')
            .replace(/^~/, '')
            .split('#')[0]
            .substring(0, 5)
        if (hClean) horasSet.add(hClean)
    }
    const listaHorasOrdenada = Array.from(horasSet).sort()

    return (
        <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h3 className="text-xl font-black text-stone-900 capitalize">
                        Grilla Horaria del Día
                    </h3>
                    <p className="text-stone-500 font-medium text-sm capitalize">
                        {selectedDateLabel} • Bloques de {intervalo / 60} hs (Hora Argentina)
                    </p>
                </div>
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                    {dayReservas.length}{' '}
                    {dayReservas.length === 1 ? 'reserva' : 'reservas'} en esta fecha
                </span>
            </div>

            {diaCerrado && dayReservas.length === 0 ? (
                <div className="bg-stone-50 border border-stone-200 rounded-3xl p-10 text-center flex flex-col items-center justify-center min-h-[220px]">
                    <CalendarIcon className="w-10 h-10 text-stone-300 mb-3" />
                    <p className="text-stone-700 font-bold text-base mb-1">
                        {jornadaEspecial?.motivo || 'Domingo — Día de descanso'}
                    </p>
                    <p className="text-stone-500 font-medium text-xs">
                        Este día se encuentra cerrado. Si trabajás de forma especial, podés
                        habilitar turnos desde el botón &ldquo;Imprevisto / Feriado&rdquo;.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {listaHorasOrdenada.map(hSlot => {
                        const finCalc = calcularFin(hSlot)

                        // Buscar si hay reserva(s) en este bloque
                        const reservasEnBloque = dayReservas.filter(r => {
                            const hClean = (r.horario || '')
                                .replace(/^~/, '')
                                .split('#')[0]
                                .substring(0, 5)
                            return hClean === hSlot
                        })

                        const extendidoDe = bloqueadosPorTurnoLargo.get(hSlot)

                        // Si hay reservas en este horario, renderizar sus tarjetas
                        if (reservasEnBloque.length > 0) {
                            return reservasEnBloque.map(reserva => {
                                const estadoReal = getEstadoEfectivo(reserva)
                                const dynamicStyle = getEventCardStyle(estadoReal)
                                const esCumple = checkCumple(reserva.fecha_nacimiento)
                                const estadoCfg =
                                    ESTADO_CONFIG[estadoReal] || ESTADO_CONFIG.pendiente
                                const meta = parseReservaMeta(
                                    reserva.mp_preference_id,
                                    reserva.id
                                )
                                const finReal = calcularFin(
                                    hSlot,
                                    !!meta.ocupaBloqueSiguiente
                                )
                                const precioBase =
                                    meta.precioPersonalizado !== undefined &&
                                    meta.precioPersonalizado >= 0
                                        ? meta.precioPersonalizado
                                        : parsePrecioGrilla(reserva.servicio)
                                const desc = Number(reserva.descuento_aplicado) || 0
                                const precioFinal = Math.max(
                                    0,
                                    Math.round(precioBase * (1 - desc / 100))
                                )
                                const diasService = meta.diasRecordatorioService || 18

                                return (
                                    <button
                                        key={reserva.id}
                                        type="button"
                                        onClick={() => handleEventClick(reserva)}
                                        className={`flex w-full ${dynamicStyle} rounded-xl p-0 text-left transition-all duration-200 hover:bg-rose-50/70 hover:border-rose-300 group overflow-hidden max-w-full shadow-sm cursor-pointer`}
                                    >
                                        <div className="w-[100px] md:w-36 shrink-0 border-r border-stone-200 bg-stone-50/70 p-3 md:p-4 flex flex-col justify-center">
                                            <span className="text-stone-900 font-black text-xs md:text-base leading-tight flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5 text-rose-500 hidden sm:inline" />
                                                {hSlot} hs
                                            </span>
                                            <span className="text-stone-500 text-[10px] md:text-xs font-semibold mt-0.5">
                                                {hSlot} a {finReal}
                                            </span>
                                        </div>

                                        <div className="p-3 md:p-4 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white min-w-0">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-1">
                                                    <span className="text-stone-900 font-black text-sm md:text-base tracking-tight truncate max-w-full">
                                                        {reserva.nombre}
                                                    </span>
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 ${estadoCfg.bg} ${estadoCfg.color} ${estadoCfg.border}`}
                                                    >
                                                        {estadoCfg.label}
                                                    </span>
                                                    {precioFinal > 0 && (
                                                        <span className="bg-amber-50 text-amber-900 border border-amber-200 text-[11px] px-2 py-0.5 rounded-full font-black shrink-0">
                                                            ${precioFinal.toLocaleString('es-AR')}
                                                        </span>
                                                    )}
                                                    {reserva.reprogramado && (
                                                        <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded font-bold shrink-0">
                                                            🔄 REPROGRAMADO
                                                        </span>
                                                    )}
                                                    {esCumple && (
                                                        <span
                                                            title="¡Cumpleaños en la semana!"
                                                            className="bg-rose-100 text-rose-700 text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0"
                                                        >
                                                            🎂 Cumple
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center flex-wrap gap-2 mt-0.5">
                                                    <span className="text-stone-600 text-xs md:text-sm font-semibold flex items-center gap-1 truncate max-w-full">
                                                        <CalendarIcon className="w-3.5 h-3.5 shrink-0 text-pink-500" />
                                                        <span className="truncate">
                                                            {reserva.servicio.split('(')[0].trim()}
                                                        </span>
                                                    </span>
                                                    {meta.adicionalesSeleccionados &&
                                                        meta.adicionalesSeleccionados.length >
                                                            0 && (
                                                            <span className="bg-pink-50 text-pink-700 border border-pink-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                                                +{meta.adicionalesSeleccionados.length}{' '}
                                                                adicional
                                                                {meta.adicionalesSeleccionados
                                                                    .length > 1
                                                                    ? 'es'
                                                                    : ''}
                                                            </span>
                                                        )}
                                                    {(reserva.descuento_aplicado || 0) > 0 && (
                                                        <span className="bg-rose-50 text-rose-600 border border-rose-200 text-[10px] px-2 py-0.5 rounded font-bold">
                                                            🎁 -{reserva.descuento_aplicado}%
                                                        </span>
                                                    )}
                                                    <span className="bg-indigo-50/90 text-indigo-700 border border-indigo-200 text-[10px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                                                        <Bell className="w-2.5 h-2.5" />
                                                        Service: {diasService} d
                                                    </span>
                                                    {meta.notasTurno && (
                                                        <span className="bg-stone-100 text-stone-600 text-[10px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 max-w-[200px] truncate">
                                                            <FileText className="w-2.5 h-2.5 shrink-0" />
                                                            {meta.notasTurno}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 group-hover:bg-rose-500 group-hover:text-white border border-rose-200 group-hover:border-rose-500 px-3 py-2 rounded-xl transition-all self-start sm:self-center">
                                                <span>Ver / Editar Turno</span>
                                                <ChevronRight className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </button>
                                )
                            })
                        }

                        // Si el bloque está ocupado por extensión de un servicio largo del turno anterior
                        if (extendidoDe) {
                            return (
                                <div
                                    key={`ext-${hSlot}`}
                                    onClick={() => handleEventClick(extendidoDe)}
                                    className="flex w-full border border-stone-200 border-l-[6px] border-l-stone-400 bg-stone-50/90 rounded-xl p-0 text-left cursor-pointer hover:bg-stone-100 transition overflow-hidden"
                                >
                                    <div className="w-[100px] md:w-36 shrink-0 border-r border-stone-200 bg-stone-100/70 p-3 md:p-4 flex flex-col justify-center">
                                        <span className="text-stone-700 font-bold text-xs md:text-base leading-tight">
                                            {hSlot} hs
                                        </span>
                                        <span className="text-stone-400 text-[10px] md:text-xs font-medium mt-0.5">
                                            {hSlot} a {finCalc}
                                        </span>
                                    </div>
                                    <div className="p-3 md:p-4 flex-1 flex items-center justify-between gap-2">
                                        <span className="text-xs font-bold text-stone-600 flex items-center gap-1.5">
                                            <Lock className="w-3.5 h-3.5 text-stone-400" />
                                            Continuación de servicio largo ({extendidoDe.nombre})
                                        </span>
                                    </div>
                                </div>
                            )
                        }

                        // Bloque de 2 hs DISPONIBLE (Libre)
                        return (
                            <div
                                key={`free-${hSlot}`}
                                className="flex w-full border border-dashed border-emerald-300/90 border-l-[6px] border-l-emerald-400 bg-emerald-50/35 hover:bg-emerald-50/70 rounded-xl p-0 transition-all overflow-hidden"
                            >
                                <div className="w-[100px] md:w-36 shrink-0 border-r border-emerald-200/70 bg-emerald-50/60 p-3 md:p-4 flex flex-col justify-center">
                                    <span className="text-emerald-900 font-bold text-xs md:text-base leading-tight">
                                        {hSlot} hs
                                    </span>
                                    <span className="text-emerald-700/80 text-[10px] md:text-xs font-medium mt-0.5">
                                        {hSlot} a {finCalc}
                                    </span>
                                </div>
                                <div className="p-3 md:p-4 flex-1 flex items-center justify-between gap-3">
                                    <div>
                                        <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-800">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                            Horario Disponible
                                        </span>
                                        <p className="text-[11px] text-stone-500 hidden sm:block">
                                            Bloque libre de 2 horas para reserva online o
                                            asignación manual
                                        </p>
                                    </div>
                                    {onSelectFreeSlot && (
                                        <button
                                            type="button"
                                            onClick={() => onSelectFreeSlot(hSlot)}
                                            className="bg-white hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-300 text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Asignar turno
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </>
    )
}
