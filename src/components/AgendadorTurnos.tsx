'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast, Toaster } from 'sonner'
import Link from 'next/link'
import { Sparkles, Calendar, User, Cake, Phone, Mail, CheckCircle2 } from 'lucide-react'
import CalendarioReserva from './CalendarioReserva'
import {
    generarHorariosDisponibles,
    getHoyArgentina,
    getFinMesesSiguientesArgentina
} from '../lib/utils'
import { DEFAULT_CMS_CONTENIDO, mergeCMSContenido } from '../lib/cms-types'
import type { DisponibilidadDia } from '../lib/reservas-server'

const FormVisitanteSchema = z.object({
    nombre: z
        .string()
        .min(3, 'Debe tener al menos 3 caracteres')
        .max(50, 'Máximo 50 caracteres')
        .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'Solo se permiten letras y espacios'),
    celular: z.string().min(8, 'El número de WhatsApp es muy corto'),
    email: z.string().email('Correo inválido').or(z.literal('')),
    fechaNacimiento: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Completá tu fecha de nacimiento (día, mes y año)'),
    servicio: z.string().min(1, 'El servicio es requerido'),
    metodoPago: z.enum(['mp', 'transferencia', 'local']).optional()
})

type FormData = z.infer<typeof FormVisitanteSchema>

interface Config {
    hora_inicio: string
    hora_fin: string
    intervalo_minutos: number | string
    nombre_negocio?: string
    whatsapp_numero?: string
    pagos_habilitados?: boolean
    minutos_autoconfirmacion?: number
    meses_visibles_cliente?: number
    cms?: any
}

interface Servicio {
    id: number
    nombre: string
    precio: number
    categoria: string
}

const DEFAULT_CONFIG: Config = {
    hora_inicio: '10:00',
    hora_fin: '22:00',
    intervalo_minutos: 120,
    nombre_negocio: 'Fran & Romy Nails',
    whatsapp_numero: '5493813013850',
    pagos_habilitados: false,
    minutos_autoconfirmacion: 10,
    meses_visibles_cliente: 3
}

async function fetchConfig(): Promise<Config> {
    const res = await fetch('/api/config', { cache: 'no-store' })
    if (!res.ok) return DEFAULT_CONFIG
    return res.json()
}

async function fetchServicios(): Promise<Servicio[]> {
    const res = await fetch('/api/servicios', { cache: 'no-store' })
    if (!res.ok) throw new Error('Error al cargar servicios')
    return res.json()
}

const MESES_CORTO = [
    { val: '01', label: 'Enero' },
    { val: '02', label: 'Febrero' },
    { val: '03', label: 'Marzo' },
    { val: '04', label: 'Abril' },
    { val: '05', label: 'Mayo' },
    { val: '06', label: 'Junio' },
    { val: '07', label: 'Julio' },
    { val: '08', label: 'Agosto' },
    { val: '09', label: 'Septiembre' },
    { val: '10', label: 'Octubre' },
    { val: '11', label: 'Noviembre' },
    { val: '12', label: 'Diciembre' }
]

