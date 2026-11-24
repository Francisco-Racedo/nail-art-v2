'use client'

import React, { useState, useMemo } from 'react'
import {
    Calendar as CalendarIcon,
    Clock,
    CheckCircle2,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    Sun,
    Moon,
    FileText,
    ArrowRight,
    Filter,
    PhoneOff,
    Layers,
    CalendarDays
} from 'lucide-react'
import {
    Reserva,
    ESTADO_CONFIG,
    EstadoReserva,
    formatDateStr,
    getEstadoEfectivo,
    parseReservaMeta,
    checkCumple,
    getHoyUTC3
} from './agendaTypes'
import {
    generarHorariosDisponibles,
    HORARIOS_DOMINGO_DICIEMBRE,
    HORARIO_NOCTURNO_EXTRA,
    obtenerLabelsAdicionales,
    normalizarCelular,
    getAhoraArgentina
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

const dayNamesShort = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const dayNamesLong = [
    'Domingo',
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado'
]

type ModoPeriodo = 'semana' | 'quincena' | 'mes'
type FiltroTurnos = 'todos' | 'pendientes' | 'confirmados' | 'sin_recordatorio'

interface PanoramaTurnosPanelProps {
    reservas: Reserva[]
    config: any
    localJornadas: any[]
    historialPorCliente: Map<
        string,
        { totalTurnos: number; completados: number; ausencias: number }
    >
    onOpenTurno: (reserva: Reserva) => void
    onIrAGrillaFecha: (fechaStr: string) => void
}

function parseFechaLocal(fechaStr: string): Date {
    const [y, m, d] = (fechaStr || '').split('-').map(Number)
    return new Date(y || 2026, (m || 1) - 1, d || 1, 12, 0, 0)
}

function obtenerLunesDeSemana(base: Date): Date {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 12, 0, 0)
    const day = d.getDay() // 0 = Domingo, 1 = Lunes...
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    return d
}

function generarRangoFechas(inicio: Date, fin: Date): string[] {
    const out: string[] = []
    const cur = new Date(
        inicio.getFullYear(),
        inicio.getMonth(),
        inicio.getDate(),
        12,
        0,
        0
    )
    const end = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate(), 12, 0, 0)
    while (cur <= end) {
        out.push(formatDateStr(cur))
        cur.setDate(cur.getDate() + 1)
    }
    return out
}

