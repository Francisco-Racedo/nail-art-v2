'use client'

import React, { useState, useMemo } from 'react'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
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
    ArrowRight,
    Clock
} from 'lucide-react'
import {
    calcularDesgloseReserva,
    getPartesAhoraArgentina,
    getEstadoEfectivo
} from '@/lib/utils'

interface RendimientoClientProps {
    reservas: any[]
}

export type TipoFiltroPeriodo =
    | 'semana_actual'
    | 'semana_anterior'
    | 'quincena'
    | 'mes_actual'
    | 'mes_anterior'

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
    const [filtro, setFiltro] = useState<TipoFiltroPeriodo>('semana_actual')

    const stats = useMemo(() => {
        // Obtenemos los componentes de fecha exactamente en el uso horario de Argentina (UTC-3)
        const p = getPartesAhoraArgentina()
        // Usamos mediodía (12:00) para evitar desfasajes por cambio de día o límites de zona horaria
        const hoyArg = new Date(p.year, p.month - 1, p.day, 12, 0, 0)
        const hoyISO = formatYYYYMMDD(hoyArg)

        // En JS: 0 = Domingo, 1 = Lunes, 2 = Martes, ..., 6 = Sábado
        const dayOfWeek = hoyArg.getDay()
        // Días de diferencia hacia atrás para alcanzar el Lunes (00:00:00)
        const diffALunes = dayOfWeek === 0 ? 6 : dayOfWeek - 1

        let inicio: Date
        let fin: Date
        let labelPeriodo: string

        switch (filtro) {
            case 'semana_actual': {
                // Lunes de la semana en curso
                inicio = new Date(
                    hoyArg.getFullYear(),
                    hoyArg.getMonth(),
                    hoyArg.getDate() - diffALunes,
                    12,
                    0,
                    0
                )
                // Domingo de la semana en curso (Lunes + 6 días)
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
                // Lunes de la semana pasada (Lunes actual - 7 días)
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
                // Domingo de la semana pasada (Lunes anterior + 6 días)
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
        }

        const startISO = formatYYYYMMDD(inicio)
        const endISO = formatYYYYMMDD(fin)

        // Pre-cargar todos los días del período en el mapa para garantizar continuidad en el gráfico
        const daysMap = new Map<
            string,
            { ingresos: number; turnos: number; label: string; fecha: string }
        >()

        const cursor = new Date(inicio)
        while (cursor <= fin) {
            const fStr = formatYYYYMMDD(cursor)
            const diaNombre = DIAS_CORTO[cursor.getDay()]
            const label =
                filtro === 'semana_actual' || filtro === 'semana_anterior'
                    ? `${diaNombre} ${formatearDiaMes(cursor)}`
                    : formatearDiaMes(cursor)

            daysMap.set(fStr, { ingresos: 0, turnos: 0, label, fecha: fStr })
            cursor.setDate(cursor.getDate() + 1)
        }

        // Filtrar reservas que caigan estrictamente dentro del rango calendario
        const filtered = reservas.filter(
            r => r.fecha >= startISO && r.fecha <= endISO
        )

        let ingresos = 0
        let ingresosCompletadosHastaHoy = 0
        let ingresosProyectadosResto = 0
        let totalBaseServicios = 0
        let totalAdicionales = 0
        let totalDescuentos = 0
        let completadosConf = 0
        let canceladosRech = 0
        let ausentesCount = 0

        const serviciosMap = new Map<string, { count: number; ingresos: number }>()
        const clientesUnicos = new Set<string>()

        filtered.forEach(r => {
            const estadoReal = getEstadoEfectivo(r)
            const esActivoOCompletado =
                estadoReal === 'confirmado' || estadoReal === 'completado'

            if (estadoReal === 'cancelado' || estadoReal === 'rechazado') {
                canceladosRech++
            } else if (estadoReal === 'ausente') {
                ausentesCount++
            }

            if (esActivoOCompletado) {
                completadosConf++
                const desglose = calcularDesgloseReserva(r)
                ingresos += desglose.totalFinal
                totalBaseServicios += desglose.precioBaseServicio
                totalAdicionales += desglose.montoAdicionales
                totalDescuentos += desglose.montoDescuento

                if (r.fecha <= hoyISO) {
                    ingresosCompletadosHastaHoy += desglose.totalFinal
                } else {
                    ingresosProyectadosResto += desglose.totalFinal
                }

                if (r.celular) {
                    clientesUnicos.add(r.celular.trim())
                }

                // Agrupamiento por servicio
                const nombreLimpio = (r.servicio || 'Servicio General')
                    .split('(')[0]
                    .trim()
                const sActual = serviciosMap.get(nombreLimpio) || {
                    count: 0,
                    ingresos: 0
                }
                sActual.count++
                sActual.ingresos += desglose.totalFinal
                serviciosMap.set(nombreLimpio, sActual)

                if (daysMap.has(r.fecha)) {
                    const dEntry = daysMap.get(r.fecha)!
                    dEntry.ingresos += desglose.totalFinal
                    dEntry.turnos += 1
                }
            }
        })

        const dataChart = Array.from(daysMap.values()).map(item => ({
            name: item.label,
            fecha: item.fecha,
            ingresos: item.ingresos,
            turnos: item.turnos
        }))

        const totalGestionados = completadosConf + canceladosRech + ausentesCount
        const ocupacion =
            totalGestionados === 0
                ? 0
                : Math.round((completadosConf / totalGestionados) * 100)
        const ticketPromedio =
            completadosConf > 0 ? Math.round(ingresos / completadosConf) : 0

        // Ranking de servicios ordenados por facturación
        const rankingServicios = Array.from(serviciosMap.entries())
            .map(([nombre, data]) => ({
                nombre,
                count: data.count,
                ingresos: data.ingresos,
                porcentaje:
                    ingresos > 0 ? Math.round((data.ingresos / ingresos) * 100) : 0
            }))
            .sort((a, b) => b.ingresos - a.ingresos)

        return {
            ingresos,
            ingresosCompletadosHastaHoy,
            ingresosProyectadosResto,
            totalBaseServicios,
            totalAdicionales,
            totalDescuentos,
            completadosConf,
            canceladosRech,
            ausentesCount,
            totalGestionados,
            ocupacion,
            ticketPromedio,
            clientesAtendidos: clientesUnicos.size,
            dataChart,
            rankingServicios,
            labelPeriodo,
            rangoTexto: `${formatearDiaMes(inicio)} al ${formatearDiaMes(fin)}`,
            esSemanaActual: filtro === 'semana_actual'
        }
    }, [reservas, filtro])

    return (
        <div className="w-full space-y-6 animate-in fade-in duration-300">
            {/* Header del Panel */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone-200">
                <div>
                    <div className="flex items-center gap-2 text-rose-500 font-bold text-xs uppercase tracking-widest mb-1.5">
                        <TrendingUp className="w-4 h-4" />
                        <span>Inteligencia de Negocio</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                        Panel de Rendimiento
                    </h2>
                    <div className="mt-1 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-200/90 text-rose-800 text-xs font-bold px-3 py-1 rounded-xl shadow-2xs">
                            <CalendarDays className="w-3.5 h-3.5 text-rose-500" />
                            {stats.labelPeriodo}
                        </span>
                    </div>
                </div>

                {/* Filtros de Período Calendario */}
                <div className="flex flex-wrap items-center gap-1.5 bg-stone-100 p-1.5 rounded-2xl border border-stone-200/80 shadow-inner">
                    <button
                        type="button"
                        onClick={() => setFiltro('semana_actual')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            filtro === 'semana_actual'
                                ? 'bg-rose-500 text-white shadow-sm'
                                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/70'
                        }`}
                    >
                        📅 Esta Semana
                    </button>
                    <button
                        type="button"
                        onClick={() => setFiltro('semana_anterior')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            filtro === 'semana_anterior'
                                ? 'bg-rose-500 text-white shadow-sm'
                                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/70'
                        }`}
                    >
                        ⏮️ Semana Anterior
                    </button>
                    <button
                        type="button"
                        onClick={() => setFiltro('quincena')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            filtro === 'quincena'
                                ? 'bg-rose-500 text-white shadow-sm'
                                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/70'
                        }`}
                    >
                        🌓 Quincena
                    </button>
                    <button
                        type="button"
                        onClick={() => setFiltro('mes_actual')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            filtro === 'mes_actual'
                                ? 'bg-rose-500 text-white shadow-sm'
                                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/70'
                        }`}
                    >
                        📆 Mes en Curso
                    </button>
                    <button
                        type="button"
                        onClick={() => setFiltro('mes_anterior')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            filtro === 'mes_anterior'
                                ? 'bg-rose-500 text-white shadow-sm'
                                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/70'
                        }`}
                    >
                        Mes Anterior
                    </button>
                </div>
            </div>

            {/* Tarjetas Principales de KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Facturación del Período */}
                <div className="bg-white/95 backdrop-blur-sm border border-stone-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Facturación Total
                        </span>
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                            <DollarSign className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-stone-900 leading-none">
                        ${stats.ingresos.toLocaleString('es-AR')}
                    </p>

                    {stats.esSemanaActual ? (
                        <div className="mt-2.5 flex flex-col gap-1 text-[11px] font-semibold text-stone-500 border-t border-stone-100 pt-2">
                            <div className="flex justify-between">
                                <span className="text-emerald-700">✓ Atendido hasta hoy:</span>
                                <span className="font-bold text-stone-800">
                                    ${stats.ingresosCompletadosHastaHoy.toLocaleString('es-AR')}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sky-700">⏳ Por atender (resto semana):</span>
                                <span className="font-bold text-stone-800">
                                    ${stats.ingresosProyectadosResto.toLocaleString('es-AR')}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-stone-500">
                            <span>Base: ${stats.totalBaseServicios.toLocaleString('es-AR')}</span>
                            {stats.totalAdicionales > 0 && (
                                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">
                                    +${stats.totalAdicionales.toLocaleString('es-AR')} deco
                                </span>
                            )}
                            {stats.totalDescuentos > 0 && (
                                <span className="text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded font-bold">
                                    -${stats.totalDescuentos.toLocaleString('es-AR')} desc
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* 2. Ticket Promedio */}
                <div className="bg-white/95 backdrop-blur-sm border border-stone-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Ticket Promedio
                        </span>
                        <div className="p-2 bg-sky-50 text-sky-600 rounded-xl border border-sky-100">
                            <Receipt className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-stone-900 leading-none">
                        ${stats.ticketPromedio.toLocaleString('es-AR')}
                    </p>
                    <p className="mt-2 text-xs font-medium text-stone-500">
                        Promedio por cada clienta que se atendió en este período.
                    </p>
                </div>

                {/* 3. Tasa de Efectividad y Ocupación */}
                <div className="bg-white/95 backdrop-blur-sm border border-stone-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Efectividad de Turnos
                        </span>
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <p className="text-2xl sm:text-3xl font-black text-stone-900 leading-none">
                            {stats.ocupacion}%
                        </p>
                        <span className="text-xs font-bold text-emerald-600">
                            ({stats.completadosConf} confirmados)
                        </span>
                    </div>
                    <div className="mt-2.5 flex items-center gap-2 text-[11px] font-semibold text-stone-500">
                        {stats.canceladosRech > 0 && (
                            <span className="text-rose-600">
                                {stats.canceladosRech} cancelados
                            </span>
                        )}
                        {stats.ausentesCount > 0 && (
                            <span className="text-amber-600">
                                {stats.ausentesCount} ausentes
                            </span>
                        )}
                    </div>
                </div>

                {/* 4. Clientas Atendidas */}
                <div className="bg-white/95 backdrop-blur-sm border border-stone-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                            Clientas Atendidas
                        </span>
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
                            <Users className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-stone-900 leading-none">
                        {stats.clientesAtendidos}
                    </p>
                    <p className="mt-2 text-xs font-medium text-stone-500">
                        Personas únicas que reservaron en este intervalo.
                    </p>
                </div>
            </div>

            {/* Gráfico y Composición */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Gráfico de Área (2 columnas) */}
                <div className="lg:col-span-2 bg-white/95 backdrop-blur-sm border border-stone-200/80 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-emerald-500" />
                                Curva de Facturación ({stats.rangoTexto})
                            </h3>
                            <p className="text-xs text-stone-400 font-medium">
                                Recaudación diaria (comienza los Lunes a las 00:00:00 y finaliza los Domingos)
                            </p>
                        </div>
                    </div>

                    <div className="w-full h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={stats.dataChart}
                                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient
                                        id="rendimientoGradient"
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                    >
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
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
                                    formatter={(value: any) => [
                                        `$${Number(value).toLocaleString('es-AR')}`,
                                        'Facturación'
                                    ]}
                                    labelFormatter={(label: any) => `Día: ${label}`}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="ingresos"
                                    stroke="#10b981"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#rendimientoGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Desglose de Servicios y Adicionales (1 columna) */}
                <div className="bg-white/95 backdrop-blur-sm border border-stone-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider flex items-center gap-2 mb-1">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            Composición de Ingresos
                        </h3>
                        <p className="text-xs text-stone-400 font-medium mb-4">
                            Detalle de base, nail art y descuentos
                        </p>

                        <div className="space-y-3.5">
                            <div>
                                <div className="flex justify-between text-xs font-semibold text-stone-600 mb-1">
                                    <span>Servicios Principales:</span>
                                    <span className="font-bold text-stone-800">
                                        ${stats.totalBaseServicios.toLocaleString('es-AR')}
                                    </span>
                                </div>
                                <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-stone-800 h-2 rounded-full"
                                        style={{
                                            width: `${stats.ingresos > 0 ? (stats.totalBaseServicios / stats.ingresos) * 100 : 0}%`
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-xs font-semibold text-stone-600 mb-1">
                                    <span className="flex items-center gap-1 text-emerald-700">
                                        ✨ Adicionales / Deco:
                                    </span>
                                    <span className="font-bold text-emerald-700">
                                        +${stats.totalAdicionales.toLocaleString('es-AR')}
                                    </span>
                                </div>
                                <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-emerald-500 h-2 rounded-full"
                                        style={{
                                            width: `${stats.ingresos > 0 ? (stats.totalAdicionales / stats.ingresos) * 100 : 0}%`
                                        }}
                                    />
                                </div>
                            </div>

                            {stats.totalDescuentos > 0 && (
                                <div>
                                    <div className="flex justify-between text-xs font-semibold text-rose-600 mb-1">
                                        <span>Descuentos Aplicados:</span>
                                        <span className="font-bold">
                                            -${stats.totalDescuentos.toLocaleString('es-AR')}
                                        </span>
                                    </div>
                                    <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-rose-500 h-2 rounded-full"
                                            style={{
                                                width: `${stats.ingresos > 0 ? (stats.totalDescuentos / stats.ingresos) * 100 : 0}%`
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
                                Total Neto:
                            </span>
                            <span className="text-xl font-black text-rose-600">
                                ${stats.ingresos.toLocaleString('es-AR')}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ranking de Servicios */}
            <div className="bg-white/95 backdrop-blur-sm border border-stone-200/80 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider flex items-center gap-2">
                            <Flame className="w-4 h-4 text-orange-500" />
                            Servicios Más Demandados y Rentables
                        </h3>
                        <p className="text-xs text-stone-400 font-medium">
                            Distribución de preferencias y recaudación por cada categoría de servicio en este período
                        </p>
                    </div>
                </div>

                {stats.rankingServicios.length === 0 ? (
                    <p className="text-xs text-stone-400 py-6 text-center italic">
                        No hay turnos registrados en este período.
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
                                            {s.count} {s.count === 1 ? 'turno' : 'turnos'} confirmados
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-4 pl-9 sm:pl-0">
                                    <div className="text-right">
                                        <p className="text-sm font-black text-stone-900">
                                            ${s.ingresos.toLocaleString('es-AR')}
                                        </p>
                                        <p className="text-[11px] font-bold text-emerald-600">
                                            {s.porcentaje}% del total
                                        </p>
                                    </div>
                                    <div className="w-20 hidden sm:block bg-stone-200 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-gradient-to-r from-rose-500 to-amber-500 h-2 rounded-full"
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