export default function AgendadorTurnos() {
    const queryClient = useQueryClient()
    const { data: config = DEFAULT_CONFIG } = useQuery({
        queryKey: ['config'],
        queryFn: fetchConfig,
        staleTime: 60_000
    })
    const { data: servicios = [] } = useQuery({
        queryKey: ['servicios'],
        queryFn: fetchServicios,
        staleTime: 60_000
    })

    const mesesVisibles = Number(config.meses_visibles_cliente) || 3
    const [hoy, setHoy] = useState(() => getHoyArgentina())
    const maxFecha = getFinMesesSiguientesArgentina(mesesVisibles)
    const [fecha, setFecha] = useState('')
    const [horario, setHorario] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [wppEnviado, setWppEnviado] = useState(false)
    const [montoAbonar, setMontoAbonar] = useState(0)
    const [reservaId, setReservaId] = useState<number | null>(null)
    const [codigoTurno, setCodigoTurno] = useState<string | null>(null)
    const [ultimoCodigoGuardado, setUltimoCodigoGuardado] = useState<string | null>(null)

    // Selectores de fecha de nacimiento compatibles 100% con iOS y Android (sin showPicker)
    const [nacDia, setNacDia] = useState('')
    const [nacMes, setNacMes] = useState('')
    const [nacAnio, setNacAnio] = useState('')

    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
        setValue,
        reset
    } = useForm<FormData>({
        resolver: zodResolver(FormVisitanteSchema),
        defaultValues: {
            nombre: '',
            celular: '',
            email: '',
            fechaNacimiento: '',
            servicio: '',
            metodoPago: 'local'
        }
    })

    const watchNombre = watch('nombre')
    const watchServicio = watch('servicio')
    const watchMetodoPago = watch('metodoPago')

    useEffect(() => {
        setHoy(getHoyArgentina())
        try {
            const saved = localStorage.getItem('ultimo_turno_codigo')
            if (saved) setUltimoCodigoGuardado(saved)
        } catch {}
    }, [])

    useEffect(() => {
        if (nacDia && nacMes && nacAnio) {
            setValue('fechaNacimiento', `${nacAnio}-${nacMes}-${nacDia}`, {
                shouldValidate: true
            })
        } else {
            setValue('fechaNacimiento', '', { shouldValidate: false })
        }
    }, [nacDia, nacMes, nacAnio, setValue])

    // Disponibilidad de los 2 meses (mes actual + mes siguiente) en una sola consulta
    const { data: rangoData, isFetching: loadingCalendario } = useQuery<{
        dias: Record<string, DisponibilidadDia>
    }>({
        queryKey: ['disponibilidad-rango', hoy, maxFecha],
        queryFn: async () => {
            const res = await fetch(
                `/api/disponibilidad?desde=${hoy}&hasta=${maxFecha}`,
                { cache: 'no-store' }
            )
            if (!res.ok) return { dias: {} }
            return res.json()
        },
        enabled: !!hoy && !!maxFecha,
        staleTime: 20_000,
        refetchOnWindowFocus: true
    })

    const disponibilidadPorDia = rangoData?.dias || {}
    const infoDiaSeleccionado = fecha ? disponibilidadPorDia[fecha] : undefined

    // Consulta puntual del día elegido para garantizar frescura inmediata
    const { data: diaPuntual } = useQuery({
        queryKey: ['ocupados', fecha],
        queryFn: async () => {
            if (!fecha) return null
            const res = await fetch(`/api/reservas/${fecha}?t=${Date.now()}`, {
                cache: 'no-store'
            })
            if (!res.ok) return null
            return res.json()
        },
        enabled: !!fecha,
        refetchOnWindowFocus: true
    })

    const horariosBase: string[] =
        diaPuntual?.horariosBase ||
        infoDiaSeleccionado?.horariosBase ||
        generarHorariosDisponibles(
            config.hora_inicio,
            config.hora_fin,
            config.intervalo_minutos
        )

    const ocupados: { horario: string; estado: string }[] =
        diaPuntual?.ocupados || infoDiaSeleccionado?.ocupados || []

    const handleFechaChange = (val: string) => {
        setFecha(val)
        setHorario(null)
    }

    const handleLimpiarFormulario = () => {
        setFecha('')
        setHorario(null)
        setNacDia('')
        setNacMes('')
        setNacAnio('')
        reset()
    }

    async function onSubmit(data: FormData) {
        if (!fecha || !horario) {
            toast.error('Por favor seleccioná un día en el calendario y un horario disponible.')
            return
        }

        setLoading(true)
        try {
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
                    metodo_pago: config.pagos_habilitados ? data.metodoPago || 'mp' : 'local'
                })
            })
            const result = await res.json()
            setLoading(false)

            if (res.ok) {
                if (config.pagos_habilitados && result.initPoint) {
                    window.location.href = result.initPoint
                    return
                }
                setSubmitted(true)
                setReservaId(result.id ?? null)
                setCodigoTurno(result.codigo ?? null)
                if (result.codigo) {
                    try {
                        localStorage.setItem('ultimo_turno_codigo', result.codigo)
                        setUltimoCodigoGuardado(result.codigo)
                    } catch {}
                }
                if (result.montoSena) setMontoAbonar(result.montoSena)
                queryClient.invalidateQueries({ queryKey: ['disponibilidad-rango'] })
                queryClient.invalidateQueries({ queryKey: ['ocupados', fecha] })
                toast.success('¡Solicitud de turno registrada!')
            } else {
                if (result.codigoExistente) {
                    setUltimoCodigoGuardado(result.codigoExistente)
                }
                toast.error(result.error || 'No se pudo registrar la reserva')
            }
        } catch {
            setLoading(false)
            toast.error('Error de conexión. Intentá nuevamente.')
        }
    }

    function getWhatsapp() {
        const negocio = config.nombre_negocio || DEFAULT_CONFIG.nombre_negocio
        const numero = config.whatsapp_numero || DEFAULT_CONFIG.whatsapp_numero
        const fechaLatam = fecha.split('-').reverse().join('/')
        const origin = typeof window !== 'undefined' ? window.location.origin : ''
        const linkSeguimiento = codigoTurno ? `\n*Ver o reprogramar mi turno:* ${origin}/mi-turno/${codigoTurno}` : ''

        const msg =
            config.pagos_habilitados && watchMetodoPago === 'transferencia'
                ? `*NUEVO TURNO - COMPROBANTE*\n\nHola! Hice una reserva para ${watchServicio} a nombre de ${watchNombre}.\nAdjunto comprobante por $${montoAbonar.toLocaleString('es-AR')}.\n\nDía: ${fechaLatam} a las ${horario} hs.${linkSeguimiento}\n¿Me envían confirmación? 💅`
                : `*SOLICITUD DE TURNO - ${negocio!.toUpperCase()}*\n\nHola! Solicité un turno desde la web.\n*Cliente:* ${watchNombre}\n*Servicio:* ${watchServicio}\n*Día:* ${fechaLatam} a las ${horario} hs.${linkSeguimiento}\n\n¡Muchas gracias! 💅✨`
        return `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`
    }

    function getCalendar() {
        const [y, mo, d] = fecha.split('-')
        const [h, mi] = (horario ?? '10:00').split(':')
        const intervalo = Number(config.intervalo_minutos) || 120
        const negocio = config.nombre_negocio || DEFAULT_CONFIG.nombre_negocio
        const start = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi))
        const end = new Date(start.getTime() + intervalo * 60000)
        const fmt = (dt: Date) => {
            const yr = dt.getFullYear()
            const m = String(dt.getMonth() + 1).padStart(2, '0')
            const dStr = String(dt.getDate()).padStart(2, '0')
            const hr = String(dt.getHours()).padStart(2, '0')
            const min = String(dt.getMinutes()).padStart(2, '0')
            const s = String(dt.getSeconds()).padStart(2, '0')
            return `${yr}${m}${dStr}T${hr}${min}${s}`
        }
        return `https://calendar.google.com/calendar/r/eventedit?text=Turno+${encodeURIComponent(negocio!)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent('Turno para ' + watchServicio)}&location=Lules,+Tucuman`
    }

    const grupos: Record<string, Servicio[]> = {}
    servicios.forEach(s => {
        if (!grupos[s.categoria]) grupos[s.categoria] = []
        grupos[s.categoria].push(s)
    })

    const aniosDisponibles: number[] = []
    const anioActual = new Date().getFullYear()
    for (let y = anioActual - 12; y >= 1940; y--) {
        aniosDisponibles.push(y)
    }

    const cms = config?.cms ? mergeCMSContenido(config.cms) : DEFAULT_CMS_CONTENIDO
    if (!cms.reserva.visible) return null

    return (
        <section
            id="reserva"
            className="py-20 md:py-24 bg-gradient-to-b from-[#F7ECE6] via-[#FAF2EE] to-[#FAF6F2] relative overflow-hidden border-t border-rose-200/40"
        >
            <Toaster position="top-center" richColors />

            {/* Orbes decorativos optimizados para rendimiento móvil */}
            <div className="hidden md:block absolute -top-20 -left-10 w-[500px] h-[500px] bg-rose-200/40 rounded-full blur-[90px] pointer-events-none z-0" />
            <div className="hidden md:block absolute -bottom-20 -right-10 w-[500px] h-[500px] bg-amber-200/35 rounded-full blur-[90px] pointer-events-none z-0" />

            <div className="container mx-auto px-4 sm:px-6 max-w-5xl relative z-10">
                <div className="text-center mb-10 md:mb-14">
                    {cms.reserva.badge && (
                        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-rose-100/80 border border-rose-200 text-rose-700 text-[10px] font-bold uppercase tracking-[0.25em] mb-3">
                            <Sparkles className="w-3 h-3" /> {cms.reserva.badge}
                        </div>
                    )}
                    <h2
                        className="font-editorial text-4xl sm:text-5xl md:text-6xl font-semibold mb-4 text-[#231C19] tracking-tight"
                    >
                        {cms.reserva.titulo || 'Agenda tu Turno'}
                    </h2>
                    <p className="text-stone-600 max-w-lg mx-auto font-normal tracking-wide text-sm sm:text-base">
                        {cms.reserva.subtitulo}
                    </p>
                    {ultimoCodigoGuardado && !submitted && (
                        <div className="mt-4 inline-flex items-center gap-2 bg-white/95 border border-rose-200 px-4 py-2 rounded-full shadow-sm text-xs sm:text-sm text-stone-700">
                            <span>💅 ¿Ya reservaste un turno?</span>
                            <Link
                                href={`/mi-turno/${ultimoCodigoGuardado}`}
                                className="font-bold text-rose-600 underline hover:text-rose-700"
                            >
                                Ver estado o reprogramar →
                            </Link>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-8">
                    {/* Panel 1: Calendario y Grilla de Horarios */}
                    {!submitted && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="glass-editorial relative z-10 rounded-[2rem] p-5 sm:p-7 md:col-span-2 flex flex-col"
                        >
                            <h3
                                className="font-editorial text-2xl font-bold tracking-wide mb-4 text-[#231C19] flex items-center gap-2.5 border-b border-rose-200/60 pb-3"
                            >
                                <span className="w-7 h-7 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-sans font-bold">
                                    01
                                </span>
                                <Calendar className="w-4 h-4 text-rose-500" />
                                Fecha y Horario
                            </h3>

                            <CalendarioReserva
                                fechaSeleccionada={fecha}
                                onSelectFecha={handleFechaChange}
                                disponibilidadPorDia={disponibilidadPorDia}
                                hoy={hoy}
                                maxFecha={maxFecha}
                                mesesVisibles={mesesVisibles}
                                loading={loadingCalendario}
                            />

                            <label className="block text-[#2C2421]/85 text-sm mb-2.5 font-semibold mt-5">
                                Horarios Disponibles (turnos de 2 hs)
                            </label>

                            {fecha ? (
                                <>
                                    <div className="mb-2.5 text-xs font-semibold text-stone-700 bg-white/70 px-3 py-1.5 rounded-lg inline-flex items-center justify-between">
                                        <span>
                                            📅 Día seleccionado:{' '}
                                            <strong>{fecha.split('-').reverse().join('/')}</strong>
                                        </span>
                                        {infoDiaSeleccionado?.motivo && (
                                            <span className="text-amber-700">
                                                • {infoDiaSeleccionado.motivo}
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2.5">
                                        {horariosBase.map(h => {
                                            const ocupadoInfo = ocupados.find(
                                                (o: { horario: string; estado: string }) =>
                                                    o.horario.substring(0, 5) === h
                                            )
                                            const isSelected = horario === h
                                            const estado = ocupadoInfo
                                                ? ocupadoInfo.estado || 'pendiente'
                                                : 'disponible'

                                            const ESTILOS_HORARIO: Record<string, string> = {
                                                selected:
                                                    'bg-gradient-to-r from-fuchsia-600 to-orange-500 text-white font-bold shadow-md border-transparent scale-[1.03]',
                                                disponible:
                                                    'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 shadow-sm',
                                                pendiente:
                                                    'bg-orange-100 text-orange-800 border-orange-300 opacity-85 cursor-not-allowed',
                                                confirmado:
                                                    'bg-stone-200 text-stone-500 border-stone-300 cursor-not-allowed line-through',
                                                completado:
                                                    'bg-stone-200 text-stone-500 border-stone-300 cursor-not-allowed line-through'
                                            }

                                            const btnClasses = isSelected
                                                ? ESTILOS_HORARIO.selected
                                                : ESTILOS_HORARIO[estado] || ESTILOS_HORARIO.pendiente

                                            return (
                                                <button
                                                    key={h}
                                                    type="button"
                                                    disabled={!!ocupadoInfo}
                                                    onClick={() => setHorario(h)}
                                                    className={`min-h-[46px] py-2.5 px-2 flex items-center justify-center gap-1 text-sm rounded-xl transition-all duration-200 border font-semibold ${btnClasses}`}
                                                >
                                                    {h}
                                                    {(estado === 'confirmado' ||
                                                        estado === 'completado') && <span>🔒</span>}
                                                </button>
                                            )
                                        })}
                                    </div>
                                    <div className="flex flex-wrap gap-3 text-xs justify-center mt-4 text-stone-600 font-medium">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />{' '}
                                            Disponible
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-orange-300" />{' '}
                                            Pendiente
                                        </div>
                                        <div className="flex items-center gap-1.5">🔒 Confirmado</div>
                                    </div>
                                </>
                            ) : (
                                <div className="bg-white/60 border border-pink-100 text-[#2C2421]/60 text-sm p-4 rounded-xl text-center font-medium mt-1 flex-grow flex items-center justify-center min-h-[96px]">
                                    Tocá un día disponible en el calendario para elegir tu horario
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Panel 2: Formulario de Datos del Cliente */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className={`glass-editorial relative z-10 rounded-[2rem] p-6 sm:p-8 md:p-10 transition-all duration-300 ${
                            submitted ? 'md:col-span-5 max-w-2xl mx-auto w-full' : 'md:col-span-3'
                        }`}
                    >
                        <h3
                            className="font-editorial text-2xl font-bold tracking-wide mb-6 text-[#231C19] flex items-center gap-2.5 border-b border-rose-200/60 pb-3"
                        >
                            <span className="w-7 h-7 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-sans font-bold">
                                02
                            </span>
                            <User className="w-4 h-4 text-rose-500" />
                            Tus Datos de Reserva
                        </h3>

                        {submitted ? (
                            <div className="bg-white/95 rounded-2xl p-6 sm:p-8 text-center shadow-lg border border-pink-200">
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold uppercase tracking-wider mb-4">
                                    ⏳ Estado: Pendiente de Confirmación
                                </div>

                                <div
                                    className="font-bold mb-2 text-2xl sm:text-3xl bg-gradient-to-r from-pink-600 to-orange-500 bg-clip-text text-transparent"
                                    style={{ fontFamily: 'serif' }}
                                >
                                    ¡Solicitud de Turno Registrada!
                                </div>

                                <p className="text-sm text-stone-600 max-w-md mx-auto mb-5 leading-relaxed">
                                    Tu horario del{' '}
                                    <strong>{fecha.split('-').reverse().join('/')}</strong> a las{' '}
                                    <strong>{horario} hs</strong> ya quedó reservado para vos. Recibirás
                                    la confirmación en un máximo de{' '}
                                    <strong>{config.minutos_autoconfirmacion || 10} minutos</strong>.
                                </p>

                                {codigoTurno && (
                                    <div className="bg-rose-50/80 border border-pink-200 rounded-2xl p-4 mb-6 text-left max-w-md mx-auto">
                                        <p className="text-xs font-bold uppercase tracking-wider text-pink-600 mb-1">
                                            🔗 Seguimiento en vivo y autogestión
                                        </p>
                                        <p className="text-xs text-stone-600 mb-3">
                                            Desde tu enlace personal podés ver la cuenta regresiva de
                                            confirmación en tiempo real o reprogramar tu turno si tenés
                                            un imprevisto:
                                        </p>
                                        <Link
                                            href={`/mi-turno/${codigoTurno}`}
                                            className="w-full inline-flex items-center justify-center gap-2 bg-white border border-pink-300 hover:bg-pink-50 text-pink-700 font-bold py-2.5 px-4 rounded-xl text-sm shadow-sm transition"
                                        >
                                            Ver estado de mi turno en vivo →
                                        </Link>
                                    </div>
                                )}

                                {!wppEnviado ? (
                                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                        <a
                                            href={getWhatsapp()}
                                            onClick={() => setWppEnviado(true)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-gradient-to-r from-pink-500 to-orange-500 text-white py-3.5 px-7 rounded-full font-bold transition-all shadow-md hover:shadow-lg min-h-[48px] flex items-center justify-center"
                                        >
                                            Enviar aviso por WhatsApp
                                        </a>
                                        <a
                                            href={getCalendar()}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 py-3.5 px-7 rounded-full font-semibold transition-all shadow-sm min-h-[48px] flex items-center justify-center"
                                        >
                                            Agendar en Google Calendar
                                        </a>
                                    </div>
                                ) : (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mt-4">
                                        <p className="font-bold mb-1 text-emerald-700">
                                            ¡Mensaje de WhatsApp listo!
                                        </p>
                                        <a
                                            href={getWhatsapp()}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-stone-700 underline text-sm hover:text-pink-600 transition"
                                        >
                                            Volver a abrir WhatsApp
                                        </a>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={() => {
                                        setSubmitted(false)
                                        handleLimpiarFormulario()
                                        setWppEnviado(false)
                                        setMontoAbonar(0)
                                    }}
                                    className="mt-7 text-stone-500 text-sm hover:text-pink-600 transition font-medium underline underline-offset-4"
                                >
                                    Solicitar otro turno
                                </button>
                                {reservaId && (
                                    <p className="text-xs text-stone-400 mt-3">
                                        Solicitud Nº {reservaId}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="flex items-center gap-1.5 text-[#231C19] text-xs uppercase tracking-wider mb-1.5 font-bold">
                                        <User className="w-3.5 h-3.5 text-rose-500" /> Nombre y Apellido
                                    </label>
                                    <input
                                        type="text"
                                        {...register('nombre')}
                                        placeholder="Ej: María Gómez"
                                        className="w-full p-3.5 text-base bg-white/95 text-stone-800 border border-rose-200/80 rounded-xl placeholder-stone-400 focus:bg-white focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-200/40 transition-all shadow-sm"
                                    />
                                    {errors.nombre && (
                                        <p className="text-red-600 font-bold text-xs mt-1">
                                            {errors.nombre.message}
                                        </p>
                                    )}
                                </div>

                                {/* Fecha de nacimiento compatible con Android e iPhone */}
                                <div>
                                    <label className="flex items-center gap-1.5 text-[#231C19] text-xs uppercase tracking-wider mb-1.5 font-bold">
                                        <Cake className="w-3.5 h-3.5 text-rose-500" /> Fecha de Nacimiento{' '}
                                        <span className="text-rose-600 text-[11px] font-normal normal-case">
                                            (🎂 para promos de cumpleaños)
                                        </span>
                                    </label>
                                    <input type="hidden" {...register('fechaNacimiento')} />
                                    <div className="grid grid-cols-3 gap-2">
                                        <select
                                            aria-label="Día de nacimiento"
                                            value={nacDia}
                                            onChange={e => setNacDia(e.target.value)}
                                            className="w-full p-3.5 text-base bg-white/95 text-stone-800 border border-pink-200 rounded-xl focus:outline-none focus:border-pink-500 shadow-sm min-h-[48px]"
                                        >
                                            <option value="">Día</option>
                                            {Array.from({ length: 31 }, (_, i) => {
                                                const v = String(i + 1).padStart(2, '0')
                                                return (
                                                    <option key={v} value={v}>
                                                        {i + 1}
                                                    </option>
                                                )
                                            })}
                                        </select>
                                        <select
                                            aria-label="Mes de nacimiento"
                                            value={nacMes}
                                            onChange={e => setNacMes(e.target.value)}
                                            className="w-full p-3.5 text-base bg-white/95 text-stone-800 border border-pink-200 rounded-xl focus:outline-none focus:border-pink-500 shadow-sm min-h-[48px]"
                                        >
                                            <option value="">Mes</option>
                                            {MESES_CORTO.map(m => (
                                                <option key={m.val} value={m.val}>
                                                    {m.label}
                                                </option>
                                            ))}
                                        </select>
                                        <select
                                            aria-label="Año de nacimiento"
                                            value={nacAnio}
                                            onChange={e => setNacAnio(e.target.value)}
                                            className="w-full p-3.5 text-base bg-white/95 text-stone-800 border border-pink-200 rounded-xl focus:outline-none focus:border-pink-500 shadow-sm min-h-[48px]"
                                        >
                                            <option value="">Año</option>
                                            {aniosDisponibles.map(y => (
                                                <option key={y} value={String(y)}>
                                                    {y}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {errors.fechaNacimiento && (
                                        <p className="text-red-600 font-bold text-xs mt-1">
                                            {errors.fechaNacimiento.message}
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="flex items-center gap-1.5 text-[#231C19] text-xs uppercase tracking-wider mb-1.5 font-bold">
                                            <Phone className="w-3.5 h-3.5 text-rose-500" /> WhatsApp (sin 0 ni 15)
                                        </label>
                                        <input
                                            type="tel"
                                            inputMode="numeric"
                                            {...register('celular', {
                                                onChange: e =>
                                                    setValue(
                                                        'celular',
                                                        e.target.value.replace(/\D/g, '')
                                                    )
                                            })}
                                            placeholder="Ej: 3814556677"
                                            minLength={8}
                                            className="w-full p-3.5 text-base bg-white/95 text-stone-800 border border-rose-200/80 rounded-xl placeholder-stone-400 focus:bg-white focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-200/40 transition-all shadow-sm"
                                        />
                                        {errors.celular && (
                                            <p className="text-red-600 font-bold text-xs mt-1">
                                                {errors.celular.message}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-1.5 text-[#231C19] text-xs uppercase tracking-wider mb-1.5 font-bold">
                                            <Mail className="w-3.5 h-3.5 text-rose-500" /> Email{' '}
                                            <span className="text-stone-400 font-normal text-[11px] normal-case">
                                                (Opcional)
                                            </span>
                                        </label>
                                        <input
                                            type="email"
                                            {...register('email')}
                                            placeholder="correo@ejemplo.com"
                                            className="w-full p-3.5 text-base bg-white/95 text-stone-800 border border-rose-200/80 rounded-xl placeholder-stone-400 focus:bg-white focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-200/40 transition-all shadow-sm"
                                        />
                                        {errors.email && (
                                            <p className="text-red-600 font-bold text-xs mt-1">
                                                {errors.email.message}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="flex items-center gap-1.5 text-[#231C19] text-xs uppercase tracking-wider mb-1.5 font-bold">
                                        <Sparkles className="w-3.5 h-3.5 text-rose-500" /> Servicio a realizar
                                    </label>
                                    <select
                                        {...register('servicio')}
                                        className="w-full p-3.5 text-base bg-white/95 text-stone-800 border border-pink-200 rounded-xl focus:bg-white focus:outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-200/50 transition-all shadow-sm min-h-[48px]"
                                    >
                                        <option value="">Elegí un servicio...</option>
                                        {Object.keys(grupos).map(cat => (
                                            <optgroup
                                                key={cat}
                                                label={cat.toUpperCase()}
                                                className="bg-white text-pink-500 font-bold"
                                            >
                                                {grupos[cat].map(s => (
                                                    <option
                                                        key={s.id}
                                                        value={`${s.nombre} ($${s.precio.toLocaleString('es-AR')})`}
                                                        className="text-stone-800 font-medium bg-white"
                                                    >
                                                        {s.nombre} ($
                                                        {s.precio.toLocaleString('es-AR')})
                                                    </option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                    {errors.servicio && (
                                        <p className="text-red-600 font-bold text-xs mt-1">
                                            {errors.servicio.message}
                                        </p>
                                    )}
                                </div>

                                {/* Bloque de seña 50% oculto mientras pagos_habilitados === false */}
                                {config.pagos_habilitados && (
                                    <div className="mt-1">
                                        <label className="block text-[#2C2421]/80 text-sm mb-2 font-medium">
                                            Método de Pago{' '}
                                            <span className="text-pink-500 font-bold">
                                                — Seña 50%
                                            </span>
                                        </label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setValue('metodoPago', 'mp')}
                                                className={`p-3.5 rounded-xl flex items-center justify-center gap-2 transition-all min-h-[48px] ${
                                                    watchMetodoPago === 'mp'
                                                        ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-semibold shadow-md'
                                                        : 'bg-white/80 text-stone-600 border border-stone-200'
                                                }`}
                                            >
                                                💳 Mercado Pago
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setValue('metodoPago', 'transferencia')
                                                }
                                                className={`p-3.5 rounded-xl flex items-center justify-center gap-2 transition-all min-h-[48px] ${
                                                    watchMetodoPago === 'transferencia'
                                                        ? 'bg-gradient-to-r from-rose-300 to-orange-300 text-[#2C2421] font-semibold shadow-md'
                                                        : 'bg-white/80 text-stone-600 border border-stone-200'
                                                }`}
                                            >
                                                🏦 Transferencia
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <p className="text-xs text-stone-600 bg-white/60 rounded-xl p-3 border border-pink-100">
                                    ✨ <strong>Compromiso de asistencia:</strong>{' '}
                                    {cms.reserva.texto_compromiso}
                                </p>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="mt-2 w-full bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold tracking-[0.18em] uppercase py-4 rounded-xl shadow-lg shadow-rose-500/20 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 min-h-[52px] flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    {loading
                                        ? 'Procesando...'
                                        : cms.reserva.texto_boton_confirmar || 'Confirmar Reserva'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleLimpiarFormulario}
                                    className="w-full bg-white/80 hover:bg-white text-[#2C2421]/80 font-semibold tracking-widest uppercase py-3.5 rounded-xl border border-stone-200 transition-all text-sm min-h-[46px]"
                                >
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
