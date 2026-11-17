import React from 'react'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { Reserva, formatDateStr, getEstadoEfectivo, getHoyUTC3 } from './agendaTypes'

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
const dayHeaders = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

interface WeekNavigatorProps {
    viewDate: Date
    handlePrevMonth: () => void
    handleNextMonth: () => void
    handleGoToday: () => void
    selectedDate: Date
    setSelectedDate: (d: Date) => void
    reservas: Reserva[]
    jornadasEspeciales?: { fecha: string; tipo: 'cerrado' | 'reducido'; motivo?: string }[]
    mesesVisiblesCliente?: number
    onChangeMesesVisiblesCliente?: (meses: number) => void
}

function buildMonthCells(year: number, month0: number): (Date | null)[] {
    const firstDay = new Date(year, month0, 1)
    const lastDay = new Date(year, month0 + 1, 0)
    const totalDays = lastDay.getDate()

    // Lunes = 0 ... Domingo = 6
    const startOffset = (firstDay.getDay() + 6) % 7
    const cells: (Date | null)[] = []

    for (let i = 0; i < startOffset; i++) {
        cells.push(null)
    }
    for (let d = 1; d <= totalDays; d++) {
        cells.push(new Date(year, month0, d))
    }
    return cells
}

export default function WeekNavigator({
    viewDate,
    handlePrevMonth,
    handleNextMonth,
    handleGoToday,
    selectedDate,
    setSelectedDate,
    reservas,
    jornadasEspeciales = [],
    mesesVisiblesCliente = 3,
    onChangeMesesVisiblesCliente
}: WeekNavigatorProps) {
    const hoyStr = getHoyUTC3()
    const selectedStr = formatDateStr(selectedDate)

    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const monthTitle = `${monthNames[month]} ${year}`
    const cells = React.useMemo(() => buildMonthCells(year, month), [year, month])

    // Agrupar reservas activas por fecha para mostrar contadores en cada día del mes
    const statsPorFecha = React.useMemo(() => {
        const map = new Map<
            string,
            { total: number; pendientes: number; confirmados: number; completados: number }
        >()
        for (const r of reservas) {
            const ef = getEstadoEfectivo(r)
            if (ef === 'cancelado') continue
            const cur = map.get(r.fecha) || {
                total: 0,
                pendientes: 0,
                confirmados: 0,
                completados: 0
            }
            cur.total += 1
            if (ef === 'pendiente' || ef === 'reprogramar') cur.pendientes += 1
            if (ef === 'confirmado') cur.confirmados += 1
            if (ef === 'completado') cur.completados += 1
            map.set(r.fecha, cur)
        }
        return map
    }, [reservas])

    const jornadasMap = React.useMemo(() => {
        const m = new Map<string, { tipo: 'cerrado' | 'reducido'; motivo?: string }>()
        for (const j of jornadasEspeciales) {
            m.set(j.fecha, j)
        }
        return m
    }, [jornadasEspeciales])

    return (
        <div className="mb-6 pb-6 border-b border-stone-200">
            {/* Barra superior: navegación de mes + selector de meses habilitados para clientes */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200/80 rounded-2xl p-1.5 shadow-sm">
                        <button
                            type="button"
                            onClick={handlePrevMonth}
                            title="Mes anterior"
                            className="p-2 text-stone-600 hover:text-stone-900 hover:bg-white rounded-xl transition"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="px-3 text-sm sm:text-base font-black text-stone-900 tracking-tight min-w-[140px] text-center">
                            {monthTitle}
                        </span>
                        <button
                            type="button"
                            onClick={handleNextMonth}
                            title="Mes siguiente"
                            className="p-2 text-stone-600 hover:text-stone-900 hover:bg-white rounded-xl transition"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={handleGoToday}
                        className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition"
                    >
                        Ir a Hoy
                    </button>
                </div>

                {/* Control del dueño: decidir cuántos meses ve el cliente en el calendario público */}
                {onChangeMesesVisiblesCliente && (
                    <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2 bg-rose-50/70 border border-rose-200 rounded-2xl px-3.5 py-2 shadow-sm">
                        <div className="flex items-center gap-1.5">
                            <CalendarDays className="w-4 h-4 text-rose-500 shrink-0" />
                            <label
                                htmlFor="selectMesesCliente"
                                className="text-xs font-bold text-stone-700"
                            >
                                Meses visibles cliente:
                            </label>
                        </div>
                        <select
                            id="selectMesesCliente"
                            value={mesesVisiblesCliente}
                            onChange={e =>
                                onChangeMesesVisiblesCliente(Number(e.target.value))
                            }
                            className="bg-white border border-rose-300 text-rose-700 font-black text-xs rounded-xl px-2.5 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-400"
                        >
                            <option value={1}>1 mes</option>
                            <option value={2}>2 meses</option>
                            <option value={3}>3 meses</option>
                            <option value={4}>4 meses</option>
                            <option value={6}>6 meses</option>
                            <option value={12}>12 meses</option>
                        </select>
                    </div>
                )}
            </div>

            {/* Recuadro único del calendario mensual completo */}
            <div className="bg-stone-50/70 border border-stone-200/80 rounded-2xl p-3.5 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3 px-1">
                    <h4 className="text-sm font-black text-stone-800 uppercase tracking-wider">
                        Calendario de {monthTitle}
                    </h4>
                    <span className="text-[11px] text-stone-500 font-semibold">
                        Tocá cualquier día para ver o asignar turnos (08:30 a 20:00 hs)
                    </span>
                </div>

                <div className="grid grid-cols-7 gap-1.5 text-center mb-2">
                    {dayHeaders.map((dh, idx) => (
                        <div
                            key={dh}
                            className={`text-[11px] font-bold uppercase tracking-wider py-1 ${
                                idx === 6 ? 'text-rose-400' : 'text-stone-400'
                            }`}
                        >
                            {dh}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {cells.map((dateObj, idx) => {
                        if (!dateObj) {
                            return <div key={`empty-${idx}`} className="h-14 sm:h-16" />
                        }

                        const fStr = formatDateStr(dateObj)
                        const isSelected = fStr === selectedStr
                        const isToday = fStr === hoyStr
                        const isSunday = dateObj.getDay() === 0
                        const esDomDic = isSunday && dateObj.getMonth() === 11
                        const jornada = jornadasMap.get(fStr)
                        const isClosed =
                            jornada?.tipo === 'cerrado' ||
                            (jornada?.tipo === 'reducido' &&
                                Array.isArray((jornada as any).horarios) &&
                                (jornada as any).horarios.length === 0) ||
                            (isSunday && !jornada && !esDomDic)
                        const st = statsPorFecha.get(fStr)

                        let cardCls =
                            'bg-white border-stone-200 text-stone-800 hover:border-rose-300 hover:bg-rose-50/40'
                        if (isClosed) {
                            cardCls =
                                'bg-stone-100/70 border-stone-200/60 text-stone-400 hover:border-stone-300'
                        } else if (st && st.pendientes > 0) {
                            cardCls =
                                'bg-amber-50/90 border-amber-300 text-stone-900 hover:bg-amber-100/70'
                        } else if (st && st.total >= 6) {
                            cardCls =
                                'bg-rose-50 border-rose-300 text-stone-900 hover:bg-rose-100/70'
                        } else if (st && st.total > 0) {
                            cardCls =
                                'bg-emerald-50/80 border-emerald-300 text-stone-900 hover:bg-emerald-100/70'
                        }

                        if (isSelected) {
                            cardCls =
                                'bg-stone-900 border-stone-900 text-white shadow-md scale-[1.02] ring-2 ring-rose-400/50'
                        }

                        return (
                            <button
                                key={fStr}
                                type="button"
                                onClick={() => setSelectedDate(dateObj)}
                                className={`relative h-14 sm:h-16 rounded-xl border p-1.5 flex flex-col items-center justify-between transition-all ${cardCls}`}
                            >
                                <div className="w-full flex items-center justify-between px-0.5">
                                    <span
                                        className={`text-xs sm:text-sm font-black leading-none ${
                                            isSelected
                                                ? 'text-white'
                                                : isClosed
                                                  ? 'text-stone-400'
                                                  : 'text-stone-800'
                                        }`}
                                    >
                                        {dateObj.getDate()}
                                    </span>
                                    {isToday && (
                                        <span
                                            className={`text-[9px] font-black px-1 rounded ${
                                                isSelected
                                                    ? 'bg-rose-500 text-white'
                                                    : 'bg-rose-100 text-rose-700'
                                            }`}
                                        >
                                            HOY
                                        </span>
                                    )}
                                </div>

                                <div className="w-full flex items-center justify-center">
                                    {st && st.total > 0 ? (
                                        <span
                                            className={`text-[9px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.5 rounded-full leading-none truncate ${
                                                isSelected
                                                    ? 'bg-white/20 text-white'
                                                    : st.pendientes > 0
                                                      ? 'bg-amber-200/90 text-amber-900'
                                                      : 'bg-emerald-200/80 text-emerald-900'
                                            }`}
                                        >
                                            {st.total}
                                            <span className="hidden sm:inline">
                                                {' '}
                                                {st.total === 1 ? 'turno' : 'turnos'}
                                            </span>
                                            <span className="sm:hidden">t</span>
                                        </span>
                                    ) : isClosed ? (
                                        <span
                                            className={`text-[8px] sm:text-[9px] font-semibold truncate ${
                                                isSelected
                                                    ? 'text-stone-300'
                                                    : 'text-stone-400'
                                            }`}
                                        >
                                            <span className="hidden sm:inline">Cerrado</span>
                                            <span className="sm:hidden">—</span>
                                        </span>
                                    ) : (
                                        <span
                                            className={`text-[8px] sm:text-[9px] font-medium truncate ${
                                                isSelected
                                                    ? 'text-emerald-300'
                                                    : 'text-emerald-600/80'
                                            }`}
                                        >
                                            <span className="hidden sm:inline">Libre</span>
                                            <span className="sm:hidden">●</span>
                                        </span>
                                    )}
                                </div>
                            </button>
                        )
                    })}
                </div>

                {/* Leyenda rápida */}
                <div className="flex flex-wrap items-center justify-center gap-4 mt-3 pt-3 border-t border-stone-200/60 text-xs text-stone-600 font-medium">
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-white border border-stone-300" /> Libre
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300" /> Con pendientes
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" /> Confirmados
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-stone-200 border border-stone-300" /> Domingo / Cerrado
                    </span>
                </div>
            </div>
        </div>
    )
}
