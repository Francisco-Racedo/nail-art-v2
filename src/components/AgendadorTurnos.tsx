'use client'

import { useQuery } from '@tanstack/react-query'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const FormVisitanteSchema = z.object({
    nombre: z.string()
        .min(3, "Debe tener al menos 3 caracteres")
        .max(50, "Máximo 50 caracteres")
        .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "Solo se permiten letras y espacios"),
    celular: z.string().min(8, "El número de WhatsApp es muy corto"),
    email: z.string().email("Correo inválido").or(z.literal('')),
    fechaNacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato incorrecto"),
    servicio: z.string().min(1, 'El servicio es requerido'),
    metodoPago: z.enum(['mp', 'transferencia'])
})

type FormData = z.infer<typeof FormVisitanteSchema>

interface Config {
    hora_inicio: string
    hora_fin: string
    intervalo_minutos: string
    nombre_negocio?: string
    whatsapp_numero?: string
}

interface Servicio {
    id: number
    nombre: string
    precio: number
    categoria: string
}

async function fetchConfig(): Promise<Config> {
    const res = await fetch('/api/config', { cache: 'no-store' })
    return res.json()
}

async function fetchServicios(): Promise<Servicio[]> {
    const res = await fetch('/api/servicios', { cache: 'no-store' })
    if (!res.ok) throw new Error('Error')
    return res.json()
}

const DEFAULT_CONFIG: Config = {
    hora_inicio: '10:00',
    hora_fin: '20:00',
    intervalo_minutos: '90',
    nombre_negocio: 'Fran & Romy Nails',
    whatsapp_numero: '5493813013850',
}

import { generarHorariosDisponibles } from '../lib/utils'

