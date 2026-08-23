'use client'

import { useQuery } from '@tanstack/react-query'
import { useState, useCallback, useEffect } from 'react'

interface Config {
    hora_inicio: string
    hora_fin: string
    intervalo_minutos: string
}

interface Servicio {
    id: number
    nombre: string
    precio: number
    categoria: string
}

async function fetchConfig(): Promise<Config> {
    const res = await fetch('/api/config')
    return res.json()
}

async function fetchServicios(): Promise<Servicio[]> {
    const res = await fetch('/api/servicios')
    if (!res.ok) throw new Error('Error')
    return res.json()
}

const DEFAULT_CONFIG: Config = { hora_inicio: '10:00', hora_fin: '20:00', intervalo_minutos: '90' }

function buildHorarios(cfg: Config): string[] {
    const horarios: string[] = []
    const [hi, mi] = cfg.hora_inicio.split(':').map(Number)
    const [hf, mf] = cfg.hora_fin.split(':').map(Number)
    const intervalo = parseInt(cfg.intervalo_minutos) || 90
    let mins = hi * 60 + mi
    const fin = hf * 60 + mf
    while (mins < fin) {
        horarios.push(`${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`)
        mins += intervalo
    }
    return horarios
}

export default function AgendadorTurnos() {
    // useQuery reemplaza a todos los useEffect manuales - tiene caché de 5 minutos
    const { data: config = DEFAULT_CONFIG } = useQuery({ queryKey: ['config'], queryFn: fetchConfig })
    const { data: servicios = [] } = useQuery({ queryKey: ['servicios'], queryFn: fetchServicios })

    const [horariosBase, setHorariosBase] = useState<string[]>([])
    const [ocupados, setOcupados] = useState<string[]>([])
    const [fecha, setFecha] = useState('')
    const [horario, setHorario] = useState<string | null>(null)
    const [nombre, setNombre] = useState('')
    const [servicio, setServicio] = useState('')
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [reservaId, setReservaId] = useState<number | null>(null)

    const hoy = new Date().toISOString().split('T')[0]

    useEffect(() => {
        setHorariosBase(buildHorarios(config))
    }, [config])

    const handleFechaChange = useCallback(async (val: string) => {
        setFecha(val)
        setHorario(null)
        const partes = val.split('-')
        const d = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]))
        if (d.getDay() === 0) {
            alert('Los días domingo nos encontramos descansando. Por favor selecciona un día de Lunes a Sábado.')
            setFecha('')
            setOcupados([])
            return
        }
        const res = await fetch(`/api/reservas/${val}`)
        const data = await res.json()
        setOcupados(data.ocupados ?? [])
    }, [])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!fecha || !horario) { alert('Por favor seleccioná una fecha y un horario.'); return }
        setLoading(true)
        const res = await fetch('/api/reservas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, servicio, fecha, horario })
        })
        const data = await res.json()
        setLoading(false)
        if (res.ok) { setSubmitted(true); setReservaId(data.id) }
        else alert(data.error || 'Error al reservar')
    }

    function getWhatsapp() {
        const fechaLatam = fecha.split('-').reverse().join('-')
        const msg = `*NUEVO TURNO - FRAN & ROMY NAILS*\n\nHola! Hice la reserva a través de la web.\n*Soy:* ${nombre}\n*Servicio:* ${servicio}\n*Día:* ${fechaLatam}\n*Horario:* ${horario}\n\n¿Confirmas turno? 💅`
        return `https://wa.me/5493813013850?text=${encodeURIComponent(msg)}`
    }

    function getCalendar() {
        const [y, mo, d] = fecha.split('-')
        const [h, mi] = (horario ?? '10:00').split(':')
        const start = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi))
        const end = new Date(start.getTime() + 90 * 60000)
        const fmt = (dt: Date) => dt.toISOString().replace(/-|:|\.\d{3}/g, '')
        return `https://calendar.google.com/calendar/r/eventedit?text=Turno+Fran+%26+Romy+Nails&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent('Turno para ' + servicio)}&location=Lules,+Tucuman`
    }

    const grupos: Record<string, Servicio[]> = {}
    servicios.forEach(s => { if (!grupos[s.categoria]) grupos[s.categoria] = []; grupos[s.categoria].push(s) })

    return (
        <section id="reserva" className="py-24 bg-[#FAF3EE] border-t border-rose-100">
            <div className="container mx-auto px-6 max-w-4xl">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 text-zinc-900" style={{ fontFamily: 'serif' }}>
                        Agenda tu{' '}
                        <span style={{ background: 'linear-gradient(to right, #C59B27, #E5C158, #C59B27)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                            Turno
                        </span>
                    </h2>
                    <p className="text-zinc-500 max-w-lg mx-auto">Seleccioná el día y horario disponible. Te confirmaremos por WhatsApp.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                    {/* Panel Fechas */}
                    <div className="bg-white/60 backdrop-blur-sm border border-amber-100 p-6 rounded-2xl shadow-md md:col-span-2 h-fit">
                        <h3 className="text-lg font-bold mb-4 text-zinc-800 flex items-center gap-2 border-b border-zinc-100 pb-3">
                            <span className="text-amber-500">📅</span> 1. Fecha y Hora
                        </h3>
                        <label className="block text-zinc-600 text-sm mb-2 font-medium">Seleccioná un día</label>
                        <input
                            type="date"
                            value={fecha}
                            min={hoy}
                            onChange={e => handleFechaChange(e.target.value)}
                            className="w-full p-3 mb-6 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
                        />
                        <label className="block text-zinc-600 text-sm mb-2 font-medium">Horarios Disponibles</label>
                        <div className="grid grid-cols-3 gap-2">
                            {horariosBase.map(h => (
                                <button
                                    key={h}
                                    type="button"
                                    disabled={ocupados.includes(h)}
                                    onClick={() => setHorario(h)}
                                    className={`py-2 text-sm font-medium rounded-lg border transition duration-200 ${ocupados.includes(h)
                                            ? 'bg-gray-100 text-gray-400 line-through border-gray-200 cursor-not-allowed'
                                            : horario === h
                                                ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-white border-transparent shadow'
                                                : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:border-amber-400'
                                        }`}
                                >
                                    {ocupados.includes(h) ? `${h} ❌` : h}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-zinc-400 mt-4 text-center">Solo mostramos horarios con disponibilidad para la fecha elegida.</p>
                    </div>

                    {/* Panel Datos */}
                    <div className="bg-white/60 backdrop-blur-sm border border-amber-100 p-6 rounded-2xl shadow-md md:col-span-3">
                        <h3 className="text-lg font-bold mb-4 text-zinc-800 flex items-center gap-2 border-b border-zinc-100 pb-3">
                            <span className="text-rose-500">📝</span> 2. Tus Datos
                        </h3>

                        {submitted ? (
                            <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4">
                                <div className="font-bold mb-1">¡Turno Reservado con Éxito!</div>
                                <p className="text-sm mb-3">Tu horario fue bloqueado. Para confirmar, envianos un WhatsApp o agregalo a tu calendario.</p>
                                <div className="flex gap-2">
                                    <a href={getWhatsapp()} target="_blank" rel="noopener noreferrer"
                                        className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm py-2 px-3 rounded-lg font-semibold transition text-center">
                                        WhatsApp
                                    </a>
                                    <a href={getCalendar()} target="_blank" rel="noopener noreferrer"
                                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 px-3 rounded-lg font-semibold transition text-center">
                                        📅 Google Calendar
                                    </a>
                                </div>
                                <button onClick={() => { setSubmitted(false); setFecha(''); setHorario(null); setNombre(''); setServicio('') }}
                                    className="mt-3 w-full text-zinc-500 text-sm hover:text-zinc-700 transition">
                                    Hacer otra reserva
                                </button>
                                {reservaId && <p className="text-xs text-zinc-400 mt-2 text-center">Reserva #{reservaId}</p>}
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5">
                                <div>
                                    <label className="block text-zinc-600 text-sm mb-2 font-medium">Nombre Completo</label>
                                    <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required placeholder="Ej: María Gómez"
                                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400 transition" />
                                </div>
                                <div>
                                    <label className="block text-zinc-600 text-sm mb-2 font-medium">¿Qué te gustaría hacerte?</label>
                                    <select value={servicio} onChange={e => setServicio(e.target.value)} required
                                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400 transition">
                                        <option value="">Elegí un servicio...</option>
                                        {Object.keys(grupos).map(cat => (
                                            <optgroup key={cat} label={cat.toUpperCase() + (cat === 'Promos' ? ' 🔥' : '')}>
                                                {grupos[cat].map(s => (
                                                    <option key={s.id} value={`${s.nombre} ($${s.precio.toLocaleString('es-AR')})`}>
                                                        {s.nombre} (${s.precio.toLocaleString('es-AR')})
                                                    </option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                </div>
                                <button type="submit" disabled={loading}
                                    className="w-full mt-4 text-white font-bold py-4 rounded-xl hover:opacity-90 transition duration-300 shadow-md text-lg disabled:opacity-60"
                                    style={{ background: 'linear-gradient(to right, #C59B27, #E5C158, #C59B27)' }}>
                                    {loading ? 'Procesando...' : 'Confirmar Reserva'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </section>
    )
}
