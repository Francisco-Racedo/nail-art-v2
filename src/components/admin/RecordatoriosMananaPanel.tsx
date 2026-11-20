'use client'

import React, { useState, useMemo } from 'react'
import {
    Bell,
    BellRing,
    CheckCircle2,
    Clock,
    Calendar as CalendarIcon,
    Send,
    Sparkles,
    AlertCircle,
    DollarSign,
    FileText,
    Settings2,
    Check,
    RotateCcw,
    PhoneOff,
    ArrowRight
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { notificarCambioEnTiempoReal } from '@/app/providers'
import {
    Reserva,
    ESTADO_CONFIG,
    getEstadoEfectivo,
    parseReservaMeta,
    checkCumple
} from './agendaTypes'
import {
    celularParaWhatsapp,
    calcularDesgloseReserva,
    obtenerLabelsAdicionales,
    normalizarCelular
} from '@/lib/utils'

const monthNames = [
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

const dayNamesLong = [
    'Domingo',
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado'
]

function formatearFechaLarga(fechaYYYYMMDD: string): string {
    const [y, m, d] = (fechaYYYYMMDD || '').split('-').map(Number)
    if (!y || !m || !d) return fechaYYYYMMDD
    const dt = new Date(y, m - 1, d, 12, 0, 0)
    return `${dayNamesLong[dt.getDay()]}, ${d} de ${monthNames[m - 1]}`
}

function formatearFinTurno(horaStr: string, ocupaDoble = false): string {
    const clean = (horaStr || '08:30').substring(0, 5)
    const [h, m] = clean.split(':').map(Number)
    const duracion = ocupaDoble ? 180 : 90
    const totalMin = (h || 0) * 60 + (m || 0) + duracion
    const fh = Math.floor(totalMin / 60)
    const fm = totalMin % 60
    return `${String(fh).padStart(2, '0')}:${String(fm).padStart(2, '0')} hs`
}

interface RecordatoriosMananaPanelProps {
    mananaStr: string
    reservas: Reserva[]
    config: any
    historialPorCliente: Map<
        string,
        { totalTurnos: number; completados: number; ausencias: number }
    >
    onOpenTurno: (reserva: Reserva) => void
    onIrAGrillaFecha: (fechaStr: string) => void
    onUpdateReservaLocal: (
        id: number,
        changes: Partial<Reserva>
    ) => void
}

export default function RecordatoriosMananaPanel({
    mananaStr,
    reservas,
    config,
    historialPorCliente,
    onOpenTurno,
    onIrAGrillaFecha,
    onUpdateReservaLocal
}: RecordatoriosMananaPanelProps) {
    const router = useRouter()
    const [fechaObjetivo, setFechaObjetivo] = useState<string>(mananaStr)
    const [filtroEstadoAviso, setFiltroEstadoAviso] = useState<
        'todos' | 'pendientes' | 'enviados'
    >('todos')
    const [procesandoId, setProcesandoId] = useState<number | null>(null)

    const nombreNegocio = config?.nombre_negocio || 'Pintaditas Nails'
    const direccionSalon =
        config?.cms?.footer?.direccion ||
        'Bartolomé Mitre 155, B° 25 de Mayo • Lules, Tucumán'

    // Próxima fecha futura (> mananaStr) que tenga turnos activos, útil cuando mañana es domingo o feriado sin turnos
    const proximaFechaHabilConTurnos = useMemo(() => {
        const futuras = reservas
            .filter(r => {
                if (r.fecha <= mananaStr) return false
                const ef = getEstadoEfectivo(r)
                return ef === 'pendiente' || ef === 'confirmado' || ef === 'completado'
            })
            .map(r => r.fecha)
            .sort()
        return futuras[0] || null
    }, [reservas, mananaStr])

    // Turnos activos de la fecha seleccionada (por defecto: Mañana)
    const turnosDelDia = useMemo(() => {
        return reservas
            .filter(r => {
                if (r.fecha !== fechaObjetivo) return false
                const ef = getEstadoEfectivo(r)
                return ef === 'pendiente' || ef === 'confirmado' || ef === 'completado'
            })
            .sort((a, b) => (a.horario || '').localeCompare(b.horario || ''))
    }, [reservas, fechaObjetivo])

    // Estadísticas operativas del día siguiente
    const stats = useMemo(() => {
        const total = turnosDelDia.length
        const enviados = turnosDelDia.filter(r => !!r.notificacion_enviada).length
        const pendientesAviso = total - enviados
        const ingresoEstimado = turnosDelDia.reduce(
            (acc, r) => acc + calcularDesgloseReserva(r).totalFinal,
            0
        )
        const primerHorario =
            total > 0
                ? (turnosDelDia[0].horario || '').replace(/^~/, '').substring(0, 5)
                : null
        const ultimoTurno = total > 0 ? turnosDelDia[total - 1] : null
        const ultimoMeta = ultimoTurno
            ? parseReservaMeta(ultimoTurno.mp_preference_id, ultimoTurno.id)
            : null
        const horaFinJornada = ultimoTurno
            ? formatearFinTurno(
                  (ultimoTurno.horario || '').replace(/^~/, '').substring(0, 5),
                  !!ultimoMeta?.ocupaBloqueSiguiente
              )
            : null

        return {
            total,
            enviados,
            pendientesAviso,
            ingresoEstimado,
            primerHorario,
            horaFinJornada,
            progresoPct: total > 0 ? Math.round((enviados / total) * 100) : 0
        }
    }, [turnosDelDia])

    const turnosFiltrados = useMemo(() => {
        if (filtroEstadoAviso === 'pendientes') {
            return turnosDelDia.filter(r => !r.notificacion_enviada)
        }
        if (filtroEstadoAviso === 'enviados') {
            return turnosDelDia.filter(r => !!r.notificacion_enviada)
        }
        return turnosDelDia
    }, [turnosDelDia, filtroEstadoAviso])

    const armarLinkRecordatorioWpp = (r: Reserva) => {
        if (!r.celular) return '#'
        const num = celularParaWhatsapp(r.celular)
        const meta = parseReservaMeta(r.mp_preference_id, r.id)
        const desglose = calcularDesgloseReserva(r)
        const labelsAdic = obtenerLabelsAdicionales(desglose.adicionalesIds)
        const horaLimpia = (r.horario || '').replace(/^~/, '').split('#')[0].substring(0, 5)
        const srvLimpio = (r.servicio || '').split('(')[0].trim()
        const fechaLatam = r.fecha.split('-').reverse().join('/')
        const diaSemana = formatearFechaLarga(r.fecha).split(',')[0]
        const esManana = r.fecha === mananaStr
        const origin = typeof window !== 'undefined' ? window.location.origin : ''
        const codigo = meta.codigo || `T${r.id}`
        const linkTurno = `${origin}/mi-turno/${codigo}`

        const adicTxt =
            labelsAdic.length > 0 ? `\n✨ *Adicionales:* ${labelsAdic.join(', ')}` : ''
        const descTxt =
            desglose.descuentoPct > 0
                ? `\n🎁 *Beneficio aplicado:* -${desglose.descuentoPct}% OFF`
                : ''

        const introDia = esManana
            ? `mañana *${diaSemana} ${fechaLatam}*`
            : `el día *${diaSemana} ${fechaLatam}*`

        const msg = `¡Hola *${r.nombre}*! 👋✨\nTe escribimos de *${nombreNegocio}* para recordarte tu turno programado para ${introDia} a las *${horaLimpia} hs*.\n\n💅 *Servicio:* ${srvLimpio}${adicTxt}${descTxt}\n💰 *Total estimado:* $${desglose.totalFinal.toLocaleString('es-AR')}\n📍 *Dirección:* ${direccionSalon}\n\nPodés consultar los detalles de tu reserva en tu enlace personal:\n👉 ${linkTurno}\n\n¡Te esperamos! 💖💅`

        return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
    }

    const marcarEstadoRecordatorio = async (
        r: Reserva,
        enviado: boolean,
        confirmarSiPendiente = false
    ) => {
        setProcesandoId(r.id)
        const ef = getEstadoEfectivo(r)
        const debeConfirmar = confirmarSiPendiente && ef === 'pendiente'

        // Actualización optimista instantánea
        onUpdateReservaLocal(r.id, {
            notificacion_enviada: enviado,
            ...(debeConfirmar ? { estado: 'confirmado' } : {})
        })

        try {
            const payload: Record<string, unknown> = {
                notificacion_enviada: enviado
            }
            if (debeConfirmar) {
                payload.estado = 'confirmado'
            }

            const res = await fetch(`/api/admin/reservas/${r.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) {
                throw new Error('No se pudo actualizar el estado del recordatorio')
            }

            toast.success(
                enviado
                    ? debeConfirmar
                        ? `Recordatorio enviado y turno de ${r.nombre} confirmado ✓`
                        : `Recordatorio de ${r.nombre} marcado como enviado ✓`
                    : `Recordatorio de ${r.nombre} marcado como pendiente`
            )
            router.refresh()
            notificarCambioEnTiempoReal('reservas')
        } catch {
            // Revertir en caso de error
            onUpdateReservaLocal(r.id, {
                notificacion_enviada: r.notificacion_enviada,
                estado: r.estado
            })
            toast.error('Error al actualizar el estado del recordatorio')
        } finally {
            setProcesandoId(null)
        }
    }

    const esVistaManana = fechaObjetivo === mananaStr
    const fechaObjetivoLabel = formatearFechaLarga(fechaObjetivo)

    return (
        <div className="w-full space-y-6 animate-in fade-in duration-300">
            {/* Cabecera Contextual de Día Siguiente / Selector de Próxima Jornada */}
            <div className="bg-gradient-to-br from-rose-50/90 via-amber-50/50 to-white border border-rose-200/80 rounded-3xl p-5 sm:p-6 shadow-xs">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-500 text-white shadow-2xs">
                                <BellRing className="w-3.5 h-3.5" />
                                {esVistaManana
                                    ? 'Agenda de Mañana (24 hs)'
                                    : 'Próxima Jornada con Turnos'}
                            </span>
                            <span className="text-xs font-bold text-stone-600 bg-white border border-stone-200/90 px-3 py-1 rounded-full">
                                📅 {fechaObjetivo.split('-').reverse().join('/')}
                            </span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                            {fechaObjetivoLabel}
                        </h3>
                        <p className="text-xs sm:text-sm text-stone-600 font-medium mt-0.5">
                            Revisá los turnos agendados y enviá el recordatorio por WhatsApp con 1 toque. El sistema marcará automáticamente a cada clienta avisada.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {proximaFechaHabilConTurnos &&
                            proximaFechaHabilConTurnos !== mananaStr && (
                                <div className="bg-white/90 p-1 rounded-2xl border border-stone-200/80 flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setFechaObjetivo(mananaStr)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                                            esVistaManana
                                                ? 'bg-stone-900 text-white shadow-2xs'
                                                : 'text-stone-600 hover:text-stone-900'
                                        }`}
                                    >
                                        Mañana ({mananaStr.split('-').reverse().slice(0, 2).join('/')})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setFechaObjetivo(proximaFechaHabilConTurnos)
                                        }
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                                            !esVistaManana
                                                ? 'bg-stone-900 text-white shadow-2xs'
                                                : 'text-stone-600 hover:text-stone-900'
                                        }`}
                                    >
                                        Próxima con turnos (
                                        {proximaFechaHabilConTurnos
                                            .split('-')
                                            .reverse()
                                            .slice(0, 2)
                                            .join('/')}
                                        )
                                    </button>
                                </div>
                            )}

                        <button
                            type="button"
                            onClick={() => onIrAGrillaFecha(fechaObjetivo)}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white hover:bg-stone-50 text-stone-800 border border-stone-200/90 text-xs font-bold shadow-2xs transition cursor-pointer"
                        >
                            <CalendarIcon className="w-3.5 h-3.5 text-rose-500" />
                            <span>Ver Día en la Grilla</span>
                        </button>
                    </div>
                </div>

                {/* 3 Tarjetas KPI del Día Siguiente */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-5 pt-5 border-t border-rose-200/60">
                    {/* KPI 1: Turnos y Horario de Inicio */}
                    <div className="bg-white/95 rounded-2xl p-4 border border-stone-200/80 shadow-2xs">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-rose-500" />
                                Turnos Programados
                            </span>
                            {stats.primerHorario && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                    1° turno: {stats.primerHorario} hs
                                </span>
                            )}
                        </div>
                        <p className="text-2xl sm:text-3xl font-black text-stone-900">
                            {stats.total}{' '}
                            <span className="text-sm font-bold text-stone-500">
                                {stats.total === 1 ? 'cita activa' : 'citas activas'}
                            </span>
                        </p>
                        <p className="text-[11px] text-stone-500 font-medium mt-1">
                            {stats.primerHorario && stats.horaFinJornada
                                ? `Jornada de ${stats.primerHorario} hs a ${stats.horaFinJornada}`
                                : 'Sin horarios ocupados en esta fecha'}
                        </p>
                    </div>

                    {/* KPI 2: Progreso de Recordatorios Enviados */}
                    <div className="bg-white/95 rounded-2xl p-4 border border-stone-200/80 shadow-2xs">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                                <Bell className="w-4 h-4 text-amber-500" />
                                Estado de Avisos
                            </span>
                            {stats.total > 0 && (
                                <span
                                    className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                                        stats.pendientesAviso === 0
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : 'bg-amber-50 text-amber-800 border-amber-200'
                                    }`}
                                >
                                    {stats.pendientesAviso === 0
                                        ? '¡100% Avisadas! ✓'
                                        : `Faltan ${stats.pendientesAviso}`}
                                </span>
                            )}
                        </div>
                        <p className="text-2xl sm:text-3xl font-black text-stone-900">
                            {stats.enviados}/{stats.total}{' '}
                            <span className="text-sm font-bold text-stone-500">
                                notificadas
                            </span>
                        </p>
                        <div className="w-full bg-stone-200/80 h-2 rounded-full overflow-hidden mt-2">
                            <div
                                className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${stats.progresoPct}%` }}
                            />
                        </div>
                    </div>

                    {/* KPI 3: Facturación Estimada de Mañana */}
                    <div className="bg-white/95 rounded-2xl p-4 border border-stone-200/80 shadow-2xs">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                                <DollarSign className="w-4 h-4 text-emerald-600" />
                                Ingreso Estimado
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Proyección
                            </span>
                        </div>
                        <p className="text-2xl sm:text-3xl font-black text-emerald-700">
                            ${stats.ingresoEstimado.toLocaleString('es-AR')}
                        </p>
                        <p className="text-[11px] text-stone-500 font-medium mt-1">
                            Total proyectado por servicios agendados
                        </p>
                    </div>
                </div>
            </div>

            {/* Barra de Filtro Rápido por Estado del Recordatorio */}
            {turnosDelDia.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-50 border border-stone-200/80 rounded-2xl p-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setFiltroEstadoAviso('todos')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                                filtroEstadoAviso === 'todos'
                                    ? 'bg-stone-900 text-white shadow-2xs'
                                    : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200/80'
                            }`}
                        >
                            Todos ({stats.total})
                        </button>
                        <button
                            type="button"
                            onClick={() => setFiltroEstadoAviso('pendientes')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                filtroEstadoAviso === 'pendientes'
                                    ? 'bg-amber-500 text-stone-950 shadow-2xs'
                                    : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200/80'
                            }`}
                        >
                            <span>⏳ Pendientes de Aviso ({stats.pendientesAviso})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setFiltroEstadoAviso('enviados')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                filtroEstadoAviso === 'enviados'
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200/80'
                            }`}
                        >
                            <span>✅ Recordatorio Enviado ({stats.enviados})</span>
                        </button>
                    </div>

                    <span className="text-xs text-stone-500 font-medium">
                        Ordenados cronológicamente por horario de atención
                    </span>
                </div>
            )}

            {/* Listado de Tarjetas de Turnos del Día Siguiente */}
            {turnosDelDia.length === 0 ? (
                <div className="bg-white border border-stone-200/90 rounded-3xl p-10 sm:p-12 text-center shadow-2xs">
                    <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center mx-auto mb-4">
                        <CalendarIcon className="w-8 h-8" />
                    </div>
                    <h4 className="text-lg font-black text-stone-900 mb-1">
                        No hay turnos programados para {fechaObjetivoLabel}
                    </h4>
                    <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto mb-6">
                        {esVistaManana
                            ? 'Mañana no tenés citas agendadas hasta el momento. Podés abrir la grilla de mañana para asignar un turno o revisar la próxima fecha con reservas.'
                            : 'No hay citas activas registradas en esta fecha.'}
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <button
                            type="button"
                            onClick={() => onIrAGrillaFecha(fechaObjetivo)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold shadow-sm transition cursor-pointer"
                        >
                            <CalendarIcon className="w-4 h-4" />
                            <span>Ver Grilla de {fechaObjetivo.split('-').reverse().slice(0, 2).join('/')}</span>
                        </button>

                        {esVistaManana &&
                            proximaFechaHabilConTurnos &&
                            proximaFechaHabilConTurnos !== mananaStr && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setFechaObjetivo(proximaFechaHabilConTurnos)
                                    }
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-sm transition cursor-pointer"
                                >
                                    <span>
                                        Ver Próxima Jornada con Turnos (
                                        {formatearFechaLarga(proximaFechaHabilConTurnos)})
                                    </span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            )}
                    </div>
                </div>
            ) : turnosFiltrados.length === 0 ? (
                <div className="bg-white border border-stone-200/90 rounded-3xl p-8 text-center">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm font-black text-stone-900">
                        {filtroEstadoAviso === 'pendientes'
                            ? '¡Excelente! Ya enviaste todos los recordatorios de esta jornada.'
                            : 'Todavía no hay recordatorios marcados como enviados en esta jornada.'}
                    </p>
                    <button
                        type="button"
                        onClick={() => setFiltroEstadoAviso('todos')}
                        className="mt-3 text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                        Ver todos los turnos del día ({stats.total})
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {turnosFiltrados.map((r, idx) => {
                        const ef = getEstadoEfectivo(r)
                        const estadoCfg = ESTADO_CONFIG[ef] || ESTADO_CONFIG.pendiente
                        const meta = parseReservaMeta(r.mp_preference_id, r.id)
                        const desglose = calcularDesgloseReserva(r)
                        const labelsAdicionales = obtenerLabelsAdicionales(
                            desglose.adicionalesIds
                        )
                        const horaLimpia = (r.horario || '')
                            .replace(/^~/, '')
                            .split('#')[0]
                            .substring(0, 5)
                        const horaFin = formatearFinTurno(
                            horaLimpia,
                            !!meta.ocupaBloqueSiguiente
                        )
                        const enviado = !!r.notificacion_enviada
                        const esCumple = checkCumple(r.fecha_nacimiento)
                        const histKey =
                            normalizarCelular(r.celular) ||
                            `nombre:${(r.nombre || '').toLowerCase().trim()}`
                        const hist = historialPorCliente.get(histKey)
                        const wppUrl = armarLinkRecordatorioWpp(r)

                        return (
                            <div
                                key={r.id}
                                className={`rounded-3xl border p-4 sm:p-5 transition-all shadow-2xs ${
                                    enviado
                                        ? 'bg-emerald-50/35 border-emerald-200/90'
                                        : 'bg-white border-stone-200/90 hover:border-rose-300'
                                }`}
                            >
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                    {/* Bloque Izquierdo: Horario + Datos de la Clienta y Servicio */}
                                    <div className="flex flex-col sm:flex-row items-start gap-4 min-w-0">
                                        {/* Cápsula de Horario */}
                                        <div
                                            className={`w-full sm:w-28 shrink-0 rounded-2xl p-3 text-center border flex sm:flex-col items-center justify-between sm:justify-center gap-1 ${
                                                enviado
                                                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                                                    : 'bg-stone-900 text-white border-stone-950 shadow-xs'
                                            }`}
                                        >
                                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                                                Turno #{idx + 1}
                                            </span>
                                            <span className="text-lg sm:text-xl font-black leading-none">
                                                {horaLimpia} hs
                                            </span>
                                            <span className="text-[10px] font-medium opacity-85">
                                                Hasta {horaFin}
                                            </span>
                                        </div>

                                        {/* Información de Clienta y Trabajo */}
                                        <div className="space-y-2 min-w-0 flex-1">
                                            {/* Fila de Insignias Superiores */}
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {/* Estado del Recordatorio */}
                                                {enviado ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                        Recordatorio Enviado ✓
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                                                        <Bell className="w-3.5 h-3.5 text-amber-600" />
                                                        Falta Enviar Recordatorio
                                                    </span>
                                                )}

                                                {/* Estado de la Reserva */}
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${estadoCfg.bg} ${estadoCfg.color} ${estadoCfg.border}`}
                                                >
                                                    {estadoCfg.label}
                                                </span>

                                                {meta.ocupaBloqueSiguiente && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-300">
                                                        ⏱️ Doble Bloque (3 hs)
                                                    </span>
                                                )}

                                                {hist && hist.completados > 0 && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                                                        ⭐ {hist.completados}{' '}
                                                        {hist.completados === 1
                                                            ? 'visita previa'
                                                            : 'visitas previas'}
                                                    </span>
                                                )}

                                                {esCumple && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-pink-800 border border-pink-300">
                                                        🎂 ¡Cumpleaños!
                                                    </span>
                                                )}
                                            </div>

                                            {/* Nombre y Teléfono */}
                                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                                <h4 className="text-lg font-black text-stone-900">
                                                    {r.nombre}
                                                </h4>
                                                {r.celular ? (
                                                    <span className="text-xs font-bold text-stone-600">
                                                        📱 {r.celular}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                                                        <PhoneOff className="w-3.5 h-3.5" /> Sin
                                                        WhatsApp registrado
                                                    </span>
                                                )}
                                            </div>

                                            {/* Servicio y Adicionales */}
                                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                                <span className="font-bold text-stone-800 bg-rose-50/90 border border-rose-200/80 px-3 py-1 rounded-xl flex items-center gap-1.5">
                                                    <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                                                    {(r.servicio || '').split('(')[0].trim()}
                                                </span>

                                                {labelsAdicionales.map((lbl, i) => (
                                                    <span
                                                        key={i}
                                                        className="font-semibold text-stone-700 bg-stone-100 border border-stone-200 px-2.5 py-1 rounded-xl text-[11px]"
                                                    >
                                                        + {lbl}
                                                    </span>
                                                ))}

                                                {desglose.descuentoPct > 0 && (
                                                    <span className="font-bold text-rose-700 bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-xl text-[11px]">
                                                        🎁 -{desglose.descuentoPct}% OFF
                                                    </span>
                                                )}

                                                <span className="font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                                                    ${desglose.totalFinal.toLocaleString('es-AR')}
                                                </span>
                                            </div>

                                            {/* Notas Técnicas del Turno si existen */}
                                            {meta.notasTurno && (
                                                <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-2.5 text-xs text-amber-950 flex items-start gap-2">
                                                    <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                                    <span>
                                                        <strong>Nota para el turno:</strong>{' '}
                                                        {meta.notasTurno}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Bloque Derecho: Botones de Acción (WhatsApp en 1 Toque + Marcar + Editar) */}
                                    <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center gap-2 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-stone-200/70">
                                        {r.celular ? (
                                            <a
                                                href={wppUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={() => {
                                                    marcarEstadoRecordatorio(r, true, true)
                                                }}
                                                className={`px-4 py-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition cursor-pointer ${
                                                    enviado
                                                        ? 'bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300'
                                                        : 'bg-[#25D366] hover:bg-[#20b857] text-white shadow-emerald-200/60'
                                                }`}
                                            >
                                                <Send className="w-4 h-4" />
                                                <span>
                                                    {enviado
                                                        ? 'Reenviar WhatsApp'
                                                        : 'Enviar Recordatorio WhatsApp'}
                                                </span>
                                            </a>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => onOpenTurno(r)}
                                                className="px-4 py-3 rounded-2xl text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 flex items-center justify-center gap-1.5 transition cursor-pointer"
                                            >
                                                <AlertCircle className="w-4 h-4" />
                                                <span>Cargar Celular</span>
                                            </button>
                                        )}

                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                disabled={procesandoId === r.id}
                                                onClick={() =>
                                                    marcarEstadoRecordatorio(r, !enviado, false)
                                                }
                                                title={
                                                    enviado
                                                        ? 'Volver a marcar como pendiente de aviso'
                                                        : 'Marcar manualmente como ya avisada (sin abrir WhatsApp)'
                                                }
                                                className={`flex-1 sm:flex-initial px-3.5 py-3 rounded-2xl text-xs font-bold border flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 ${
                                                    enviado
                                                        ? 'bg-white hover:bg-stone-100 text-stone-600 border-stone-200'
                                                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                                                }`}
                                            >
                                                {enviado ? (
                                                    <>
                                                        <RotateCcw className="w-3.5 h-3.5" />
                                                        <span>Desmarcar</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Check className="w-3.5 h-3.5" />
                                                        <span>Marcar Avisada</span>
                                                    </>
                                                )}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => onOpenTurno(r)}
                                                title="Abrir ficha completa del turno para editar horario, servicio o adicionales"
                                                className="px-3.5 py-3 rounded-2xl text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200/90 flex items-center justify-center gap-1.5 transition cursor-pointer"
                                            >
                                                <Settings2 className="w-3.5 h-3.5" />
                                                <span>Ficha del Turno</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