export default function AgendadorTurnos() {
    const { data: config = DEFAULT_CONFIG } = useQuery({ queryKey: ['config'], queryFn: fetchConfig, refetchInterval: 5000 })
    const { data: servicios = [] } = useQuery({ queryKey: ['servicios'], queryFn: fetchServicios, refetchInterval: 5000 })

    const [fecha, setFecha] = useState('')
    const [horario, setHorario] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [wppEnviado, setWppEnviado] = useState(false)
    const [montoAbonar, setMontoAbonar] = useState(0)
    const [reservaId, setReservaId] = useState<number | null>(null)
    const [domingoError, setDomingoError] = useState(false)
    const [hoy, setHoy] = useState('')
    const dateInputRef = useRef<HTMLInputElement>(null)

    // Tarea 1: REACT-HOOK-FORM (Eliminación de Primitive State Hell y fugas de renders)
    const { register, handleSubmit, formState: { errors }, watch, setValue, reset } = useForm<FormData>({
        resolver: zodResolver(FormVisitanteSchema),
        defaultValues: {
            nombre: '',
            celular: '',
            email: '',
            fechaNacimiento: '',
            servicio: '',
            metodoPago: 'mp'
        }
    })

    const watchNombre = watch('nombre')
    const watchServicio = watch('servicio')
    const watchMetodoPago = watch('metodoPago')
    const watchFechaNac = watch('fechaNacimiento')

    const dateRefHook = register('fechaNacimiento')

    useEffect(() => {
        const d = new Date()
        setHoy(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    }, [])

    const horariosBase = generarHorariosDisponibles(config.hora_inicio, config.hora_fin, config.intervalo_minutos)

    // TAREA 2: REACT QUERY FETCHING (Reemplazo de callbacks rudimentarios)
    const { data: ocupados = [] } = useQuery({
        queryKey: ['ocupados', fecha],
        queryFn: async () => {
            if (!fecha || domingoError) return []
            const res = await fetch(`/api/reservas/${fecha}?t=${new Date().getTime()}`, { cache: 'no-store' })
            const data = await res.json()
            return data.ocupados ?? []
        },
        enabled: !!fecha && !domingoError,
        refetchOnWindowFocus: true
    })

    const handleFechaChange = (val: string) => {
        setFecha(val)
        setHorario(null)
        setDomingoError(false)
        if (!val) return
        const partes = val.split('-')
        const d = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]))
        if (d.getDay() === 0) {
            setDomingoError(true)
            setFecha('')
        }
    }

    const handleLimpiarFormulario = () => {
        setFecha('')
        setHorario(null)
        setDomingoError(false)
        reset() // Limpia react-hook-form completo automágicamente
    }

    async function onSubmit(data: FormData) {
        if (!fecha || !horario) return alert('Por favor seleccioná una fecha y un horario.')

        setLoading(true)
        const res = await fetch('/api/reservas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre: data.nombre,
                servicio: data.servicio,
                fecha,
                horario,
                celular: data.celular,
                email: data.email,
                fecha_nacimiento: data.fechaNacimiento,
                metodo_pago: data.metodoPago
            })
        })
        const result = await res.json()
        setLoading(false)
        if (res.ok) {
            if (result.initPoint) return window.location.href = result.initPoint
            setSubmitted(true)
            setReservaId(result.id)
            if (result.montoSena) setMontoAbonar(result.montoSena)
        } else {
            alert(result.error || 'Error al reservar')
        }
    }

    function getWhatsapp() {
        const negocio = config.nombre_negocio || DEFAULT_CONFIG.nombre_negocio
        const numero = config.whatsapp_numero || DEFAULT_CONFIG.whatsapp_numero
        const fechaLatam = fecha.split('-').reverse().join('/')
        const msg = watchMetodoPago === 'transferencia'
            ? `*NUEVO TURNO - COMPROBANTE*\n\nHola! Hice una reserva para ${watchServicio} a nombre de ${watchNombre}.\nAdjunto comprobante por $${montoAbonar.toLocaleString('es-AR')}.\n\nDía: ${fechaLatam} a las ${horario}hs.\n¿Me envían confirmación? 💅`
            : `*NUEVO TURNO - ${negocio!.toUpperCase()}*\n\nHola! Hice la reserva en la web.\n*Modo:* Efectivo VIP\n*Soy:* ${watchNombre}\n*Servicio:* ${watchServicio}\n*Día:* ${fechaLatam} a las ${horario}hs.\n\n¿Confirmas turno? 💅`
        return `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`
    }

    function getCalendar() {
        const [y, mo, d] = fecha.split('-')
        const [h, mi] = (horario ?? '10:00').split(':')
        const intervalo = parseInt(config.intervalo_minutos) || 90
        const negocio = config.nombre_negocio || DEFAULT_CONFIG.nombre_negocio
        const start = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi))
        const end = new Date(start.getTime() + intervalo * 60000)
        const fmt = (dt: Date) => {
            const y = dt.getFullYear()
            const m = String(dt.getMonth() + 1).padStart(2, '0')
            const dStr = String(dt.getDate()).padStart(2, '0')
            const h = String(dt.getHours()).padStart(2, '0')
            const min = String(dt.getMinutes()).padStart(2, '0')
            const s = String(dt.getSeconds()).padStart(2, '0')
            return `${y}${m}${dStr}T${h}${min}${s}`
        }
        return `https://calendar.google.com/calendar/r/eventedit?text=Turno+${encodeURIComponent(negocio!)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent('Turno para ' + watchServicio)}&location=Lules,+Tucuman`
    }

    const grupos: Record<string, Servicio[]> = {}
    servicios.forEach(s => { if (!grupos[s.categoria]) grupos[s.categoria] = []; grupos[s.categoria].push(s) })

    return (
        <section id="reserva" className="py-24 bg-gradient-to-br from-pink-100 via-rose-50 to-orange-100 relative overflow-hidden">
            {/* Orbes gigantes luminosos */}
            <div className="absolute -top-20 -left-10 w-[500px] h-[500px] bg-fuchsia-300/40 rounded-full blur-[90px] pointer-events-none z-0"></div>
            <div className="absolute -bottom-20 -right-10 w-[500px] h-[500px] bg-orange-300/40 rounded-full blur-[90px] pointer-events-none z-0"></div>

            <div className="container mx-auto px-6 max-w-5xl relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold mb-4 text-[#2C2421] tracking-tight" style={{ fontFamily: 'serif' }}>
                        Agenda tu Turno
                    </h2>
                    <p className="text-[#2C2421]/70 max-w-lg mx-auto font-light tracking-wide text-base">
                        Seleccioná el día y horario disponible. Te confirmaremos por WhatsApp.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                    {/* Panel Fechas */}
                    {!submitted && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="bg-gradient-to-br from-pink-300/60 via-rose-200/60 to-orange-300/60 backdrop-blur-xl relative z-10 border border-white/60 shadow-2xl shadow-pink-900/10 rounded-[2rem] p-8 md:p-10 md:col-span-2 flex flex-col"
                        >
                            <h3 className="text-xl font-semibold tracking-wide mb-6 text-[#2C2421] flex items-center gap-2 border-b border-[#2C2421]/10 pb-4" style={{ fontFamily: 'serif' }}>
                                1. Fecha y Hora
                            </h3>

                            <label className="block text-[#2C2421]/80 text-sm mb-2 font-medium">Seleccioná un día</label>

                            <div className="relative w-full mb-2">
                                <input
                                    type="date"
                                    value={fecha}
                                    min={hoy}
                                    onChange={e => handleFechaChange(e.target.value)}
                                    className={`w-full min-h-[3rem] p-4 bg-white/95 text-stone-700 border ${domingoError ? 'border-red-400 focus:ring-red-100' : 'border-pink-200 focus:ring-pink-200/50'} rounded-xl focus:outline-none focus:ring-4 transition-all block`}
                                />
                                {!fecha && (
                                    <div className="absolute top-[2px] bottom-[2px] left-[2px] right-[40px] bg-white flex items-center px-4 pointer-events-none rounded-l-xl opacity-100 z-10">
                                        <span className="text-stone-400 pointer-events-none select-none">Seleccioná un día</span>
                                    </div>
                                )}
                            </div>

                            {domingoError && (
                                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-start gap-3 shadow-sm animate-pulse">
                                    <span className="text-xl">⛔</span>
                                    <div>
                                        <strong>¡Descansamos los Domingos!</strong>
                                        <p className="mt-1 opacity-80 font-light">Por favor selecciona un día entre Lunes y Sábado.</p>
                                    </div>
                                </div>
                            )}

                            <label className="block text-[#2C2421]/80 text-sm mb-3 font-medium mt-6">Horarios Disponibles</label>
                            {fecha && !domingoError ? (
                                <>
                                    <div className="grid grid-cols-3 gap-3 flex-wrap">
                                        {horariosBase.map(h => {
                                            const ocupadoInfo = ocupados.find((o: any) => o.horario.substring(0, 5) === h)
                                            const isSelected = horario === h
                                            const estado = ocupadoInfo ? (ocupadoInfo.estado || 'pendiente') : 'disponible'

                                            const ESTILOS_HORARIO: Record<string, string> = {
                                                selected: 'bg-gradient-to-r from-fuchsia-600 to-orange-500 text-white font-bold shadow-lg shadow-fuchsia-500/40 border-none scale-105',
                                                disponible: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:scale-105 shadow-sm',
                                                pendiente: 'bg-orange-100 text-orange-800 border-orange-300 opacity-90 cursor-not-allowed',
                                                confirmado: 'bg-stone-200 text-stone-500 border-stone-300 cursor-not-allowed line-through',
                                                completado: 'bg-stone-200 text-stone-500 border-stone-300 cursor-not-allowed line-through'
                                            }

                                            const btnClasses = isSelected ? ESTILOS_HORARIO.selected : ESTILOS_HORARIO[estado]

                                            return (
                                                <button
                                                    key={h}
                                                    type="button"
                                                    disabled={!!ocupadoInfo}
                                                    onClick={() => setHorario(h)}
                                                    className={`py-3 flex items-center justify-center gap-1 text-sm rounded-xl transition-all duration-300 border font-medium ${btnClasses}`}
                                                >
                                                    {h}
                                                    {(estado === 'confirmado' || estado === 'completado') && <span>🔒</span>}
                                                </button>
                                            )
                                        })}
                                    </div>
                                    <div className="flex gap-3 text-xs justify-center mt-6 text-stone-600 font-medium">
                                        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-300"></span> Disponible</div>
                                        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-300"></span> Reservado</div>
                                        <div className="flex items-center gap-1.5">🔒 Confirmado</div>
                                    </div>
                                </>
                            ) : (
                                <div className="bg-white/40 border border-pink-100/50 text-[#2C2421]/50 text-sm p-4 rounded-xl text-center italic font-light mt-2 flex-grow flex items-center justify-center">
                                    {domingoError ? 'Selecciona otro día' : 'Ingresa una fecha para ver disponibilidad'}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Panel Datos */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className={`bg-gradient-to-br from-pink-300/60 via-rose-200/60 to-orange-300/60 backdrop-blur-xl relative z-10 border border-white/60 shadow-2xl shadow-pink-900/10 rounded-[2rem] p-8 md:p-10 transition-all duration-500 ${submitted ? 'md:col-span-5 max-w-2xl mx-auto w-full' : 'md:col-span-3'}`}
                    >
                        <h3 className="text-xl font-semibold tracking-wide mb-6 text-[#2C2421] flex items-center gap-2 border-b border-[#2C2421]/10 pb-4" style={{ fontFamily: 'serif' }}>
                            2. Tus Datos
                        </h3>

                        {submitted ? (
                            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-8 text-center shadow-lg border border-pink-200">
                                <div className="font-bold mb-4 text-2xl bg-gradient-to-r from-pink-500 to-orange-500 bg-clip-text text-transparent" style={{ fontFamily: 'serif' }}>¡Turno Reservado!</div>
                                {watchMetodoPago === 'transferencia' && (
                                    <div className="bg-white border border-pink-200 p-6 rounded-xl mb-6 mt-4 inline-block text-left relative overflow-hidden shadow-sm">
                                        <div className="absolute top-0 left-0 w-1 bg-gradient-to-b from-pink-500 to-orange-500 h-full" />
                                        <p className="text-sm font-bold text-pink-500 mb-2 uppercase tracking-wide">⚠️ Paso Final: Pago</p>
                                        <p className="text-sm text-[#2C2421]/80 mb-4 font-light">Transferi exactamente <strong className="text-stone-900 text-base">${montoAbonar.toLocaleString('es-AR')}</strong> para congelar tu lugar.</p>
                                        <div className="flex flex-col gap-2 text-sm bg-rose-50/50 p-4 rounded-lg font-medium text-stone-700 border border-pink-50">
                                            <div className="flex justify-between items-center border-b border-pink-100 pb-2"><span className="text-stone-500">Alias:</span> <span className="font-bold select-all tracking-wider text-stone-900 text-base">FRAN.ROMY.NAILS</span></div>
                                            <div className="flex justify-between items-center pt-1"><span className="text-stone-500">Titular:</span> <span className="font-bold text-stone-900">Fran & Romy</span></div>
                                        </div>
                                    </div>
                                )}
                                <p className="text-sm mb-6 font-light text-stone-600 max-w-sm mx-auto">
                                    {watchMetodoPago === 'transferencia'
                                        ? 'Envíanos el comprobante por WhatsApp.'
                                        : 'Tu horario fue bloqueado exitosamente.'}
                                </p>
                                {!wppEnviado ? (
                                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                        <a href={getWhatsapp()} onClick={() => setWppEnviado(true)} target="_blank" rel="noopener noreferrer"
                                            className="bg-gradient-to-r from-pink-500 to-orange-500 text-white py-3 px-8 rounded-full font-bold transition-all shadow-md hover:shadow-lg hover:shadow-pink-500/20 transform hover:-translate-y-1">
                                            Confirmar por WhatsApp
                                        </a>
                                        <a href={getCalendar()} target="_blank" rel="noopener noreferrer"
                                            className="bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 py-3 px-8 rounded-full font-semibold transition-all shadow-sm">
                                            Agendar (Google)
                                        </a>
                                    </div>
                                ) : (
                                    <div className="bg-rose-50 border border-pink-200 rounded-xl p-5 mt-4 shadow-inner">
                                        <p className="font-bold mb-2 text-pink-500">¡Solicitud Generada!</p>
                                        <a href={getWhatsapp()} target="_blank" rel="noopener noreferrer" className="text-stone-800 underline text-sm hover:text-pink-500 transition">
                                            Reintentar abrir WhatsApp
                                        </a>
                                    </div>
                                )}
                                <button onClick={() => { setSubmitted(false); handleLimpiarFormulario(); setWppEnviado(false); setMontoAbonar(0) }}
                                    className="mt-8 text-stone-400 text-sm hover:text-pink-500 transition font-medium underline underline-offset-4">
                                    Nuevo Turno
                                </button>
                                {reservaId && <p className="text-xs text-stone-400 mt-4">Nº {reservaId}</p>}
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-5">
                                <div>
                                    <label className="block text-[#2C2421]/80 text-sm mb-2 font-medium">Nombre Completo</label>
                                    <input type="text" {...register('nombre')} placeholder="Ej: María Gómez"
                                        className="w-full p-4 bg-white/95 text-stone-800 border border-pink-200 rounded-xl placeholder-stone-400 focus:bg-white focus:outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-200/50 transition-all shadow-sm appearance-none" />
                                    {errors.nombre && <p className="text-red-500 font-bold text-xs mt-1 animate-pulse">{errors.nombre.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-[#2C2421]/80 text-sm mb-2 font-medium">Fecha de Nacimiento</label>

                                    <div className="relative w-full">
                                        <input
                                            ref={(e) => {
                                                dateRefHook.ref(e);
                                                dateInputRef.current = e;
                                            }}
                                            type="date"
                                            className={`w-full p-4 min-h-[3rem] bg-white/95 border border-pink-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-pink-200/50 transition-all shadow-sm block pr-14 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full ${!watchFechaNac ? 'text-stone-400' : 'text-stone-700'}`}
                                        />
                                        <div
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-xl opacity-70 filter hue-rotate-15 cursor-pointer z-10"
                                            onClick={() => { if (dateInputRef.current) dateInputRef.current.showPicker() }}
                                        >
                                            📅
                                        </div>
                                    </div>
                                    {errors.fechaNacimiento && <p className="text-red-500 font-bold text-xs mt-1 animate-pulse">{errors.fechaNacimiento.message}</p>}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-[#2C2421]/80 text-sm mb-2 font-medium">WhatsApp</label>
                                        <input type="tel" {...register('celular', { onChange: (e) => setValue('celular', e.target.value.replace(/\D/g, '')) })} placeholder="381 455..." minLength={8}
                                            className="w-full p-4 bg-white/95 text-stone-800 border border-pink-200 rounded-xl placeholder-stone-400 focus:bg-white focus:outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-200/50 transition-all shadow-sm appearance-none" />
                                        {errors.celular && <p className="text-red-500 font-bold text-xs mt-1 animate-pulse">{errors.celular.message}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[#2C2421]/80 text-sm mb-2 font-medium">Email <span className="text-stone-400 font-light text-xs">(Opcional)</span></label>
                                        <input type="email" {...register('email')} placeholder="correo@gmail.com"
                                            className="w-full p-4 bg-white/95 text-stone-800 border border-pink-200 rounded-xl placeholder-stone-400 focus:bg-white focus:outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-200/50 transition-all shadow-sm appearance-none" />
                                        {errors.email && <p className="text-red-500 font-bold text-xs mt-1 animate-pulse">{errors.email.message}</p>}
                                    </div>
                                </div>
                                <div className="mt-2">
                                    <label className="block text-[#2C2421]/80 text-sm mb-3 font-medium">Método de Pago <span className="text-pink-500 font-bold">— Seña 50%</span></label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <button type="button" onClick={() => setValue('metodoPago', 'mp')}
                                            className={`p-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 ${watchMetodoPago === 'mp' ? 'bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400 text-white font-medium border-none hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/40 hover:brightness-110' : 'bg-white/70 text-stone-600 border border-stone-200 hover:bg-white hover:scale-[1.02] hover:shadow-md'}`}>
                                            💳 Mercado Pago
                                        </button>
                                        <button type="button" onClick={() => setValue('metodoPago', 'transferencia')}
                                            className={`p-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 ${watchMetodoPago === 'transferencia' ? 'bg-gradient-to-r from-rose-300 to-orange-300 hover:from-rose-400 hover:to-orange-400 text-[#2C2421] font-semibold border-none hover:scale-[1.02] hover:shadow-lg hover:shadow-rose-400/20' : 'bg-white/70 text-stone-600 border border-stone-200 hover:bg-white hover:scale-[1.02] hover:shadow-md'}`}>
                                            🏦 Transferencia
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-2">
                                    <label className="block text-[#2C2421]/80 text-sm mb-2 font-medium">Servicio</label>
                                    <select {...register('servicio')}
                                        className="w-full p-4 bg-white/95 text-stone-800 border border-pink-200 rounded-xl placeholder-stone-400 focus:bg-white focus:outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-200/50 transition-all shadow-sm appearance-none"
                                    >
                                        <option value="">Elegí un servicio...</option>
                                        {Object.keys(grupos).map(cat => (
                                            <optgroup key={cat} label={cat.toUpperCase()} className="bg-white text-pink-500 font-bold">
                                                {grupos[cat].map(s => (
                                                    <option key={s.id} value={`${s.nombre} ($${s.precio.toLocaleString('es-AR')})`} className="text-stone-800 font-medium bg-white">
                                                        {s.nombre} (${s.precio.toLocaleString('es-AR')})
                                                    </option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                    {errors.servicio && <p className="text-red-500 font-bold text-xs mt-1 animate-pulse">{errors.servicio.message}</p>}
                                </div>

                                <button type="submit" disabled={loading}
                                    className="mt-6 w-full bg-gradient-to-r from-rose-300 to-orange-300 hover:from-rose-400 hover:to-orange-400 text-[#2C2421] font-semibold tracking-widest uppercase py-5 rounded-xl shadow-md border-none transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none">
                                    {loading ? 'Procesando...' : 'Confirmar Reserva'}
                                </button>
                                <button type="button" onClick={handleLimpiarFormulario}
                                    className="mt-3 w-full bg-gradient-to-r from-stone-200 to-stone-300 hover:from-stone-300 hover:to-stone-400 text-[#2C2421]/80 font-semibold tracking-widest uppercase py-5 rounded-xl shadow-md border-none transform hover:-translate-y-1 transition-all duration-300">
                                    Limpiar Formulario
                                </button>
                            </form>
                        )}
                    </motion.div>
                </div>
            </div>
        </section>
    )
}