export default function PanoramaTurnosPanel({
    reservas,
    config,
    localJornadas,
    historialPorCliente,
    onOpenTurno,
    onIrAGrillaFecha
}: PanoramaTurnosPanelProps) {
    const hoyStr = useMemo(() => getHoyUTC3(), [])
    const mananaStr = useMemo(() => {
        const now = getAhoraArgentina()
        const t = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1,
            12,
            0,
            0
        )
        return formatDateStr(t)
    }, [])

    const [modoPeriodo, setModoPeriodo] = useState<ModoPeriodo>('semana')
    const [cursorFecha, setCursorFecha] = useState<Date>(() => getAhoraArgentina())
    const [mostrarDiasVacios, setMostrarDiasVacios] = useState<boolean>(true)
    const [filtroTurnos, setFiltroTurnos] = useState<FiltroTurnos>('todos')
    const [diaFoco, setDiaFoco] = useState<string | null>(null)

    // Navegación del período (Semana / Quincena / Mes)
    const navegarPeriodo = (direccion: -1 | 0 | 1) => {
        setDiaFoco(null)
        if (direccion === 0) {
            setCursorFecha(getAhoraArgentina())
            return
        }
        setCursorFecha(prev => {
            const d = new Date(
                prev.getFullYear(),
                prev.getMonth(),
                prev.getDate(),
                12,
                0,
                0
            )
            if (modoPeriodo === 'semana') {
                d.setDate(d.getDate() + direccion * 7)
                return d
            }
            if (modoPeriodo === 'quincena') {
                // Saltar entre 1ª quincena (1-15) y 2ª quincena (16-fin de mes)
                const esPrimera = d.getDate() <= 15
                if (direccion === 1) {
                    return esPrimera
                        ? new Date(d.getFullYear(), d.getMonth(), 16, 12, 0, 0)
                        : new Date(d.getFullYear(), d.getMonth() + 1, 1, 12, 0, 0)
                } else {
                    return esPrimera
                        ? new Date(d.getFullYear(), d.getMonth() - 1, 16, 12, 0, 0)
                        : new Date(d.getFullYear(), d.getMonth(), 1, 12, 0, 0)
                }
            }
            // Mes
            return new Date(d.getFullYear(), d.getMonth() + direccion, 1, 12, 0, 0)
        })
    }

    // Cálculo de fechas de inicio, fin y título del período seleccionado
    const infoPeriodo = useMemo(() => {
        if (modoPeriodo === 'semana') {
            const lunes = obtenerLunesDeSemana(cursorFecha)
            const domingo = new Date(
                lunes.getFullYear(),
                lunes.getMonth(),
                lunes.getDate() + 6,
                12,
                0,
                0
            )
            const fechas = generarRangoFechas(lunes, domingo)
            const mismoMes = lunes.getMonth() === domingo.getMonth()
            const titulo = mismoMes
                ? `Semana del ${lunes.getDate()} al ${domingo.getDate()} de ${monthNames[lunes.getMonth()]}`
                : `Semana del ${lunes.getDate()} de ${monthNames[lunes.getMonth()]} al ${domingo.getDate()} de ${monthNames[domingo.getMonth()]}`
            return {
                fechas,
                titulo,
                subtitulo: 'Lunes a Domingo (incluye domingos habilitados o con reservas)'
            }
        }

        if (modoPeriodo === 'quincena') {
            const y = cursorFecha.getFullYear()
            const m = cursorFecha.getMonth()
            const esPrimera = cursorFecha.getDate() <= 15
            const inicio = new Date(y, m, esPrimera ? 1 : 16, 12, 0, 0)
            const fin = esPrimera
                ? new Date(y, m, 15, 12, 0, 0)
                : new Date(y, m + 1, 0, 12, 0, 0)
            const fechas = generarRangoFechas(inicio, fin)
            return {
                fechas,
                titulo: `${esPrimera ? '1ª Quincena' : '2ª Quincena'} de ${monthNames[m]} (${inicio.getDate()} al ${fin.getDate()})`,
                subtitulo: `${fechas.length} días del período quincenal`
            }
        }

        // Mes completo
        const y = cursorFecha.getFullYear()
        const m = cursorFecha.getMonth()
        const inicio = new Date(y, m, 1, 12, 0, 0)
        const fin = new Date(y, m + 1, 0, 12, 0, 0)
        const fechas = generarRangoFechas(inicio, fin)
        return {
            fechas,
            titulo: `Mes de ${monthNames[m]} ${y}`,
            subtitulo: `Panorama mensual completo (${fechas.length} días)`
        }
    }, [modoPeriodo, cursorFecha])

    // Procesar cada día del período contemplando Domingos habilitados, jornadas especiales y turnos reservados
    const diasAnalizados = useMemo(() => {
        const fechasNocturno: string[] = Array.isArray(config?.fechas_nocturno_habilitado)
            ? config.fechas_nocturno_habilitado
            : []
        const fechasDomingoExtra: string[] = Array.isArray(config?.fechas_domingo_habilitado)
            ? config.fechas_domingo_habilitado
            : []
        const listaJornadas: any[] = Array.isArray(localJornadas) ? localJornadas : []

        const horariosHabitualesBase = generarHorariosDisponibles(
            config?.hora_inicio || '08:30',
            config?.hora_fin || '20:00',
            config?.intervalo_minutos || 90
        )

        // Indexar reservas por fecha
        const reservasPorFecha = new Map<string, Reserva[]>()
        for (const r of reservas) {
            if (!r.fecha) continue
            const arr = reservasPorFecha.get(r.fecha) || []
            arr.push(r)
            reservasPorFecha.set(r.fecha, arr)
        }

        return infoPeriodo.fechas.map(fechaStr => {
            const dt = parseFechaLocal(fechaStr)
            const dayOfWeek = dt.getDay() // 0 = Domingo
            const isSunday = dayOfWeek === 0
            const isSundayDec = isSunday && dt.getMonth() === 11
            const tieneNocturno = fechasNocturno.includes(fechaStr)
            const tieneDomingoHabilitado = fechasDomingoExtra.includes(fechaStr)
            const jornada = listaJornadas.find((j: any) => j.fecha === fechaStr)

            // Determinar bloques horarios habilitados para este día
            let horariosHabilitados: string[] = []
            let cerradoConfig = false
            let etiquetaJornada = '🟢 Horario Habitual'
            let tipoJornada: 'habitual' | 'especial' | 'domingo_activo' | 'cerrado' =
                'habitual'

            if (jornada?.tipo === 'cerrado') {
                horariosHabilitados = []
                cerradoConfig = true
                etiquetaJornada = jornada.motivo
                    ? `🔴 Cerrado (${jornada.motivo})`
                    : '🔴 Día Cerrado'
                tipoJornada = 'cerrado'
            } else if (jornada?.tipo === 'reducido') {
                const hs = Array.isArray(jornada.horarios) ? [...jornada.horarios] : []
                if (hs.length === 0) {
                    horariosHabilitados = []
                    cerradoConfig = true
                    etiquetaJornada = jornada.motivo
                        ? `🔴 Cerrado (${jornada.motivo})`
                        : '🔴 Cerrado'
                    tipoJornada = 'cerrado'
                } else {
                    if (tieneNocturno && !hs.includes(HORARIO_NOCTURNO_EXTRA)) {
                        hs.push(HORARIO_NOCTURNO_EXTRA)
                    }
                    horariosHabilitados = hs.sort()
                    cerradoConfig = false
                    if (isSunday) {
                        etiquetaJornada = `☀️ Domingo Habilitado (${horariosHabilitados.length} turnos)`
                        tipoJornada = 'domingo_activo'
                    } else {
                        etiquetaJornada = `⚡ Horario Especial (${horariosHabilitados.length} turnos)`
                        tipoJornada = 'especial'
                    }
                }
            } else if (isSunday) {
                if (isSundayDec || tieneDomingoHabilitado) {
                    const hs = [...HORARIOS_DOMINGO_DICIEMBRE]
                    if (tieneNocturno && !hs.includes(HORARIO_NOCTURNO_EXTRA)) {
                        hs.push(HORARIO_NOCTURNO_EXTRA)
                    }
                    horariosHabilitados = hs.sort()
                    cerradoConfig = false
                    etiquetaJornada = `☀️ Domingo Habilitado (${horariosHabilitados.length} turnos)`
                    tipoJornada = 'domingo_activo'
                } else {
                    horariosHabilitados = []
                    cerradoConfig = true
                    etiquetaJornada = '⚪ Domingo (Cerrado)'
                    tipoJornada = 'cerrado'
                }
            } else {
                const hs = [...horariosHabitualesBase]
                if (tieneNocturno && !hs.includes(HORARIO_NOCTURNO_EXTRA)) {
                    hs.push(HORARIO_NOCTURNO_EXTRA)
                }
                horariosHabilitados = hs.sort()
                cerradoConfig = false
                etiquetaJornada = tieneNocturno
                    ? '🌙 Habitual + Nocturno (21 hs)'
                    : '🟢 Horario Habitual'
                tipoJornada = 'habitual'
            }

            // Obtener los turnos del día (excluyendo cancelados/rechazados/ausentes del conteo de ocupación activa)
            const todasDelDia = (reservasPorFecha.get(fechaStr) || []).slice().sort((a, b) =>
                (a.horario || '').localeCompare(b.horario || '')
            )

            const turnosActivos = todasDelDia.filter(r => {
                const ef = getEstadoEfectivo(r)
                return (
                    ef === 'pendiente' ||
                    ef === 'confirmado' ||
                    ef === 'completado' ||
                    ef === 'reprogramar'
                )
            })

            // Si un domingo o día cerrado tiene turnos reservados, siempre se marca como activo/visible
            if (cerradoConfig && turnosActivos.length > 0) {
                if (isSunday) {
                    etiquetaJornada = `☀️ Domingo con Turnos (${turnosActivos.length})`
                    tipoJornada = 'domingo_activo'
                } else {
                    etiquetaJornada = `⚡ Día con Turnos Agendados (${turnosActivos.length})`
                    tipoJornada = 'especial'
                }
            }

            // Calcular qué bloques están ocupados en la grilla y cuáles siguen libres
            const bloquesOcupados = new Set<string>()
            for (const r of turnosActivos) {
                const ef = getEstadoEfectivo(r)
                if (ef === 'reprogramar') continue
                const hLimpia = (r.horario || '')
                    .replace(/^~/, '')
                    .split('#')[0]
                    .substring(0, 5)
                if (hLimpia) bloquesOcupados.add(hLimpia)

                const meta = parseReservaMeta(r.mp_preference_id, r.id)
                if (meta.ocupaBloqueSiguiente) {
                    const idx = horariosHabilitados.indexOf(hLimpia)
                    if (idx !== -1 && idx + 1 < horariosHabilitados.length) {
                        bloquesOcupados.add(horariosHabilitados[idx + 1])
                    }
                }
            }

            const horariosLibres = horariosHabilitados.filter(
                h => !bloquesOcupados.has(h)
            )

            const esDiaHabilOConTurnos = !cerradoConfig || turnosActivos.length > 0

            return {
                fechaStr,
                dt,
                dayOfWeek,
                isSunday,
                nombreDiaCorto: dayNamesShort[dayOfWeek],
                nombreDiaLargo: dayNamesLong[dayOfWeek],
                numeroDia: dt.getDate(),
                nombreMes: monthNames[dt.getMonth()],
                esHoy: fechaStr === hoyStr,
                esManana: fechaStr === mananaStr,
                cerradoConfig,
                esDiaHabilOConTurnos,
                etiquetaJornada,
                tipoJornada,
                horariosHabilitados,
                horariosLibres,
                turnosActivos
            }
        })
    }, [infoPeriodo.fechas, reservas, config, localJornadas, hoyStr, mananaStr])

    // Resumen operativo del período (sin datos financieros)
    const resumenPeriodo = useMemo(() => {
        let totalTurnos = 0
        let confirmados = 0
        let pendientes = 0
        let completados = 0
        let aReprogramar = 0
        let recordatoriosEnviados = 0
        let recordatoriosPendientes = 0
        let totalHorariosLibres = 0
        let totalCapacidadBloques = 0
        let diasActivosCount = 0
        let domingosActivosCount = 0
        let cumpleanosCount = 0
        let fidelidad12Count = 0

        for (const d of diasAnalizados) {
            if (d.esDiaHabilOConTurnos) {
                diasActivosCount += 1
                if (d.isSunday) domingosActivosCount += 1
                totalHorariosLibres += d.horariosLibres.length
                totalCapacidadBloques += Math.max(
                    d.horariosHabilitados.length,
                    d.turnosActivos.length
                )
            }

            for (const r of d.turnosActivos) {
                totalTurnos += 1
                const ef = getEstadoEfectivo(r)
                if (ef === 'confirmado') confirmados += 1
                else if (ef === 'pendiente') pendientes += 1
                else if (ef === 'completado') completados += 1
                else if (ef === 'reprogramar') aReprogramar += 1

                if (r.notificacion_enviada) recordatoriosEnviados += 1
                else if (ef === 'pendiente' || ef === 'confirmado') {
                    recordatoriosPendientes += 1
                }

                if (checkCumple(r.fecha_nacimiento)) cumpleanosCount += 1
                const key =
                    normalizarCelular(r.celular) ||
                    `nombre:${(r.nombre || '').toLowerCase().trim()}`
                const hist = historialPorCliente.get(key)
                if (hist && hist.completados >= 11) fidelidad12Count += 1
            }
        }

        const porcentajeOcupacion =
            totalCapacidadBloques > 0
                ? Math.min(100, Math.round((totalTurnos / totalCapacidadBloques) * 100))
                : 0

        return {
            totalTurnos,
            confirmados,
            pendientes,
            completados,
            aReprogramar,
            recordatoriosEnviados,
            recordatoriosPendientes,
            totalHorariosLibres,
            totalCapacidadBloques,
            porcentajeOcupacion,
            diasActivosCount,
            domingosActivosCount,
            cumpleanosCount,
            fidelidad12Count
        }
    }, [diasAnalizados, historialPorCliente])

    // Filtrar días y turnos según los controles seleccionados por la dueña
    const diasVisibles = useMemo(() => {
        return diasAnalizados
            .filter(d => {
                if (diaFoco) return d.fechaStr === diaFoco
                // Si tiene turnos reservados (incluso si es domingo), siempre mostrarlo
                if (d.turnosActivos.length > 0) return true
                // Si no tiene turnos reservados, mostrar solo si la dueña activó "Ver días libres" y el día está habilitado
                return mostrarDiasVacios && d.esDiaHabilOConTurnos
            })
            .map(d => {
                const turnosFiltrados = d.turnosActivos.filter(r => {
                    const ef = getEstadoEfectivo(r)
                    if (filtroTurnos === 'pendientes') return ef === 'pendiente'
                    if (filtroTurnos === 'confirmados') return ef === 'confirmado'
                    if (filtroTurnos === 'sin_recordatorio') {
                        return (
                            !r.notificacion_enviada &&
                            (ef === 'pendiente' || ef === 'confirmado')
                        )
                    }
                    return true
                })
                return {
                    ...d,
                    turnosFiltrados
                }
            })
            .filter(d => {
                if (diaFoco) return true
                if (filtroTurnos !== 'todos') return d.turnosFiltrados.length > 0
                return true
            })
    }, [diasAnalizados, diaFoco, mostrarDiasVacios, filtroTurnos])

    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            {/* 1. CABECERA Y SELECTOR DE PERÍODO (SEMANA / QUINCENA / MES) */}
            <div className="bg-gradient-to-br from-rose-50/90 via-amber-50/40 to-white border border-rose-200/80 rounded-3xl p-4 sm:p-6 shadow-xs">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-rose-200/60">
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                                <CalendarDays className="w-3.5 h-3.5" />
                                Panorama General de Agenda
                            </span>
                            {resumenPeriodo.domingosActivosCount > 0 && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                    <Sun className="w-3.5 h-3.5 text-amber-600" />
                                    {resumenPeriodo.domingosActivosCount}{' '}
                                    {resumenPeriodo.domingosActivosCount === 1
                                        ? 'domingo activo'
                                        : 'domingos activos'}
                                </span>
                            )}
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                            {infoPeriodo.titulo}
                        </h3>
                        <p className="text-xs text-stone-500 font-medium mt-0.5">
                            {infoPeriodo.subtitulo}
                        </p>
                    </div>

                    {/* Controles de Horizonte (Semana / Quincena / Mes) y Navegación */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex bg-stone-100 p-1 rounded-2xl border border-stone-200/80">
                            {(
                                [
                                    { id: 'semana', label: 'Semana' },
                                    { id: 'quincena', label: 'Quincena' },
                                    { id: 'mes', label: 'Mes' }
                                ] as { id: ModoPeriodo; label: string }[]
                            ).map(tab => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => {
                                        setModoPeriodo(tab.id)
                                        setDiaFoco(null)
                                    }}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                                        modoPeriodo === tab.id
                                            ? 'bg-stone-900 text-white shadow-2xs'
                                            : 'text-stone-600 hover:text-stone-900'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="inline-flex items-center gap-1 bg-white border border-stone-200 rounded-2xl p-1 shadow-2xs">
                            <button
                                type="button"
                                onClick={() => navegarPeriodo(-1)}
                                title="Período anterior"
                                className="p-2 rounded-xl hover:bg-stone-100 text-stone-700 transition cursor-pointer"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => navegarPeriodo(0)}
                                className="px-3 py-1.5 rounded-xl text-xs font-black text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                            >
                                Actual
                            </button>
                            <button
                                type="button"
                                onClick={() => navegarPeriodo(1)}
                                title="Período siguiente"
                                className="p-2 rounded-xl hover:bg-stone-100 text-stone-700 transition cursor-pointer"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* 2. TRES INDICADORES OPERATIVOS DE TURNOS (SIN DATOS FINANCIEROS) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-4">
                    {/* KPI 1: Ocupación y Bloques Libres */}
                    <div className="bg-white/95 border border-stone-200/80 rounded-2xl p-4 shadow-2xs flex flex-col justify-between gap-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black uppercase tracking-wider text-stone-400">
                                1. Ocupación del Período
                            </span>
                            <span className="text-xs font-black text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                                {resumenPeriodo.porcentajeOcupacion}% ocupado
                            </span>
                        </div>
                        <div className="flex items-baseline justify-between gap-2">
                            <div>
                                <span className="text-2xl font-black text-stone-900">
                                    {resumenPeriodo.totalTurnos}
                                </span>
                                <span className="text-xs font-bold text-stone-500 ml-1.5">
                                    {resumenPeriodo.totalTurnos === 1
                                        ? 'turno reservado'
                                        : 'turnos reservados'}
                                </span>
                            </div>
                            <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                                {resumenPeriodo.totalHorariosLibres} libres
                            </span>
                        </div>
                        <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-300"
                                style={{ width: `${resumenPeriodo.porcentajeOcupacion}%` }}
                            />
                        </div>
                        <span className="text-[11px] text-stone-500 font-medium">
                            En {resumenPeriodo.diasActivosCount} días de atención habilitados
                        </span>
                    </div>

                    {/* KPI 2: Estado de los Turnos */}
                    <div className="bg-white/95 border border-stone-200/80 rounded-2xl p-4 shadow-2xs flex flex-col justify-between gap-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-stone-400">
                            2. Estado de los Turnos
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl px-2.5 py-1.5 flex items-center justify-between">
                                <span className="text-[11px] font-bold text-emerald-900">
                                    🟢 Confirmados
                                </span>
                                <span className="text-sm font-black text-emerald-800">
                                    {resumenPeriodo.confirmados}
                                </span>
                            </div>
                            <div className="bg-amber-50/80 border border-amber-200 rounded-xl px-2.5 py-1.5 flex items-center justify-between">
                                <span className="text-[11px] font-bold text-amber-900">
                                    🟡 Pendientes
                                </span>
                                <span className="text-sm font-black text-amber-800">
                                    {resumenPeriodo.pendientes}
                                </span>
                            </div>
                            <div className="bg-rose-50/80 border border-rose-200 rounded-xl px-2.5 py-1.5 flex items-center justify-between">
                                <span className="text-[11px] font-bold text-rose-900">
                                    💖 Completados
                                </span>
                                <span className="text-sm font-black text-rose-800">
                                    {resumenPeriodo.completados}
                                </span>
                            </div>
                            <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl px-2.5 py-1.5 flex items-center justify-between">
                                <span className="text-[11px] font-bold text-indigo-900">
                                    🟣 Reprogramar
                                </span>
                                <span className="text-sm font-black text-indigo-800">
                                    {resumenPeriodo.aReprogramar}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* KPI 3: Control de Recordatorios y Atención Especial */}
                    <div className="bg-white/95 border border-stone-200/80 rounded-2xl p-4 shadow-2xs flex flex-col justify-between gap-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-stone-400">
                            3. Recordatorios & Alertas
                        </span>
                        <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-xl">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                {resumenPeriodo.recordatoriosEnviados} avisadas
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-xl">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                {resumenPeriodo.recordatoriosPendientes} por avisar
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-stone-100">
                            {resumenPeriodo.cumpleanosCount > 0 ? (
                                <span className="text-[11px] font-bold bg-pink-50 text-pink-700 border border-pink-200 px-2.5 py-0.5 rounded-full">
                                    🎂 {resumenPeriodo.cumpleanosCount} cumpleañera(s)
                                </span>
                            ) : (
                                <span className="text-[11px] text-stone-400">
                                    Sin cumpleaños en estos turnos
                                </span>
                            )}
                            {resumenPeriodo.fidelidad12Count > 0 && (
                                <span className="text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full">
                                    🏆 {resumenPeriodo.fidelidad12Count} con 12° servicio
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. TIRA RÁPIDA DE DÍAS DEL PERÍODO (TERMÓMETRO DE OCUPACIÓN) */}
                <div className="mt-4 pt-3.5 border-t border-rose-200/60">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-stone-500">
                            Mapa rápido día por día (tocá un día para filtrar):
                        </span>
                        {diaFoco && (
                            <button
                                type="button"
                                onClick={() => setDiaFoco(null)}
                                className="text-xs font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
                            >
                                Ver todos los días del período
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1.5">
                        {diasAnalizados.map(d => {
                            const seleccionado = diaFoco === d.fechaStr
                            const cant = d.turnosActivos.length
                            const esDomingoActivo = d.isSunday && d.esDiaHabilOConTurnos

                            let cardCls =
                                'bg-white text-stone-700 border-stone-200 hover:border-rose-300'
                            if (seleccionado) {
                                cardCls =
                                    'bg-stone-900 text-white border-stone-900 shadow-sm ring-2 ring-rose-300'
                            } else if (!d.esDiaHabilOConTurnos && cant === 0) {
                                cardCls =
                                    'bg-stone-100/70 text-stone-400 border-stone-200/60 opacity-65'
                            } else if (cant > 0 && d.horariosLibres.length === 0) {
                                cardCls =
                                    'bg-rose-50 text-rose-900 border-rose-300 font-bold'
                            } else if (cant > 0) {
                                cardCls =
                                    'bg-emerald-50/70 text-emerald-950 border-emerald-200'
                            }

                            return (
                                <button
                                    key={d.fechaStr}
                                    type="button"
                                    onClick={() =>
                                        setDiaFoco(prev =>
                                            prev === d.fechaStr ? null : d.fechaStr
                                        )
                                    }
                                    className={`min-w-[82px] px-2.5 py-2 rounded-2xl border text-center transition shrink-0 flex flex-col items-center gap-0.5 cursor-pointer ${cardCls}`}
                                >
                                    <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                        {esDomingoActivo && (
                                            <Sun className="w-3 h-3 text-amber-500" />
                                        )}
                                        {d.nombreDiaCorto} {d.numeroDia}
                                    </span>
                                    {d.esDiaHabilOConTurnos ? (
                                        <span className="text-xs font-black">
                                            {cant} {cant === 1 ? 'turno' : 'turnos'}
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-semibold">
                                            Cerrado
                                        </span>
                                    )}
                                    {d.esDiaHabilOConTurnos && (
                                        <span className="text-[9px] opacity-80 font-semibold">
                                            {d.horariosLibres.length === 0 && cant > 0
                                                ? 'Completo'
                                                : `${d.horariosLibres.length} libres`}
                                        </span>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* 4. BARRA DE FILTROS OPERATIVOS */}
            <div className="bg-white border border-stone-200/90 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-bold text-stone-500 flex items-center gap-1 mr-1">
                        <Filter className="w-3.5 h-3.5 text-rose-500" />
                        Filtrar turnos:
                    </span>
                    {(
                        [
                            { id: 'todos', label: 'Todos' },
                            {
                                id: 'confirmados',
                                label: `🟢 Confirmados (${resumenPeriodo.confirmados})`
                            },
                            {
                                id: 'pendientes',
                                label: `🟡 Pendientes (${resumenPeriodo.pendientes})`
                            },
                            {
                                id: 'sin_recordatorio',
                                label: `⏳ Sin Recordatorio (${resumenPeriodo.recordatoriosPendientes})`
                            }
                        ] as { id: FiltroTurnos; label: string }[]
                    ).map(f => (
                        <button
                            key={f.id}
                            type="button"
                            onClick={() => setFiltroTurnos(f.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                                filtroTurnos === f.id
                                    ? 'bg-rose-500 text-white shadow-2xs'
                                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={() => setMostrarDiasVacios(prev => !prev)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        mostrarDiasVacios
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                >
                    {mostrarDiasVacios
                        ? 'Mostrando días hábiles libres y ocupados'
                        : 'Mostrando solo días con turnos'}
                </button>
            </div>

            {/* 5. CRONOGRAMA DETALLADO DÍA POR DÍA */}
            {diasVisibles.length === 0 ? (
                <div className="bg-white border border-stone-200 rounded-3xl p-10 text-center shadow-2xs">
                    <p className="text-base font-black text-stone-800 mb-1">
                        No hay turnos para mostrar con el filtro seleccionado
                    </p>
                    <p className="text-xs text-stone-500 mb-4">
                        Probá cambiar a &ldquo;Todos&rdquo; o activar la visualización de días libres.
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setFiltroTurnos('todos')
                            setDiaFoco(null)
                            setMostrarDiasVacios(true)
                        }}
                        className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition cursor-pointer"
                    >
                        Restablecer vista del período
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {diasVisibles.map(d => {
                        const cantTurnos = d.turnosFiltrados.length
                        const cantLibres = d.horariosLibres.length

                        return (
                            <div
                                key={d.fechaStr}
                                className={`bg-white rounded-3xl border shadow-2xs overflow-hidden transition ${
                                    d.esHoy
                                        ? 'border-rose-400 ring-2 ring-rose-200/70'
                                        : d.isSunday && d.esDiaHabilOConTurnos
                                          ? 'border-amber-300'
                                          : 'border-stone-200/90'
                                }`}
                            >
                                {/* Encabezado del Día */}
                                <div
                                    className={`px-4 sm:px-6 py-3.5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                                        d.esHoy
                                            ? 'bg-gradient-to-r from-rose-50 via-pink-50/60 to-white border-rose-200/80'
                                            : d.isSunday && d.esDiaHabilOConTurnos
                                              ? 'bg-gradient-to-r from-amber-50/90 to-white border-amber-200/70'
                                              : 'bg-stone-50/80 border-stone-200/70'
                                    }`}
                                >
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="text-sm sm:text-base font-black text-stone-900">
                                            {d.nombreDiaLargo} {d.numeroDia} de {d.nombreMes}
                                        </h4>
                                        {d.esHoy && (
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-600 text-white">
                                                Hoy
                                            </span>
                                        )}
                                        {d.esManana && (
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500 text-white">
                                                Mañana
                                            </span>
                                        )}
                                        <span
                                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                                d.tipoJornada === 'domingo_activo'
                                                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                                                    : d.tipoJornada === 'especial'
                                                      ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                                      : 'bg-white text-stone-700 border-stone-200'
                                            }`}
                                        >
                                            {d.etiquetaJornada}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-stone-900 text-white">
                                            {d.turnosActivos.length}{' '}
                                            {d.turnosActivos.length === 1
                                                ? 'turno reservado'
                                                : 'turnos reservados'}
                                        </span>
                                        {d.esDiaHabilOConTurnos && (
                                            <span
                                                className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${
                                                    cantLibres === 0
                                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                }`}
                                            >
                                                {cantLibres === 0
                                                    ? '🔥 Agenda completa'
                                                    : `${cantLibres} ${
                                                          cantLibres === 1
                                                              ? 'horario libre'
                                                              : 'horarios libres'
                                                      }`}
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => onIrAGrillaFecha(d.fechaStr)}
                                            className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 transition cursor-pointer"
                                        >
                                            <span>Ver en Grilla</span>
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Cuerpo del Día: Lista de Turnos Reservados + Horarios Libres */}
                                <div className="p-4 sm:p-5 space-y-3">
                                    {cantTurnos === 0 ? (
                                        <div className="text-xs text-stone-500 flex flex-wrap items-center justify-between gap-2 py-1">
                                            <span>
                                                Sin turnos reservados todavía para este día.
                                            </span>
                                            {d.horariosLibres.length > 0 && (
                                                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50/80 border border-emerald-200 px-2.5 py-1 rounded-xl">
                                                    Horarios disponibles:{' '}
                                                    <strong>
                                                        {d.horariosLibres.join(' • ')} hs
                                                    </strong>
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-stone-100">
                                            {d.turnosFiltrados.map(r => {
                                                const ef = getEstadoEfectivo(r)
                                                const cfgEstado =
                                                    ESTADO_CONFIG[ef] || ESTADO_CONFIG.pendiente
                                                const meta = parseReservaMeta(
                                                    r.mp_preference_id,
                                                    r.id
                                                )
                                                const horaLimpia = (r.horario || '')
                                                    .replace(/^~/, '')
                                                    .split('#')[0]
                                                    .substring(0, 5)
                                                const servicioSinPrecio = (r.servicio || '')
                                                    .split('(')[0]
                                                    .trim()
                                                const labelsAdic = obtenerLabelsAdicionales(
                                                    meta.adicionalesSeleccionados || []
                                                )
                                                const esCumple = checkCumple(
                                                    r.fecha_nacimiento
                                                )
                                                const keyCliente =
                                                    normalizarCelular(r.celular) ||
                                                    `nombre:${(r.nombre || '').toLowerCase().trim()}`
                                                const hist =
                                                    historialPorCliente.get(keyCliente)
                                                const esTurno12 =
                                                    !!hist && hist.completados >= 11

                                                return (
                                                    <div
                                                        key={r.id}
                                                        onClick={() => onOpenTurno(r)}
                                                        className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-rose-50/40 -mx-2 px-2 rounded-2xl transition cursor-pointer group"
                                                    >
                                                        {/* Columna Izquierda: Hora + Clienta + Servicio */}
                                                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                                                            {/* Pastilla de Hora */}
                                                            <div className="px-3 py-2 rounded-xl bg-stone-900 text-white text-center shrink-0 min-w-[74px]">
                                                                <span className="text-xs sm:text-sm font-black block leading-none">
                                                                    {horaLimpia} hs
                                                                </span>
                                                                {meta.ocupaBloqueSiguiente && (
                                                                    <span className="text-[9px] font-bold text-amber-300 block mt-0.5">
                                                                        +Doble bloque
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Datos de la Clienta y Trabajo */}
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    <span className="text-sm font-black text-stone-900 group-hover:text-rose-700 transition">
                                                                        {r.nombre}
                                                                    </span>
                                                                    {r.celular ? (
                                                                        <span className="text-xs font-semibold text-stone-500">
                                                                            • 📱 {r.celular}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[11px] font-semibold text-amber-600 inline-flex items-center gap-0.5">
                                                                            <PhoneOff className="w-3 h-3" />{' '}
                                                                            Sin celular
                                                                        </span>
                                                                    )}
                                                                    {esCumple && (
                                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-pink-800 border border-pink-200">
                                                                            🎂 Cumpleaños
                                                                        </span>
                                                                    )}
                                                                    {esTurno12 && (
                                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                                                            🏆 12° Servicio
                                                                        </span>
                                                                    )}
                                                                    {r.reprogramado && (
                                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                                            🔄 Reprogramado
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-stone-600">
                                                                    <span className="font-bold text-stone-800">
                                                                        💅 {servicioSinPrecio}
                                                                    </span>
                                                                    {labelsAdic.length > 0 && (
                                                                        <span className="text-rose-700 font-semibold">
                                                                            + {labelsAdic.join(', ')}
                                                                        </span>
                                                                    )}
                                                                    {meta.notasTurno && (
                                                                        <span
                                                                            title={meta.notasTurno}
                                                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[11px] font-medium"
                                                                        >
                                                                            <FileText className="w-3 h-3 text-rose-500" />
                                                                            Nota: {meta.notasTurno}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Columna Derecha: Estado del Turno + Estado de Recordatorio */}
                                                        <div className="flex flex-wrap items-center gap-2 shrink-0 pl-10 sm:pl-0">
                                                            {(ef === 'pendiente' ||
                                                                ef === 'confirmado') &&
                                                                (r.notificacion_enviada ? (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                                        Recordatorio ✓
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-600 border border-stone-200">
                                                                        <Clock className="w-3 h-3 text-stone-400" />
                                                                        Por avisar
                                                                    </span>
                                                                ))}

                                                            <span
                                                                className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border ${cfgEstado.bg} ${cfgEstado.color} ${cfgEstado.border}`}
                                                            >
                                                                {cfgEstado.label}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}

                                    {/* Pie de tarjeta con los horarios que quedan libres ese día */}
                                    {cantTurnos > 0 && d.horariosLibres.length > 0 && (
                                        <div className="pt-2.5 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                                            <span className="text-stone-500 font-semibold">
                                                Horarios libres disponibles este día:
                                            </span>
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {d.horariosLibres.map(h => (
                                                    <span
                                                        key={h}
                                                        className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold"
                                                    >
                                                        {h} hs
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
