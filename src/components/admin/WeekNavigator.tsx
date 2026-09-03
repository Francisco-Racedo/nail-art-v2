import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDateStr } from './agendaTypes'

const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
const dayNamesShort = ["lun", "mar", "mié", "jue", "vie", "sáb"]

interface WeekNavigatorProps {
    viewDate: Date;
    handlePrevWeek: () => void;
    handleNextWeek: () => void;
    weekDays: Date[];
    selectedDate: Date;
    setSelectedDate: (d: Date) => void;
    startOfWeek: Date;
}

export default function WeekNavigator({ viewDate, handlePrevWeek, handleNextWeek, weekDays, selectedDate, setSelectedDate, startOfWeek }: WeekNavigatorProps) {
    const currentMonthLabel = `${monthNames[viewDate.getMonth()]} de ${viewDate.getFullYear()}`

    return (
        <>
            <div className="flex items-center justify-between bg-white/80 border border-orange-200/50 rounded-2xl p-2 max-w-sm mx-auto mb-6 shadow-sm">
                <button onClick={handlePrevWeek} className="p-3 text-stone-500 hover:text-stone-900 hover:bg-stone-50 rounded-xl transition">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-stone-800 font-bold tracking-wide capitalize">{currentMonthLabel}</span>
                <button onClick={handleNextWeek} className="p-3 text-stone-500 hover:text-stone-900 hover:bg-stone-50 rounded-xl transition">
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            <div className="grid grid-cols-6 gap-1.5 md:gap-4 justify-items-center w-full max-w-3xl mx-auto pb-6 mb-4 border-b border-stone-300">
                {weekDays.map((date, i) => {
                    const isSelected = formatDateStr(date) === formatDateStr(selectedDate)
                    return (
                        <button
                            key={i}
                            onClick={() => setSelectedDate(date)}
                            className={`flex flex-col items-center justify-center w-full aspect-[4/5] max-w-[72px] rounded-[1rem] md:rounded-[1.25rem] border transform transition-all duration-300 hover:scale-105 hover:shadow-md active:scale-95 ${isSelected ? 'bg-stone-900 border-stone-800 shadow-lg md:scale-110' : 'bg-white border-stone-300 hover:bg-stone-50 hover:border-rose-200'} ${date < startOfWeek ? 'opacity-50' : ''}`}
                        >
                            <span className={`text-[10px] md:text-xs tracking-wide font-bold mb-0.5 md:mb-1 ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>
                                {dayNamesShort[i % 6]}
                            </span>
                            <span className={`text-sm md:text-2xl font-black ${isSelected ? 'text-white' : 'text-stone-700'}`}>
                                {date.getDate()}
                            </span>
                        </button>
                    )
                })}
            </div>
        </>
    )
}
