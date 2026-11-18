'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts'
import {
    TrendingUp,
    Users,
    CalendarDays,
    DollarSign,
    Sparkles,
    CheckCircle2,
    Receipt,
    Flame,
    Search,
    MessageCircle,
    ArrowRight,
    Layers,
    Wallet,
    CreditCard,
    AlertTriangle,
    Clock,
    Ban,
    RefreshCw
} from 'lucide-react'
import {
    calcularDesgloseReserva,
    getPartesAhoraArgentina,
    getEstadoEfectivo,
    obtenerLabelsAdicionales
} from '@/lib/utils'
import { suscribirCambiosRealtime } from '@/lib/realtime'

interface RendimientoClientProps {
    reservas: any[]
}

export type TipoFiltroPeriodo =
    | 'hoy'
    | 'semana_actual'
    | 'semana_anterior'
    | 'quincena'
    | 'mes_actual'
    | 'mes_anterior'
    | 'todos'

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

const DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DIAS_COMPLETO = [
    'Domingo',
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado'
]

function formatYYYYMMDD(d: Date): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

function formatearDiaMes(d: Date): string {
    const day = String(d.getDate()).padStart(2, '0')
    const m = String(d.getMonth() + 1).padStart(2, '0')
    return `${day}/${m}`
}

