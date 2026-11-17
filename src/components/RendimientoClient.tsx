'use client'

import React, { useState, useMemo } from 'react'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar
} from 'recharts'
import {
    TrendingUp,
    Users,
    CalendarDays,
    DollarSign,
    Sparkles,
    CheckCircle2,
    XCircle,
    Receipt,
    Clock,
    Flame
} from 'lucide-react'
import {
    calcularDesgloseReserva,
    getAhoraArgentina,
    getEstadoEfectivo
} from '@/lib/utils'

interface RendimientoClientProps {
    reservas: any[]
}

type RangoTiempo = 7 | 15 | 30
type ModoAnalisis = 'proyeccion' | 'historico'

export default function RendimientoClient({ reservas }: RendimientoClientProps) {
    const [modo, setModo] = useState<ModoAnalisis>('proyeccion')
    const [rango, setRango] = useState<RangoTiempo>(7)

    const stats = useMemo(() => {
        const now = getAhoraArgentina()
        now.setHours(0, 0, 0, 0)

        const getStr = (d: Date) =>
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

        let dateStrStart: string
        let dateStrEnd: string
        const daysMap = new Map<string, { ingresos: number; turnos: number }>()

        if (modo === 'proyeccion') {
            dateStrStart = getStr(now)
            const limit = new Date(now)
            limit.setDate(now.getDate() + rango)
            dateStrEnd = getStr(limit)

            for (let i = 0; i < rango; i++) {
                const d = new Date(now)
                d.setDate(now.getDate() + i)
                daysMap.set(getStr(d), { ingresos: 0, turnos: 0 })
            }
        } else {
            const start = new Date(now)
            start.setDate(now.getDate() - rango)
            dateStrStart = getStr(start)
            dateStrEnd = getStr(now)

            for (let i = 0; i <= rango; i++) {
                const d = new Date(start)
                d.setDate(start.getDate() + i)
                daysMap.set(getStr(d), { ingresos: 0, turnos: 0 })
            }
        }

        const filtered = reservas.filter(
            r => r.fecha >= dateStrStart && r.fecha <= dateStrEnd
        )

        let ingresos = 0
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

                if (r.celular) {
                    clientesUnicos.add(r.celular.trim())
                }

                // Agrupar servicios
                const nombreLimpio = (r.servicio || 'Servicio General').split('(')[0].trim()
                const sActual = serviciosMap.get(nombreLimpio) || { count: 0, ingresos: 0 }
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

        const dataChart = Array.from(daysMap.entries()).map(([f, info]) => {
            const [, m, d] = f.split('-')
            return {
                fecha: f,
                name: `${d}/${m}`,
                ingresos: info.ingresos,
                turnos: info.turnos
            }
        })

        const totalGestionados = completadosConf + canceladosRech + ausentesCount
        const ocupacion =
            totalGestionados === 0 ? 0 : Math.round((completadosConf / totalGestionados) * 100)
        const ticketPromedio =
            completadosConf > 0 ? Math.round(ingresos / completadosConf) : 0

        // Ranking de servicios ordenados por facturación
        const rankingServicios = Array.from(serviciosMap.entries())
            .map(([nombre, data]) => ({
                nombre,
                count: data.count,
                ingresos: data.ingresos,
                porcentaje: ingresos > 0 ? Math.round((data.ingresos / ingresos) * 100) : 0
            }))
            .sort((a, b) => b.ingresos - a.ingresos)

        return {
            ingresos,
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
            rankingServicios
        }
    }, [reservas, modo, rango])

    return (
        <div className="w-full space-y-6 animate-in fade-in duration-300">
            {/* Header del Panel */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-200">
                <div>
                    <div className="flex items-center gap-2 text-rose-500 font-bold text-xs uppercase tracking-widest mb-1.5">
                        <TrendingUp className="w-4 h-4" />
                        <span>Inteligencia de Negocio</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                        Panel de Rendimiento
                    </h2>
                    <p className="text-stone-500 text-xs sm:text-sm font-medium mt-0.5">
                        Métricas financieras, tasa de ocupación y servicios más rentables de Pintaditas Nails.
                    </p>
                </div>

                {/* Filtros de Modo y Rango */}
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Selector de Modo */}
                    <div className="bg-stone-200/80 p-1 rounded-xl flex items-center shadow-inner">
                        <button
                            type="button"
                            onClick={() => setModo('proyeccion')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                modo === 'proyeccion'
                                    ? 'bg-white text-stone-900 shadow-sm'
                                    : 'text-stone-600 hover:text-stone-900'
                            }`}
                        >
                            🔮 Proyección
                        </button>
                        <button
                            type="button"
                            onClick={() => setModo('historico')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                modo === 'historico'
                                    ? 'bg-white text-stone-900 shadow-sm'
                                    : 'text-stone-600 hover:text-stone-900'
                            }`}
                        >
                            📅 Historial
                        </button>
                    </div>

                    {/* Selector de Rango */}
                    <div className="bg-white border border-stone-200 p-1 rounded-xl flex items-center shadow-sm">
                        <button
                            type="button"
                            onClick={() => setRango(7)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                rango === 7
                                    ? 'bg-rose-500 text-white shadow-sm'
                                    : 'text-stone-600 hover:bg-stone-100'
                            }`}
                        >
                            Semana (7d)
                        </button>
                        <button
                            type="button"
                            onClick={() => setRango(15)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                rango === 15
                                    ? 'bg-rose-500 text-white shadow-sm'
                                    : 'text-stone-600 hover:bg-stone-100'
                            }`}
                        >
                            Quincena (15d)
                        </button>
                        <button
                            type="button"
                            onClick={() => setRango(30)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                rango === 30
                                    ? 'bg-rose-500 text-white shadow-sm'
                                    : 'text-stone-600 hover:bg-stone-100'
                            }`}
                        >
                            Mes (30d)
                        </button>
                    </div>
                </div>
            </div>

            {/* Tarjetas Principales de KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Facturación / Proyección Total */}
                <div className="bg-white/95 backdrop-blur-sm border border-stone-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                            {modo === 'proyeccion' ? 'Facturación Estimada' : 'Facturación Cobrada'}
                        </span>
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                            <DollarSign className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-stone-900 leading-none">
                        ${stats.ingresos.toLocaleString('es-AR')}
                    </p>
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
                        Promedio generado por cada turno realizado en este período.
                    </p>
                </div>

                {/* 3. Tasa de Ocupación y Cumplimiento */}
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
                        Personas únicas con turnos confirmados en el intervalo.
                    </p>
                </div>
            </div>

            {/* Gráfico de Evolución y Desglose */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Gráfico de Área (2 columnas) */}
                <div className="lg:col-span-2 bg-white/95 backdrop-blur-sm border border-stone-200/80 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-emerald-500" />
                                Curva de Facturación ({modo === 'proyeccion' ? 'Próximos' : 'Últimos'} {rango} días)
                            </h3>
                            <p className="text-xs text-stone-400 font-medium">
                                Evolución diaria de ingresos brutos generados por turnos
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
                                    <linearGradient id="rendimientoGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
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
                                        'Facturación'
                                    ]}
                                    labelFormatter={(label: any) => `Fecha: ${label}`}
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
                            Desglose de origen de fondos
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
                                        ✨ Adicionales / Nail Art:
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
                                Total Neto Estimado:
                            </span>
                            <span className="text-xl font-black text-rose-600">
                                ${stats.ingresos.toLocaleString('es-AR')}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ranking de Servicios más Solicitados */}
            <div className="bg-white/95 backdrop-blur-sm border border-stone-200/80 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider flex items-center gap-2">
                            <Flame className="w-4 h-4 text-orange-500" />
                            Servicios Más Demandados y Rentables
                        </h3>
                        <p className="text-xs text-stone-400 font-medium">
                            Distribución de preferencias y recaudación por cada categoría de servicio
                        </p>
                    </div>
                </div>

                {stats.rankingServicios.length === 0 ? (
                    <p className="text-xs text-stone-400 py-6 text-center italic">
                        No hay turnos registrados en este rango de fechas.
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
