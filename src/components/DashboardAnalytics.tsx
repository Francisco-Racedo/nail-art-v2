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
import { TrendingUp, Users, CalendarDays, DollarSign } from 'lucide-react'
import {
    calcularDesgloseReserva,
    getAhoraArgentina,
    getEstadoEfectivo
} from '@/lib/utils'

export default function DashboardAnalytics({ reservas }: { reservas: any[] }) {
    const [rango, setRango] = useState<7 | 15 | 30>(7)

    const stats = useMemo(() => {
        const now = getAhoraArgentina()
        now.setHours(0, 0, 0, 0)

        const getStr = (d: Date) =>
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        const dateStrStart = getStr(now)

        const limitDate = new Date(now)
        limitDate.setDate(now.getDate() + rango)
        const dateStrLimit = getStr(limitDate)

        const filtered = reservas.filter(
            r => r.fecha >= dateStrStart && r.fecha < dateStrLimit
        )

        let ingresos = 0
        let totalBaseServicios = 0
        let totalAdicionales = 0
        let totalDescuentos = 0
        let completadosConf = 0

        const mapDias = new Map<string, number>()
        for (let i = 0; i < rango; i++) {
            const d = new Date(now)
            d.setDate(now.getDate() + i)
            mapDias.set(getStr(d), 0)
        }

        filtered.forEach(r => {
            const estadoReal = getEstadoEfectivo(r)
            const isConfirmedOrFinished =
                estadoReal === 'confirmado' || estadoReal === 'completado'
            if (isConfirmedOrFinished) {
                completadosConf++
                const desglose = calcularDesgloseReserva(r)
                ingresos += desglose.totalFinal
                totalBaseServicios += desglose.precioBaseServicio
                totalAdicionales += desglose.montoAdicionales
                totalDescuentos += desglose.montoDescuento

                if (mapDias.has(r.fecha)) {
                    mapDias.set(r.fecha, mapDias.get(r.fecha)! + desglose.totalFinal)
                }
            }
        })

        const dataChart = Array.from(mapDias.entries()).map(([f, sum]) => {
            const [, m, d] = f.split('-')
            return {
                name: `${d}/${m}`,
                value: sum
            }
        })

        const activosRango = filtered.filter(r => {
            const ef = getEstadoEfectivo(r)
            return ef !== 'cancelado' && ef !== 'rechazado'
        })
        const total = activosRango.length
        const ocupacion =
            total === 0 ? 0 : Math.round((completadosConf / total) * 100)
        const reprogramadosHoy = filtered.filter(
            f => f.reprogramado && f.fecha === dateStrStart
        ).length

        return {
            ingresos,
            totalBaseServicios,
            totalAdicionales,
            totalDescuentos,
            ocupacion,
            total,
            dataChart,
            reprogramadosHoy
        }
    }, [reservas, rango])

    return (
        <div className="w-full mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-black text-stone-900 mb-1 flex items-center gap-2">
                        <TrendingUp className="text-emerald-500 w-5 h-5" />
                        Panel de Rendimiento
                    </h2>
                    <p className="text-sm text-stone-500 font-medium">
                        Proyección y métricas del local (incluye servicios base, adicionales y
                        descuentos).
                    </p>
                </div>
                <div className="mt-4 sm:mt-0">
                    <select
                        value={rango}
                        onChange={e => setRango(Number(e.target.value) as 7 | 15 | 30)}
                        className="bg-white border border-stone-200 text-stone-800 text-sm rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all cursor-pointer font-bold shadow-sm appearance-none pl-4 pr-10 relative bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M7%2010L12%2015L17%2010%22%20stroke%3D%22%2378716c%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.2em_1.2em] bg-no-repeat bg-[right_0.5rem_center]"
                    >
                        <option value={7}>Próxima Semana</option>
                        <option value={15}>Próxima Quincena</option>
                        <option value={30}>Próximo Mes</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-6">
                {/* Ingresos Proyectados */}
                <div className="bg-white/90 backdrop-blur-sm border border-orange-200/50 shadow-sm rounded-2xl p-5 transition-all duration-300 hover:bg-rose-100 hover:border-rose-300 hover:-translate-y-1 hover:shadow-md">
                    <div className="flex items-start gap-3 mb-3">
                        <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-600 shrink-0">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0 mt-1">
                            <h3 className="text-xs sm:text-sm font-bold text-stone-500 uppercase tracking-wide break-words leading-tight">
                                Proyección Bruta Total
                            </h3>
                        </div>
                    </div>
                    <p className="text-3xl font-black text-stone-900 leading-none">
                        ${stats.ingresos.toLocaleString('es-AR')}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-stone-500">
                        <span>
                            Base: ${stats.totalBaseServicios.toLocaleString('es-AR')}
                        </span>
                        {stats.totalAdicionales > 0 && (
                            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md font-bold">
                                +${stats.totalAdicionales.toLocaleString('es-AR')} adic.
                            </span>
                        )}
                        {stats.totalDescuentos > 0 && (
                            <span className="text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md font-bold">
                                -${stats.totalDescuentos.toLocaleString('es-AR')} desc.
                            </span>
                        )}
                    </div>
                </div>

                {/* Tasa de Ocupación */}
                <div className="bg-white/90 backdrop-blur-sm border border-orange-200/50 shadow-sm rounded-2xl p-5 transition-all duration-300 hover:bg-rose-100 hover:border-rose-300 hover:-translate-y-1 hover:shadow-md">
                    <div className="flex items-start gap-3 mb-3">
                        <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-100 text-indigo-600 shrink-0">
                            <Users className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0 mt-1">
                            <h3 className="text-xs sm:text-sm font-bold text-stone-500 uppercase tracking-wide break-words leading-tight">
                                Tasa Ocupación
                            </h3>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <div className="flex items-baseline gap-2 leading-none">
                            <p className="text-3xl font-black text-stone-900">
                                {stats.ocupacion}%
                            </p>
                            <span className="text-xs text-stone-400 font-bold">
                                ({stats.total} turnos gen.)
                            </span>
                        </div>
                        {stats.reprogramadosHoy > 0 && (
                            <p className="text-xs font-bold text-indigo-600 mt-1">
                                {stats.reprogramadosHoy} reprogramados hoy
                            </p>
                        )}
                    </div>
                </div>

                {/* Info Rango */}
                <div className="bg-white/90 backdrop-blur-sm border border-orange-200/50 shadow-sm rounded-2xl p-5 transition-all duration-300 hover:bg-rose-100 hover:border-rose-300 hover:-translate-y-1 hover:shadow-md flex flex-col justify-center sm:justify-start items-start sm:col-span-2 lg:col-span-1">
                    <div className="flex items-start gap-3 mb-3">
                        <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-100 text-amber-600 shrink-0">
                            <CalendarDays className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0 mt-1">
                            <h3 className="text-xs sm:text-sm font-bold text-stone-700 uppercase tracking-wide break-words leading-tight">
                                Escala Activa
                            </h3>
                        </div>
                    </div>
                    <p className="text-xs sm:text-sm text-stone-500 font-medium leading-relaxed">
                        Estas métricas contabilizan el importe total (servicio + adicionales)
                        de los turnos confirmados y completados en los próximos{' '}
                        <strong className="text-stone-800">{rango} días</strong>.
                    </p>
                </div>
            </div>

            {/* Grafico de Area */}
            <div className="bg-white/90 backdrop-blur-sm border border-orange-200/50 shadow-sm flex-1 transition-all duration-300 hover:shadow-md rounded-2xl p-5 w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={stats.dataChart}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#e7e5e4"
                        />
                        <XAxis
                            dataKey="name"
                            stroke="#78716c"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                        />
                        <YAxis
                            stroke="#78716c"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={v => `$${v.toLocaleString('es-AR')}`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#ffffff',
                                borderRadius: '1rem',
                                border: '1px solid #e7e5e4',
                                padding: '12px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            }}
                            itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                            labelStyle={{
                                color: '#78716c',
                                marginBottom: '4px',
                                fontWeight: 'bold'
                            }}
                            formatter={(value: any) => [
                                `$${Number(value).toLocaleString('es-AR')}`,
                                'Ingresos Totales'
                            ]}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#10b981"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorValue)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