export default function RendimientoClient({ reservas }: RendimientoClientProps) {
    const router = useRouter()
    const [filtro, setFiltro] = useState<TipoFiltroPeriodo>('semana_actual')
    const [busqueda, setBusqueda] = useState('')
    const [filtroEstado, setFiltroEstado] = useState<
        'todos' | 'completado' | 'confirmado' | 'bajas'
    >('todos')

    // Sincronización en tiempo real ante cualquier cambio de estado en reservas
    useEffect(() => {
        const unsub = suscribirCambiosRealtime(evento => {
            if (evento.tipo === 'reservas' || evento.tipo === 'all') {
                router.refresh()
            }
        })
        return () => unsub()
    }, [router])

    const stats = useMemo(() => {
        // Componentes de fecha exactamente en el uso horario de Argentina (UTC-3)
        const p = getPartesAhoraArgentina()
        const hoyArg = new Date(p.year, p.month - 1, p.day, 12, 0, 0)
        const hoyISO = formatYYYYMMDD(hoyArg)

        // En JS: 0 = Domingo, 1 = Lunes, 2 = Martes, ..., 6 = Sábado
        const dayOfWeek = hoyArg.getDay()
        const diffALunes = dayOfWeek === 0 ? 6 : dayOfWeek - 1

        let inicio: Date
        let fin: Date
        let labelPeriodo: string

        switch (filtro) {
            case 'hoy': {
                inicio = new Date(hoyArg)
                fin = new Date(hoyArg)
                const diaNombre = DIAS_COMPLETO[hoyArg.getDay()]
                labelPeriodo = `Hoy: ${diaNombre} ${formatearDiaMes(hoyArg)}/${hoyArg.getFullYear()}`
                break
            }

            case 'semana_actual': {
                inicio = new Date(
                    hoyArg.getFullYear(),
                    hoyArg.getMonth(),
                    hoyArg.getDate() - diffALunes,
                    12,
                    0,
                    0
                )
                fin = new Date(
                    inicio.getFullYear(),
                    inicio.getMonth(),
                    inicio.getDate() + 6,
                    12,
                    0,
                    0
                )
                labelPeriodo = `Semana actual: Lun ${formatearDiaMes(inicio)} al Dom ${formatearDiaMes(fin)}`
                break
            }

            case 'semana_anterior': {
                const lunesActual = new Date(
                    hoyArg.getFullYear(),
                    hoyArg.getMonth(),
                    hoyArg.getDate() - diffALunes,
                    12,
                    0,
                    0
                )
                inicio = new Date(
                    lunesActual.getFullYear(),
                    lunesActual.getMonth(),
                    lunesActual.getDate() - 7,
                    12,
                    0,
                    0
                )
                fin = new Date(
                    inicio.getFullYear(),
                    inicio.getMonth(),
                    inicio.getDate() + 6,
                    12,
                    0,
                    0
                )
                labelPeriodo = `Semana anterior: Lun ${formatearDiaMes(inicio)} al Dom ${formatearDiaMes(fin)}`
                break
            }

            case 'quincena': {
                const y = hoyArg.getFullYear()
                const m = hoyArg.getMonth()
                if (p.day <= 15) {
                    inicio = new Date(y, m, 1, 12, 0, 0)
                    fin = new Date(y, m, 15, 12, 0, 0)
                    labelPeriodo = `1ª Quincena: 01/${String(m + 1).padStart(2, '0')} al 15/${String(m + 1).padStart(2, '0')}`
                } else {
                    inicio = new Date(y, m, 16, 12, 0, 0)
                    const ultDia = new Date(y, m + 1, 0, 12, 0, 0).getDate()
                    fin = new Date(y, m, ultDia, 12, 0, 0)
                    labelPeriodo = `2ª Quincena: 16/${String(m + 1).padStart(2, '0')} al ${ultDia}/${String(m + 1).padStart(2, '0')}`
                }
                break
            }

            case 'mes_actual': {
                const y = hoyArg.getFullYear()
                const m = hoyArg.getMonth()
                inicio = new Date(y, m, 1, 12, 0, 0)
                const ultDia = new Date(y, m + 1, 0, 12, 0, 0).getDate()
                fin = new Date(y, m, ultDia, 12, 0, 0)
                labelPeriodo = `Mes en curso: ${NOMBRES_MESES[m]} (${formatearDiaMes(inicio)} al ${formatearDiaMes(fin)})`
                break
            }

            case 'mes_anterior': {
                const y = hoyArg.getFullYear()
                const mAnt = hoyArg.getMonth() - 1
                inicio = new Date(y, mAnt, 1, 12, 0, 0)
                const ultDia = new Date(y, mAnt + 1, 0, 12, 0, 0).getDate()
                fin = new Date(y, mAnt, ultDia, 12, 0, 0)
                labelPeriodo = `Mes anterior: ${NOMBRES_MESES[inicio.getMonth()]} (${formatearDiaMes(inicio)} al ${formatearDiaMes(fin)})`
                break
            }

            case 'todos': {
                const fechasOrdenadas = (reservas || [])
                    .map(r => r.fecha)
                    .filter(Boolean)
                    .sort()

                if (fechasOrdenadas.length > 0) {
                    const [y1, m1, d1] = fechasOrdenadas[0].split('-').map(Number)
                    const [y2, m2, d2] = fechasOrdenadas[fechasOrdenadas.length - 1]
                        .split('-')
                        .map(Number)
                    inicio = new Date(y1, m1 - 1, d1, 12, 0, 0)
                    fin = new Date(y2, m2 - 1, d2, 12, 0, 0)
                } else {
                    inicio = new Date(hoyArg)
                    fin = new Date(hoyArg)
                }
                labelPeriodo = `Historial Completo (${fechasOrdenadas.length} turnos registrados)`
                break
            }
        }

        const startISO = formatYYYYMMDD(inicio)
        const endISO = formatYYYYMMDD(fin)

        // Pre-cargar días para el gráfico (hasta 60 días individuales)
        const daysMap = new Map<
            string,
            {
                cobrado: number
                proyectado: number
                turnosCompletados: number
                turnosConfirmados: number
                label: string
                fecha: string
            }
        >()

        if (filtro === 'hoy') {
            const BLOQUES_HOY = [
                '08:30',
                '10:00',
                '11:30',
                '13:30',
                '15:00',
                '16:30',
                '18:00',
                '20:00'
            ]
            for (const b of BLOQUES_HOY) {
                daysMap.set(b, {
                    cobrado: 0,
                    proyectado: 0,
                    turnosCompletados: 0,
                    turnosConfirmados: 0,
                    label: `${b} hs`,
                    fecha: hoyISO
                })
            }
        } else {
            const diffDias = Math.round((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
            if (diffDias <= 60) {
                const cursor = new Date(inicio)
                while (cursor <= fin) {
                    const fStr = formatYYYYMMDD(cursor)
                    const diaNombre = DIAS_CORTO[cursor.getDay()]
                    const label =
                        filtro === 'semana_actual' || filtro === 'semana_anterior'
                            ? `${diaNombre} ${formatearDiaMes(cursor)}`
                            : formatearDiaMes(cursor)

                    daysMap.set(fStr, {
                        cobrado: 0,
                        proyectado: 0,
                        turnosCompletados: 0,
                        turnosConfirmados: 0,
                        label,
                        fecha: fStr
                    })
                    cursor.setDate(cursor.getDate() + 1)
                }
            }
        }

        // Filtrar reservas dentro del período seleccionado
        const filtered = reservas.filter(r => r.fecha >= startISO && r.fecha <= endISO)

        // Variables Contables Reales (Completados = Cobrado Real)
        let ingresosCobrados = 0
        let cobradoEfectivo = 0
        let cobradoTransferencia = 0
        let totalBaseCobrado = 0
        let totalAdicionalesCobrado = 0
        let totalDescuentosCobrado = 0
        let turnosCompletadosCount = 0

        // Variables Proyectadas (Confirmados = Pendientes de atención en agenda)
        let ingresosProyectados = 0
        let turnosConfirmadosCount = 0

        // Variables de Inasistencias y Pérdidas
        let ingresosPerdidos = 0
        let ausentesCount = 0
        let canceladosCount = 0

        const serviciosCobradosMap = new Map<string, { count: number; ingresos: number }>()
        const clientasAtendidasSet = new Set<string>()

        // Lista enriquecida de turnos para la tabla
        const turnosDetalle = filtered
            .map(r => {
                const estadoReal = getEstadoEfectivo(r)
                const desglose = calcularDesgloseReserva(r)

                if (estadoReal === 'completado') {
                    turnosCompletadosCount++
                    ingresosCobrados += desglose.totalFinal
                    totalBaseCobrado += desglose.precioBaseServicio
                    totalAdicionalesCobrado += desglose.montoAdicionales
                    totalDescuentosCobrado += desglose.montoDescuento

                    // Arqueo por medio de pago
                    const mp = (r.metodo_pago || 'efectivo').toLowerCase()
                    if (
                        mp.includes('transf') ||
                        mp.includes('mp') ||
                        mp.includes('mercadopago') ||
                        mp.includes('banco')
                    ) {
                        cobradoTransferencia += desglose.totalFinal
                    } else {
                        cobradoEfectivo += desglose.totalFinal
                    }

                    // Clienta única efectivamente atendida
                    const idClienta = r.celular ? r.celular.trim() : r.nombre?.trim() || ''
                    if (idClienta) {
                        clientasAtendidasSet.add(idClienta)
                    }

                    // Ranking de servicios realizados y cobrados
                    const nombreLimpio = (r.servicio || 'Servicio General')
                        .split('(')[0]
                        .trim()
                    const sActual = serviciosCobradosMap.get(nombreLimpio) || {
                        count: 0,
                        ingresos: 0
                    }
                    sActual.count++
                    sActual.ingresos += desglose.totalFinal
                    serviciosCobradosMap.set(nombreLimpio, sActual)

                    if (filtro === 'hoy') {
                        const h = (r.horario || '10:00').substring(0, 5)
                        let slotKey = h
                        if (!daysMap.has(slotKey)) {
                            const keys = Array.from(daysMap.keys())
                            const prox = keys.find(k => k >= h) || keys[keys.length - 1]
                            slotKey = prox
                        }
                        if (daysMap.has(slotKey)) {
                            const dEntry = daysMap.get(slotKey)!
                            dEntry.cobrado += desglose.totalFinal
                            dEntry.turnosCompletados += 1
                        }
                    } else if (daysMap.has(r.fecha)) {
                        const dEntry = daysMap.get(r.fecha)!
                        dEntry.cobrado += desglose.totalFinal
                        dEntry.turnosCompletados += 1
                    }
                } else if (estadoReal === 'confirmado') {
                    turnosConfirmadosCount++
                    ingresosProyectados += desglose.totalFinal

                    if (filtro === 'hoy') {
                        const h = (r.horario || '10:00').substring(0, 5)
                        let slotKey = h
                        if (!daysMap.has(slotKey)) {
                            const keys = Array.from(daysMap.keys())
                            const prox = keys.find(k => k >= h) || keys[keys.length - 1]
                            slotKey = prox
                        }
                        if (daysMap.has(slotKey)) {
                            const dEntry = daysMap.get(slotKey)!
                            dEntry.proyectado += desglose.totalFinal
                            dEntry.turnosConfirmados += 1
                        }
                    } else if (daysMap.has(r.fecha)) {
                        const dEntry = daysMap.get(r.fecha)!
                        dEntry.proyectado += desglose.totalFinal
                        dEntry.turnosConfirmados += 1
                    }
                } else if (estadoReal === 'ausente') {
                    ausentesCount++
                    ingresosPerdidos += desglose.totalFinal
                } else if (estadoReal === 'cancelado' || estadoReal === 'rechazado') {
                    canceladosCount++
                    ingresosPerdidos += desglose.totalFinal
                }

                return {
                    id: r.id,
                    nombre: r.nombre || 'Clienta sin nombre',
                    celular: r.celular || '',
                    fecha: r.fecha,
                    horario: (r.horario || '10:00').substring(0, 5),
                    servicio: (r.servicio || 'Servicio').split('(')[0].trim(),
                    adicionales: obtenerLabelsAdicionales(desglose.adicionalesIds),
                    precioBase: desglose.precioBaseServicio,
                    montoAdicionales: desglose.montoAdicionales,
                    montoDescuento: desglose.montoDescuento,
                    totalFinal: desglose.totalFinal,
                    estado: estadoReal,
                    metodoPago: (r.metodo_pago || 'efectivo').toLowerCase()
                }
            })
            .sort((a, b) => {
                if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha)
                return a.horario.localeCompare(b.horario)
            })

        const dataChart = Array.from(daysMap.values()).map(item => ({
            name: item.label,
            fecha: item.fecha,
            cobrado: item.cobrado,
            proyectado: item.proyectado,
            totalDia: item.cobrado + item.proyectado,
            turnosCompletados: item.turnosCompletados,
            turnosConfirmados: item.turnosConfirmados
        }))

        // Indicadores analíticos
        const totalConResultado = turnosCompletadosCount + ausentesCount + canceladosCount
        const tasaCumplimiento =
            totalConResultado > 0
                ? Math.round((turnosCompletadosCount / totalConResultado) * 100)
                : 100

        const ticketPromedioCobrado =
            turnosCompletadosCount > 0
                ? Math.round(ingresosCobrados / turnosCompletadosCount)
                : 0

        const potencialTotal = ingresosCobrados + ingresosProyectados

        const rankingServicios = Array.from(serviciosCobradosMap.entries())
            .map(([nombre, data]) => ({
                nombre,
                count: data.count,
                ingresos: data.ingresos,
                porcentaje:
                    ingresosCobrados > 0
                        ? Math.round((data.ingresos / ingresosCobrados) * 100)
                        : 0
            }))
            .sort((a, b) => b.ingresos - a.ingresos)

        return {
            ingresosCobrados,
            cobradoEfectivo,
            cobradoTransferencia,
            totalBaseCobrado,
            totalAdicionalesCobrado,
            totalDescuentosCobrado,
            turnosCompletadosCount,
            ingresosProyectados,
            turnosConfirmadosCount,
            potencialTotal,
            ingresosPerdidos,
            ausentesCount,
            canceladosCount,
            tasaCumplimiento,
            ticketPromedioCobrado,
            clientasAtendidasReales: clientasAtendidasSet.size,
            dataChart,
            rankingServicios,
            turnosDetalle,
            labelPeriodo,
            rangoTexto:
                filtro === 'hoy'
                    ? formatearDiaMes(inicio)
                    : `${formatearDiaMes(inicio)} al ${formatearDiaMes(fin)}`,
            esSemanaActual: filtro === 'semana_actual',
            esHoy: filtro === 'hoy'
        }
    }, [reservas, filtro])

    // Filtrar la lista de turnos según el buscador y el selector de estado
    const turnosFiltrados = useMemo(() => {
        return stats.turnosDetalle.filter(t => {
            const matchesBusqueda =
                !busqueda ||
                t.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                t.servicio.toLowerCase().includes(busqueda.toLowerCase()) ||
                t.fecha.includes(busqueda)

            let matchesEstado = true
            if (filtroEstado === 'completado') {
                matchesEstado = t.estado === 'completado'
            } else if (filtroEstado === 'confirmado') {
                matchesEstado = t.estado === 'confirmado'
            } else if (filtroEstado === 'bajas') {
                matchesEstado =
                    t.estado === 'ausente' ||
                    t.estado === 'cancelado' ||
                    t.estado === 'rechazado'
            }

            return matchesBusqueda && matchesEstado
        })
    }, [stats.turnosDetalle, busqueda, filtroEstado])

    return (
        <div className="w-full space-y-6 animate-in fade-in duration-300">
            {/* Header del Panel de Rendimiento */}
            <div className="flex flex-col gap-4 pb-4 border-b border-stone-200/80">
                {/* Fila Superior: Título y Rango Activo */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                        Panel de Rendimiento
                    </h2>

                    {/* Badge con el rango de fechas activo */}
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-2 bg-rose-50/90 border border-rose-200/90 text-rose-800 text-xs sm:text-sm font-bold px-3.5 py-1.5 rounded-2xl shadow-2xs">
                            <CalendarDays className="w-4 h-4 text-rose-500 shrink-0" />
                            <span>{stats.labelPeriodo}</span>
                        </span>
                    </div>
                </div>

                {/* Barra de Filtros de Período (Orden cronológico de menor a mayor horizonte) */}
                <div className="bg-stone-100/90 p-1.5 rounded-2xl border border-stone-200/80 shadow-2xs flex flex-wrap items-center gap-1 sm:gap-1.5">
                    <button
                        type="button"
                        onClick={() => setFiltro('hoy')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            filtro === 'hoy'
                                ? 'bg-rose-500 text-white shadow-xs'
                                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/70'
                        }`}
                    >
                        <span>⚡</span>
                        <span>Hoy</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setFiltro('semana_actual')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            filtro === 'semana_actual'
                                ? 'bg-rose-500 text-white shadow-xs'
                                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/70'
                        }`}
                    >
                        <span>📅</span>
                        <span>Esta Semana</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setFiltro('semana_anterior')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            filtro === 'semana_anterior'
                                ? 'bg-rose-500 text-white shadow-xs'
                                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/70'
                        }`}
                    >
                        <span>⏮️</span>
                        <span>Semana Anterior</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setFiltro('quincena')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            filtro === 'quincena'
                                ? 'bg-rose-500 text-white shadow-xs'
                                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/70'
                        }`}
                    >
                        <span>🌓</span>
                        <span>Quincena</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setFiltro('mes_actual')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            filtro === 'mes_actual'
                                ? 'bg-rose-500 text-white shadow-xs'
                                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/70'
                        }`}
                    >
                        <span>📆</span>
                        <span>Mes en Curso</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setFiltro('mes_anterior')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            filtro === 'mes_anterior'
                                ? 'bg-rose-500 text-white shadow-xs'
                                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/70'
                        }`}
                    >
                        <span>🗓️</span>
                        <span>Mes Anterior</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setFiltro('todos')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            filtro === 'todos'
                                ? 'bg-stone-900 text-white shadow-xs'
                                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/70'
                        }`}
                    >
                        <span>📚</span>
                        <span>Historial Completo</span>
                    </button>
                </div>
            </div>

            {/* Tarjetas Principales de KPIs Financieros y Gananciales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. FACTURACIÓN REAL COBRADA (SOLO COMPLETADOS) */}
                <div className="bg-white/95 backdrop-blur-sm border-2 border-emerald-300/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full pointer-events-none -z-0" />
                    <div className="flex items-center justify-between mb-3 relative z-10">
                        <span className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Facturación Real Cobrada
                        </span>
                        <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                            <DollarSign className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-emerald-950 leading-none relative z-10">
                        ${stats.ingresosCobrados.toLocaleString('es-AR')}
                    </p>
                    <div className="mt-3 flex flex-col gap-1 text-[11px] font-semibold text-stone-600 border-t border-emerald-100 pt-2.5 relative z-10">
                        <div className="flex justify-between items-center">
                            <span className="text-emerald-700">✓ Turnos atendidos y cobrados:</span>
                            <span className="font-bold text-stone-900">
                                {stats.turnosCompletadosCount}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-stone-500">
                            <span>Base: ${stats.totalBaseCobrado.toLocaleString('es-AR')}</span>
                            {stats.totalAdicionalesCobrado > 0 && (
                                <span className="text-emerald-700 font-bold">
                                    +${stats.totalAdicionalesCobrado.toLocaleString('es-AR')} deco
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. ARQUEO DE CAJA / MEDIOS DE PAGO (EFECTIVO VS TRANSFERENCIA) */}
                <div className="bg-white/95 backdrop-blur-sm border border-stone-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Wallet className="w-3.5 h-3.5 text-indigo-500" />
                            Arqueo de Cobros
                        </span>
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                            <CreditCard className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="space-y-2 mt-1">
                        <div className="flex items-center justify-between bg-stone-50 p-2 rounded-xl border border-stone-100">
                            <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                                💵 Efectivo en Mano:
                            </span>
                            <span className="font-black text-xs text-stone-900">
                                ${stats.cobradoEfectivo.toLocaleString('es-AR')}
                            </span>
                        </div>
                        <div className="flex items-center justify-between bg-stone-50 p-2 rounded-xl border border-stone-100">
                            <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                                💳 Banco / Transf.:
                            </span>
                            <span className="font-black text-xs text-stone-900">
                                ${stats.cobradoTransferencia.toLocaleString('es-AR')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 3. EN AGENDA / FACTURACIÓN PROYECTADA (CONFIRMADOS POR ATENDER) */}
                <div className="bg-white/95 backdrop-blur-sm border border-stone-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-sky-500" />
                            En Agenda (Por Atender)
                        </span>
                        <div className="p-2 bg-sky-50 text-sky-600 rounded-xl border border-sky-100">
                            <CalendarDays className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-sky-900 leading-none">
                        ${stats.ingresosProyectados.toLocaleString('es-AR')}
                    </p>
                    <div className="mt-3 flex flex-col gap-1 text-[11px] font-semibold text-stone-600 border-t border-stone-100 pt-2.5">
                        <div className="flex justify-between items-center">
                            <span className="text-sky-700">⏳ Turnos confirmados:</span>
                            <span className="font-bold text-stone-900">
                                {stats.turnosConfirmadosCount}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-stone-500">
                            <span>Potencial Total del Período:</span>
                            <span className="font-bold text-stone-800">
                                ${stats.potencialTotal.toLocaleString('es-AR')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 4. CLIENTAS ATENDIDAS & TICKET PROMEDIO REAL */}
                <div className="bg-white/95 backdrop-blur-sm border border-stone-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-purple-500" />
                            Clientas Atendidas Reales
                        </span>
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
                            <Receipt className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex items-baseline justify-between">
                        <p className="text-2xl sm:text-3xl font-black text-stone-900 leading-none">
                            {stats.clientasAtendidasReales}
                        </p>
                        <div className="text-right">
                            <span className="text-[10px] text-stone-400 block font-bold uppercase">
                                Ticket Promedio
                            </span>
                            <span className="text-sm font-black text-purple-700">
                                ${stats.ticketPromedioCobrado.toLocaleString('es-AR')}
                            </span>
                        </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-[11px] font-semibold">
                        <span className="text-stone-500">Efectividad de turnos:</span>
                        <span
                            className={`font-bold ${
                                stats.tasaCumplimiento >= 85 ? 'text-emerald-600' : 'text-amber-600'
                            }`}
                        >
                            {stats.tasaCumplimiento}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Aviso de Ingresos No Percibidos por Inasistencias (Si los hubiere) */}
            {stats.ingresosPerdidos > 0 && (
                <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div className="text-xs text-rose-900">
                            <span className="font-bold">
                                Ingresos no percibidos por turnos caídos:
                            </span>{' '}
                            Se perdieron <strong>${stats.ingresosPerdidos.toLocaleString('es-AR')}</strong> en este período ({stats.ausentesCount} clientas ausentes y {stats.canceladosCount} cancelaciones).
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setFiltroEstado('bajas')}
                        className="self-start sm:self-auto px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition shadow-xs shrink-0"
                    >
                        Ver Turnos Caídos
                    </button>
                </div>
            )}

            {/* TABLA DETALLADA DE TURNOS Y COBROS DEL PERÍODO */}
            <div className="bg-white/95 backdrop-blur-sm border border-stone-200/80 rounded-2xl p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-stone-100">
                    <div>
                        <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                            <Layers className="w-4 h-4 text-rose-500" />
                            Detalle de Turnos y Cobros ({turnosFiltrados.length})
                        </h3>
                        <p className="text-xs text-stone-500 font-medium">
                            Visualizá qué turnos fueron efectivamente cobrados y cuáles continúan agendados o sufrieron bajas.
                        </p>
                    </div>

                    {/* Filtros Rápidos de la Tabla */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Selector de Estado */}
                        <div className="flex flex-wrap items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200/70 text-xs font-bold">
                            <button
                                type="button"
                                onClick={() => setFiltroEstado('todos')}
                                className={`px-2.5 py-1 rounded-lg transition ${
                                    filtroEstado === 'todos'
                                        ? 'bg-white text-stone-900 shadow-2xs'
                                        : 'text-stone-600 hover:text-stone-900'
                                }`}
                            >
                                Todos ({stats.turnosDetalle.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setFiltroEstado('completado')}
                                className={`px-2.5 py-1 rounded-lg transition ${
                                    filtroEstado === 'completado'
                                        ? 'bg-emerald-500 text-white shadow-2xs'
                                        : 'text-stone-600 hover:text-emerald-700'
                                }`}
                            >
                                ✓ Cobrados ({stats.turnosCompletadosCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => setFiltroEstado('confirmado')}
                                className={`px-2.5 py-1 rounded-lg transition ${
                                    filtroEstado === 'confirmado'
                                        ? 'bg-sky-500 text-white shadow-2xs'
                                        : 'text-stone-600 hover:text-sky-700'
                                }`}
                            >
                                ⏳ En Agenda ({stats.turnosConfirmadosCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => setFiltroEstado('bajas')}
                                className={`px-2.5 py-1 rounded-lg transition ${
                                    filtroEstado === 'bajas'
                                        ? 'bg-rose-500 text-white shadow-2xs'
                                        : 'text-stone-600 hover:text-rose-700'
                                }`}
                            >
                                ✕ Bajas ({stats.ausentesCount + stats.canceladosCount})
                            </button>
                        </div>

                        {/* Buscador de Clientas */}
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                            <input
                                type="text"
                                placeholder="Buscar clienta o servicio..."
                                value={busqueda}
                                onChange={e => setBusqueda(e.target.value)}
                                className="pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-400 w-44 sm:w-52"
                            />
                        </div>
                    </div>
                </div>

                {turnosFiltrados.length === 0 ? (
                    <div className="py-12 text-center">
                        <p className="text-stone-400 text-sm font-medium">
                            No se encontraron turnos en este período con el filtro aplicado.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-stone-200/80 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                                    <th className="py-2.5 px-3">Fecha y Hora</th>
                                    <th className="py-2.5 px-3">Clienta</th>
                                    <th className="py-2.5 px-3">Servicio Principal & Deco</th>
                                    <th className="py-2.5 px-3">Estado Operativo</th>
                                    <th className="py-2.5 px-3 text-right">Monto</th>
                                    <th className="py-2.5 px-3 text-center">Contacto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100 text-xs">
                                {turnosFiltrados.map(t => {
                                    const fechaLatam = t.fecha.split('-').reverse().join('/')
                                    const esCompletado = t.estado === 'completado'
                                    const esConfirmado = t.estado === 'confirmado'

                                    return (
                                        <tr
                                            key={t.id}
                                            className="hover:bg-rose-50/40 transition-colors"
                                        >
                                            <td className="py-3 px-3 whitespace-nowrap">
                                                <div className="font-bold text-stone-900">
                                                    {fechaLatam}
                                                </div>
                                                <div className="text-[11px] text-stone-500 font-semibold">
                                                    {t.horario} hs
                                                </div>
                                            </td>

                                            <td className="py-3 px-3">
                                                <div className="font-bold text-stone-900">
                                                    {t.nombre}
                                                </div>
                                                <div className="text-[11px] text-stone-500">
                                                    {t.celular || 'Sin WhatsApp'}
                                                </div>
                                            </td>

                                            <td className="py-3 px-3">
                                                <div className="font-bold text-stone-800">
                                                    {t.servicio}
                                                </div>
                                                {t.adicionales.length > 0 && (
                                                    <div className="text-[11px] font-semibold text-rose-600 mt-0.5">
                                                        ✨ +{t.adicionales.join(', ')} (+${t.montoAdicionales.toLocaleString('es-AR')})
                                                    </div>
                                                )}
                                                {t.montoDescuento > 0 && (
                                                    <div className="text-[10px] text-emerald-700 font-medium">
                                                        🎁 Descuento: -${t.montoDescuento.toLocaleString('es-AR')}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="py-3 px-3 whitespace-nowrap">
                                                {esCompletado ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                        Cobrado
                                                    </span>
                                                ) : esConfirmado ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-300">
                                                        <Clock className="w-3 h-3 text-sky-600" />
                                                        Por Atender
                                                    </span>
                                                ) : t.estado === 'ausente' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                                                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                                                        Ausente
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300 line-through">
                                                        <Ban className="w-3 h-3 text-rose-600" />
                                                        Cancelado
                                                    </span>
                                                )}
                                            </td>

                                            <td className="py-3 px-3 text-right whitespace-nowrap">
                                                <div
                                                    className={`font-black text-sm ${
                                                        esCompletado
                                                            ? 'text-emerald-700'
                                                            : esConfirmado
                                                              ? 'text-sky-800'
                                                              : 'text-stone-400 line-through'
                                                    }`}
                                                >
                                                    ${t.totalFinal.toLocaleString('es-AR')}
                                                </div>
                                                <div className="text-[10px] text-stone-400">
                                                    {esCompletado
                                                        ? t.metodoPago.includes('transf')
                                                            ? '💳 Transferencia'
                                                            : '💵 Efectivo'
                                                        : esConfirmado
                                                          ? '⏳ En agenda'
                                                          : 'Perdido'}
                                                </div>
                                            </td>

                                            <td className="py-3 px-3 text-center whitespace-nowrap">
                                                {t.celular ? (
                                                    <a
                                                        href={`https://wa.me/${t.celular.replace(/\D/g, '')}?text=${encodeURIComponent(
                                                            `Hola ${t.nombre}! Te escribo de Pintaditas Nails por tu turno del ${fechaLatam} a las ${t.horario}hs 💅`
                                                        )}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold text-[11px] shadow-2xs transition"
                                                    >
                                                        <MessageCircle className="w-3 h-3" />
                                                        <span>WhatsApp</span>
                                                    </a>
                                                ) : (
                                                    <span className="text-stone-300 text-xs">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Gráfico y Composición de Ingresos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Gráfico de Área Recharts: Cobrado Real vs Proyectado en Agenda */}
                <div className="lg:col-span-2 bg-white/95 backdrop-blur-sm border border-stone-200/80 rounded-2xl p-5 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                        <div>
                            <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-emerald-500" />
                                {filtro === 'hoy'
                                    ? 'Evolución de Ingresos de Hoy'
                                    : `Curva de Recaudación (${stats.rangoTexto})`}
                            </h3>
                            <p className="text-xs text-stone-400 font-medium">
                                {filtro === 'hoy'
                                    ? 'Comparativa por horario entre lo Cobrado y lo Agendado para hoy'
                                    : 'Comparativa diaria entre lo Cobrado Efectivo y lo Proyectado en Agenda'}
                            </p>
                        </div>

                        {/* Leyenda visual */}
                        <div className="flex items-center gap-3 text-xs font-bold">
                            <span className="flex items-center gap-1 text-emerald-700">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                Cobrado Real
                            </span>
                            <span className="flex items-center gap-1 text-sky-700">
                                <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                                Por Atender
                            </span>
                        </div>
                    </div>

                    <div className="w-full h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={stats.dataChart}
                                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="cobradoGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                                    </linearGradient>
                                    <linearGradient id="proyectadoGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke="#f1f5f9"
                                />
                                <XAxis
                                    dataKey="name"
                                    stroke="#94a3b8"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    dy={8}
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={v => `$${v.toLocaleString('es-AR')}`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#ffffff',
                                        borderRadius: '0.75rem',
                                        border: '1px solid #e2e8f0',
                                        padding: '10px 14px',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                    }}
                                    formatter={(value: any, name: any) => [
                                        `$${Number(value).toLocaleString('es-AR')}`,
                                        name === 'cobrado' ? 'Cobrado Real' : 'Por Atender'
                                    ]}
                                    labelFormatter={(label: any) => `Fecha: ${label}`}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="cobrado"
                                    stroke="#10b981"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#cobradoGrad)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="proyectado"
                                    stroke="#0ea5e9"
                                    strokeWidth={2}
                                    strokeDasharray="4 4"
                                    fillOpacity={1}
                                    fill="url(#proyectadoGrad)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Composición de Ganancia Real Cobrada */}
                <div className="bg-white/95 backdrop-blur-sm border border-stone-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider flex items-center gap-2 mb-1">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            Composición de Caja Real
                        </h3>
                        <p className="text-xs text-stone-400 font-medium mb-4">
                            Desglose de tratamientos y adicionales efectivamente cobrados
                        </p>

                        <div className="space-y-3.5">
                            <div>
                                <div className="flex justify-between text-xs font-semibold text-stone-600 mb-1">
                                    <span>Servicios Principales:</span>
                                    <span className="font-bold text-stone-900">
                                        ${stats.totalBaseCobrado.toLocaleString('es-AR')}
                                    </span>
                                </div>
                                <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-stone-800 h-2 rounded-full"
                                        style={{
                                            width: `${
                                                stats.ingresosCobrados > 0
                                                    ? (stats.totalBaseCobrado /
                                                          stats.ingresosCobrados) *
                                                      100
                                                    : 0
                                            }%`
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-xs font-semibold text-stone-600 mb-1">
                                    <span className="flex items-center gap-1 text-emerald-700">
                                        ✨ Nail Art / Adicionales:
                                    </span>
                                    <span className="font-bold text-emerald-700">
                                        +${stats.totalAdicionalesCobrado.toLocaleString('es-AR')}
                                    </span>
                                </div>
                                <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-emerald-500 h-2 rounded-full"
                                        style={{
                                            width: `${
                                                stats.ingresosCobrados > 0
                                                    ? (stats.totalAdicionalesCobrado /
                                                          stats.ingresosCobrados) *
                                                      100
                                                    : 0
                                            }%`
                                        }}
                                    />
                                </div>
                            </div>

                            {stats.totalDescuentosCobrado > 0 && (
                                <div>
                                    <div className="flex justify-between text-xs font-semibold text-rose-600 mb-1">
                                        <span>Descuentos Otorgados:</span>
                                        <span className="font-bold">
                                            -${stats.totalDescuentosCobrado.toLocaleString('es-AR')}
                                        </span>
                                    </div>
                                    <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-rose-500 h-2 rounded-full"
                                            style={{
                                                width: `${
                                                    stats.ingresosCobrados > 0
                                                        ? (stats.totalDescuentosCobrado /
                                                              stats.ingresosCobrados) *
                                                          100
                                                        : 0
                                                }%`
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-stone-100 bg-stone-50/80 -mx-5 -mb-5 p-5 rounded-b-2xl">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                                Total Cobrado en Mano:
                            </span>
                            <span className="text-xl font-black text-emerald-600">
                                ${stats.ingresosCobrados.toLocaleString('es-AR')}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ranking de Servicios Más Rentables Efectivos */}
            <div className="bg-white/95 backdrop-blur-sm border border-stone-200/80 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider flex items-center gap-2">
                            <Flame className="w-4 h-4 text-orange-500" />
                            Servicios Más Rentables (Cobrados)
                        </h3>
                        <p className="text-xs text-stone-400 font-medium">
                            Distribución de ingresos generados exclusivamente por tratamientos atendidos y cobrados en este período
                        </p>
                    </div>
                </div>

                {stats.rankingServicios.length === 0 ? (
                    <p className="text-xs text-stone-400 py-6 text-center italic">
                        Aún no hay turnos completados y cobrados en este período.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {stats.rankingServicios.map((s, index) => (
                            <div
                                key={s.nombre}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-stone-50/70 border border-stone-200/60 hover:bg-white hover:shadow-xs transition-all gap-2"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-lg bg-stone-200 text-stone-700 font-black text-xs flex items-center justify-center shrink-0">
                                        {index + 1}
                                    </span>
                                    <div>
                                        <h4 className="text-sm font-bold text-stone-900 leading-tight">
                                            {s.nombre}
                                        </h4>
                                        <p className="text-xs text-stone-500 font-medium mt-0.5">
                                            {s.count} {s.count === 1 ? 'servicio cobrado' : 'servicios cobrados'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-4 pl-9 sm:pl-0">
                                    <div className="text-right">
                                        <p className="text-sm font-black text-stone-900">
                                            ${s.ingresos.toLocaleString('es-AR')}
                                        </p>
                                        <p className="text-[11px] font-bold text-emerald-600">
                                            {s.porcentaje}% del total cobrado
                                        </p>
                                    </div>
                                    <div className="w-20 hidden sm:block bg-stone-200 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full"
                                            style={{ width: `${s.porcentaje}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
