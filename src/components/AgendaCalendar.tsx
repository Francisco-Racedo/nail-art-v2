'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
    AlertCircle,
    CheckCircle2,
    CalendarOff,
    RefreshCw,
    Send,
    Plus,
    X
} from 'lucide-react'
import WeekNavigator from './admin/WeekNavigator'
import EventGrid from './admin/EventGrid'
import TurnoModal from './admin/TurnoModal'
import DashboardAnalytics from './DashboardAnalytics'
import {
    Reserva,
    ModalData,
    formatDateStr,
    getEstadoEfectivo,
    parseReservaMeta,
    getHoyUTC3
} from './admin/agendaTypes'
import {
    generarHorariosDisponibles,
    generarHorariosBaseParaFecha,
    HORARIOS_ESTANDAR_HABITUALES,
    normalizarCelular,
    celularParaWhatsapp,
    getAhoraArgentina
} from '@/lib/utils'
import {
    toggleTurnoNocturnoAction,
    type AvisoReprogramacionCliente
} from '@/app/admin/actions'
import { notificarCambioEnTiempoReal } from '@/app/providers'

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
const dayNamesLong = [
    'Domingo',
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado'
]

export default function AgendaCalendar({
    initialReservas,
    config
}: {
    initialReservas: Reserva[]
    config: any
}) {
    const router = useRouter()
    const [reservasList, setReservasList] = useState<Reserva[]>(initialReservas)
    const [viewDate, setViewDate] = useState(() => {
        const now = getAhoraArgentina()
        return new Date(now.getFullYear(), now.getMonth(), 1)
    })
    const [selectedDate, setSelectedDate] = useState(() => getAhoraArgentina())
    const selectedDayStr = formatDateStr(selectedDate)

    const isNocturnoHabilitado = useMemo(() => {
        const fechas = config?.fechas_nocturno_habilitado
        return Array.isArray(fechas) && fechas.includes(selectedDayStr)
    }, [config?.fechas_nocturno_habilitado, selectedDayStr])

    const [togglingNocturno, setTogglingNocturno] = useState(false)

    const handleToggleNocturno = async () => {
        try {
            setTogglingNocturno(true)
            const nuevoEstado = !isNocturnoHabilitado
            const res = await toggleTurnoNocturnoAction(selectedDayStr, nuevoEstado)
            if (res.error) {
                toast.error(res.error)
                return
            }
            if (config) {
                config.fechas_nocturno_habilitado = res.fechas
            }
            notificarCambioEnTiempoReal('config', { fecha: selectedDayStr, nocturno: nuevoEstado })
            toast.success(
                nuevoEstado
                    ? `Turno de las 21:00 hs HABILITADO para el ${selectedDayStr}`
                    : `Turno de las 21:00 hs deshabilitado para el ${selectedDayStr}`
            )
            router.refresh()
        } catch {
            toast.error('Error al cambiar el estado del turno nocturno')
        } finally {
            setTogglingNocturno(false)
        }
    }

    const [mounted, setMounted] = useState(false)
    const [modalData, setModalData] = useState<ModalData | null>(null)
    const [vistaActiva, setVistaActiva] = useState<'calendario' | 'detalle_turno'>('calendario')
    const [mesesCliente, setMesesCliente] = useState<number>(
        Number(config?.meses_visibles_cliente) || 3
    )

    useEffect(() => {
        setReservasList(initialReservas)
    }, [initialReservas])

    // Sincronización instantánea en tiempo real ante cualquier cambio (reservas creadas/modificadas/eliminadas)
    useEffect(() => {
        let isMounted = true

        const refrescarTurnos = async () => {
            try {
                const res = await fetch('/api/reservas', { cache: 'no-store' })
                if (res.ok && isMounted) {
                    const data = await res.json()
                    if (Array.isArray(data.reservas)) {
                        setReservasList(data.reservas)
                    }
                }
            } catch {}
        }

        const handleSyncEvent = () => {
            refrescarTurnos()
        }

        window.addEventListener('nail_art_sync_event', handleSyncEvent)
        return () => {
            isMounted = false
            window.removeEventListener('nail_art_sync_event', handleSyncEvent)
        }
    }, [])

    // Asignación manual de turno desde un bloque libre de la grilla
    const [slotLibreElegido, setSlotLibreElegido] = useState<string | null>(null)
    const [nuevoNombre, setNuevoNombre] = useState('')
    const [nuevoCelular, setNuevoCelular] = useState('')
    const [nuevoServicio, setNuevoServicio] = useState('')
    const [serviciosLista, setServiciosLista] = useState<
        { id: number; nombre: string; precio: number; categoria: string }[]
    >([])
    const [guardandoManual, setGuardandoManual] = useState(false)

    // Panel de Imprevistos / Reprogramación Masiva y Feriados
    const [showImprevisto, setShowImprevisto] = useState(false)
    const [modoMasivo, setModoMasivo] = useState<
        'cliente_elige' | 'mover_dia' | 'feriado_reducido'
    >('cliente_elige')
    const [motivoImprevisto, setMotivoImprevisto] = useState('')
    const [desdeHoraFiltro, setDesdeHoraFiltro] = useState('')
    const [fechaDestinoMasiva, setFechaDestinoMasiva] = useState('')
    const [bloquearDiaCheck, setBloquearDiaCheck] = useState(true)
    const [horariosReducidosSel, setHorariosReducidosSel] = useState<string[]>(() =>
        HORARIOS_ESTANDAR_HABITUALES.slice(0, 3)
    )
    const [procesandoMasivo, setProcesandoMasivo] = useState(false)
    const [avisosCola, setAvisosCola] = useState<AvisoReprogramacionCliente[]>([])
    const [avisadosSet, setAvisadosSet] = useState<Record<number, boolean>>({})

    const horariosBaseConfig = useMemo(
        () =>
            generarHorariosBaseParaFecha(
                selectedDayStr,
                isNocturnoHabilitado
            ),
        [selectedDayStr, isNocturnoHabilitado]
    )

    useEffect(() => {
        setMounted(true)

        fetch('/api/servicios')
            .then(r => (r.ok ? r.json() : []))
            .then(data => {
                if (Array.isArray(data)) setServiciosLista(data)
            })
            .catch(() => {})
    }, [])

    const handleSelectDate = (d: Date) => {
        setSelectedDate(d)
        if (d.getMonth() !== viewDate.getMonth() || d.getFullYear() !== viewDate.getFullYear()) {
            setViewDate(new Date(d.getFullYear(), d.getMonth(), 1))
        }
    }

    // Mapa de historial por cliente (celular normalizado)
    const historialPorCliente = useMemo(() => {
        const map = new Map<
            string,
            { totalTurnos: number; completados: number; ausencias: number }
        >()
        for (const r of reservasList) {
            const key =
                normalizarCelular(r.celular) ||
                `nombre:${(r.nombre || '').toLowerCase().trim()}`
            const ef = getEstadoEfectivo(r)
            const cur = map.get(key) || { totalTurnos: 0, completados: 0, ausencias: 0 }
            cur.totalTurnos += 1
            if (ef === 'confirmado' || ef === 'completado') cur.completados += 1
            if (ef === 'ausente') cur.ausencias += 1
            map.set(key, cur)
        }
        return map
    }, [reservasList])

    // Lista de turnos PENDIENTES futuros para confirmar con 1 toque
    const pendientesFuturos = useMemo(() => {
        const hoyStr = getHoyUTC3()
        return reservasList
            .filter(r => r.fecha >= hoyStr && getEstadoEfectivo(r) === 'pendiente')
            .sort((a, b) => `${a.fecha}_${a.horario}`.localeCompare(`${b.fecha}_${b.horario}`))
    }, [reservasList])

    const handlePrevMonth = () => {
        setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
    }

    const handleNextMonth = () => {
        setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
    }

    const handleGoToday = () => {
        const now = getAhoraArgentina()
        setViewDate(new Date(now.getFullYear(), now.getMonth(), 1))
        setSelectedDate(now)
    }

    const handleCambiarMesesCliente = async (nuevosMeses: number) => {
        setMesesCliente(nuevosMeses)
        const toastId = toast.loading('Actualizando meses visibles para clientes...')
        try {
            const { actualizarMesesVisiblesAction } = await import('@/app/admin/actions')
            const { notificarCambioEnTiempoReal } = await import('@/app/providers')
            const res = await actualizarMesesVisiblesAction(nuevosMeses)
            if (res.error) {
                toast.error(res.error, { id: toastId })
            } else {
                notificarCambioEnTiempoReal('config')
                toast.success(
                    `El calendario del cliente ahora muestra ${nuevosMeses} ${nuevosMeses === 1 ? 'mes' : 'meses'}`,
                    { id: toastId }
                )
                router.refresh()
            }
        } catch {
            toast.error('No se pudo guardar el ajuste', { id: toastId })
        }
    }

    const handleEventClick = (reserva: Reserva) => {
        const meta = parseReservaMeta(reserva.mp_preference_id, reserva.id)
        const estadoEfectivo = getEstadoEfectivo(reserva)
        setModalData({
            id: reserva.id,
            cliente: reserva.nombre,
            servicio: reserva.servicio,
            fecha: reserva.fecha,
            hora: (reserva.horario || '').replace(/^~/, '').split('#')[0].substring(0, 5),
            estado: estadoEfectivo,
            celular: reserva.celular,
            email: reserva.email,
            notificacion_enviada: reserva.notificacion_enviada,
            fecha_nacimiento: reserva.fecha_nacimiento,
            descuento_aplicado: reserva.descuento_aplicado,
            descuento_motivo: meta.descuentoMotivo,
            monto_sena: reserva.monto_sena,
            metodo_pago: reserva.metodo_pago,
            estado_pago: reserva.estado_pago,
            reprogramado: reserva.reprogramado,
            codigo: meta.codigo,
            ocupa_bloque_siguiente: meta.ocupaBloqueSiguiente,
            dias_recordatorio_service: meta.diasRecordatorioService || 18,
            notas_turno: meta.notasTurno || '',
            precio_personalizado: meta.precioPersonalizado,
            adicionales: meta.adicionalesSeleccionados || [],
            historial_eventos: meta.historial || [],
            mp_preference_id: reserva.mp_preference_id
        })
        setVistaActiva('detalle_turno')
    }

    const confirmarRapido = async (r: Reserva) => {
        const toastId = toast.loading(`Confirmando turno de ${r.nombre}...`)
        try {
            const res = await fetch(`/api/admin/reservas/${r.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: 'confirmado' })
            })
            if (!res.ok) throw new Error()
            toast.success(`Turno de ${r.nombre} confirmado`, { id: toastId })
            router.refresh()
            notificarCambioEnTiempoReal('reservas')
        } catch {
            toast.error('No se pudo confirmar el turno', { id: toastId })
        }
    }

    const dayReservas = useMemo(() => {
        return reservasList
            .filter(r => r.fecha === selectedDayStr)
            .sort((a, b) => a.horario.localeCompare(b.horario))
    }, [reservasList, selectedDayStr])

    const jornadaEspecialDelDia = useMemo(() => {
        const list = config?.jornadas_especiales || []
        return list.find((j: any) => j.fecha === selectedDayStr)
    }, [config, selectedDayStr])

    const handleCrearTurnoManual = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!slotLibreElegido || !nuevoNombre || !nuevoServicio) {
            toast.error('Completá el nombre del cliente y el servicio.')
            return
        }
        setGuardandoManual(true)
        const toastId = toast.loading('Asignando turno...')
        try {
            const { crearTurnoManualAdmin } = await import('@/app/admin/actions')
            const res = await crearTurnoManualAdmin({
                nombre: nuevoNombre,
                celular: nuevoCelular,
                servicio: nuevoServicio,
                fecha: selectedDayStr,
                horario: slotLibreElegido,
                estado: 'confirmado'
            })
            if (res.error) {
                toast.error(res.error, { id: toastId })
            } else {
                toast.success('Turno asignado y confirmado', { id: toastId })
                setSlotLibreElegido(null)
                setNuevoNombre('')
                setNuevoCelular('')
                setNuevoServicio('')
                router.refresh()
                notificarCambioEnTiempoReal('reservas')
            }
        } catch {
            toast.error('Error al asignar el turno', { id: toastId })
        }
        setGuardandoManual(false)
    }

    const ejecutarAccionDia = async () => {
        setProcesandoMasivo(true)
        const toastId = toast.loading('Aplicando cambios en la jornada...')
        try {
            const {
                reprogramarMasivoImprevisto,
                guardarJornadaEspecialAction
            } = await import('@/app/admin/actions')

            if (modoMasivo === 'feriado_reducido') {
                const res = await guardarJornadaEspecialAction({
                    fecha: selectedDayStr,
                    tipo: horariosReducidosSel.length === 0 ? 'cerrado' : 'reducido',
                    horarios: horariosReducidosSel,
                    motivo: motivoImprevisto || 'Feriado / Horario reducido'
                })
                if (res.error) {
                    toast.error(res.error, { id: toastId })
                } else {
                    toast.success('Jornada especial guardada para este día', { id: toastId })
                    setShowImprevisto(false)
                    router.refresh()
                    notificarCambioEnTiempoReal('config')
                }
                setProcesandoMasivo(false)
                return
            }

            const res = await reprogramarMasivoImprevisto({
                fecha: selectedDayStr,
                desdeHora: desdeHoraFiltro || undefined,
                motivo: motivoImprevisto || undefined,
                modo: modoMasivo,
                fechaDestino: modoMasivo === 'mover_dia' ? fechaDestinoMasiva : undefined,
                bloquearDia: bloquearDiaCheck
            })

            if (res.error) {
                toast.error(res.error, { id: toastId })
            } else {
                toast.success(
                    res.avisos && res.avisos.length > 0
                        ? `Se actualizaron ${res.avisos.length} turnos. Avisales por WhatsApp abajo.`
                        : res.mensaje || 'Cambios aplicados',
                    { id: toastId }
                )
                setAvisosCola(res.avisos || [])
                router.refresh()
                notificarCambioEnTiempoReal('reservas')
            }
        } catch {
            toast.error('Error al procesar la acción', { id: toastId })
        }
        setProcesandoMasivo(false)
    }

    const restaurarDiaNormal = async () => {
        const toastId = toast.loading('Restaurando horario normal...')
        try {
            const { eliminarJornadaEspecialAction } = await import('@/app/admin/actions')
            await eliminarJornadaEspecialAction(selectedDayStr)
            toast.success('Día restaurado a su horario habitual', { id: toastId })
            router.refresh()
            notificarCambioEnTiempoReal('config')
        } catch {
            toast.error('Error al restaurar el día', { id: toastId })
        }
    }

    const armarWppAvisoCola = (a: AvisoReprogramacionCliente) => {
        const origin = typeof window !== 'undefined' ? window.location.origin : ''
        const link = `${origin}/mi-turno/${a.codigo}`
        const fAnt = a.fechaAnterior.split('-').reverse().join('/')
        const srv = a.servicio.split('(')[0].trim()

        const msg = a.nuevaFecha
            ? `Hola *${a.nombre}* 👋\nPor un imprevisto en el salón trasladamos tu turno de *${srv}* del ${fAnt} al día *${a.nuevaFecha.split('-').reverse().join('/')}* a las *${a.nuevoHorario} hs*.\n\nSi necesitás otro horario podés elegirlo desde tu enlace:\n👉 ${link}\n\n¡Muchas gracias! 💅`
            : `Hola *${a.nombre}* 👋\nSurgió un imprevisto con tu turno de *${srv}* del día *${fAnt}* a las *${a.horarioAnterior} hs*.\n\nPor favor elegí el nuevo día y horario que te quede más cómodo desde nuestro calendario en vivo:\n👉 ${link}\n\n¡Mil disculpas y muchas gracias! 💅✨`

        return `https://wa.me/${a.wppPhone}?text=${encodeURIComponent(msg)}`
    }

    const selectedDateLabel = `${dayNamesLong[selectedDate.getDay()]}, ${selectedDate.getDate()} de ${monthNames[selectedDate.getMonth()]}`

    if (!mounted) {
        return (
            <div className="w-full flex justify-center items-center py-20 min-h-[400px] bg-white/90 backdrop-blur-sm rounded-[2rem] border border-orange-200/50">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-rose-300 border-t-transparent rounded-full animate-spin" />
                    <span className="text-stone-500 font-medium text-sm">
                        Sincronizando agenda...
                    </span>
                </div>
            </div>
        )
    }

    const clienteHistModal = modalData
        ? historialPorCliente.get(
              normalizarCelular(modalData.celular) ||
                  `nombre:${(modalData.cliente || '').toLowerCase().trim()}`
          )
        : undefined

    return (
        <div className="w-full">
            <DashboardAnalytics reservas={reservasList} />

            <div className="w-full relative bg-white/90 backdrop-blur-sm p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-orange-200/50 shadow-md overflow-hidden">
                {/* Barra de Pestañas (Tabs) de la Agenda */}
                <div className="flex flex-wrap items-center gap-2 mb-6 pb-3 border-b border-stone-200">
                    <button
                        type="button"
                        onClick={() => setVistaActiva('calendario')}
                        className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition flex items-center gap-2 cursor-pointer ${
                            vistaActiva === 'calendario' || !modalData
                                ? 'bg-stone-900 text-white shadow-sm'
                                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                    >
                        <span>📅 Calendario y Grilla del Día</span>
                    </button>

                    {modalData && (
                        <div
                            className={`inline-flex items-center rounded-2xl border transition overflow-hidden ${
                                vistaActiva === 'detalle_turno'
                                    ? 'bg-gradient-to-r from-rose-500 to-orange-500 text-white border-transparent shadow-sm'
                                    : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                            }`}
                        >
                            <button
                                type="button"
                                onClick={() => setVistaActiva('detalle_turno')}
                                className="px-4 py-2.5 text-xs sm:text-sm font-black flex items-center gap-2 cursor-pointer"
                            >
                                <span>
                                    💅 Pestaña del Turno: {modalData.cliente} ({modalData.hora} hs)
                                </span>
                            </button>
                            <button
                                type="button"
                                title="Cerrar pestaña del turno"
                                onClick={() => {
                                    setModalData(null)
                                    setVistaActiva('calendario')
                                }}
                                className={`px-2.5 py-2.5 border-l transition cursor-pointer ${
                                    vistaActiva === 'detalle_turno'
                                        ? 'border-white/25 hover:bg-black/15 text-white'
                                        : 'border-rose-200 hover:bg-rose-200/60 text-rose-700'
                                }`}
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>

                {modalData && vistaActiva === 'detalle_turno' ? (
                    <TurnoModal
                        modalData={modalData}
                        setModalData={val => {
                            setModalData(val)
                            if (!val) setVistaActiva('calendario')
                        }}
                        config={config}
                        serviciosCatalogo={serviciosLista}
                        historialCliente={clienteHistModal}
                        onUpdated={partial => {
                            if (partial?.id) {
                                setReservasList(prev =>
                                    prev.map(r =>
                                        r.id === partial.id
                                            ? {
                                                  ...r,
                                                  ...(partial.nombre !== undefined
                                                      ? { nombre: partial.nombre }
                                                      : {}),
                                                  ...(partial.servicio !== undefined
                                                      ? { servicio: partial.servicio }
                                                      : {}),
                                                  ...(partial.fecha !== undefined
                                                      ? { fecha: partial.fecha }
                                                      : {}),
                                                  ...(partial.horario !== undefined
                                                      ? { horario: partial.horario }
                                                      : {}),
                                                  ...(partial.estado !== undefined
                                                      ? { estado: partial.estado }
                                                      : {}),
                                                  ...(partial.descuento_aplicado !== undefined
                                                      ? {
                                                            descuento_aplicado:
                                                                partial.descuento_aplicado
                                                        }
                                                      : {}),
                                                  ...(partial.mp_preference_id !== undefined
                                                      ? {
                                                            mp_preference_id:
                                                                partial.mp_preference_id
                                                        }
                                                      : {})
                                              }
                                            : r
                                    )
                                )
                            }
                        }}
                    />
                ) : (
                <>
                    {/* Barra rápida de turnos PENDIENTES (Confirmación en 1 toque) */}
                    {pendientesFuturos.length > 0 && (
                <div className="mb-6 bg-amber-50/95 border border-amber-300 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 text-amber-600" />
                            Turnos pendientes de confirmación ({pendientesFuturos.length})
                        </span>
                        <span className="text-[11px] text-amber-700 font-medium">
                            Auto-confirmación a los {config?.minutos_autoconfirmacion || 10} min
                        </span>
                    </div>
                    <div className="flex flex-col gap-2">
                        {pendientesFuturos.slice(0, 5).map(p => {
                            const meta = parseReservaMeta(p.mp_preference_id, p.id)
                            const origin =
                                typeof window !== 'undefined' ? window.location.origin : ''
                            const wpp = p.celular
                                ? `https://wa.me/${celularParaWhatsapp(p.celular)}?text=${encodeURIComponent(
                                      `Hola *${p.nombre}*! Confirmamos tu turno del *${p.fecha.split('-').reverse().join('/')}* a las *${p.horario.substring(0, 5)} hs* en ${config?.nombre_negocio || 'Pintaditas Nails'}.\nEnlace de tu turno: ${origin}/mi-turno/${meta.codigo} 💅`
                                  )}`
                                : '#'
                            return (
                                <div
                                    key={p.id}
                                    className="bg-white rounded-xl p-3 border border-amber-200 flex flex-wrap items-center justify-between gap-2"
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-stone-900 truncate">
                                            {p.nombre}{' '}
                                            <span className="text-xs font-normal text-stone-500">
                                                • {p.servicio.split('(')[0]}
                                            </span>
                                        </p>
                                        <p className="text-xs font-semibold text-amber-800">
                                            📅 {p.fecha.split('-').reverse().join('/')} a las{' '}
                                            {p.horario.substring(0, 5)} hs
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => confirmarRapido(p)}
                                            className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 shadow-sm"
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar
                                        </button>
                                        {p.celular && (
                                            <a
                                                href={wpp}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="bg-[#25D366] hover:bg-[#20b857] text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 shadow-sm"
                                            >
                                                <Send className="w-3.5 h-3.5" /> WhatsApp
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            <WeekNavigator
                viewDate={viewDate}
                handlePrevMonth={handlePrevMonth}
                handleNextMonth={handleNextMonth}
                handleGoToday={handleGoToday}
                selectedDate={selectedDate}
                setSelectedDate={handleSelectDate}
                reservas={reservasList}
                jornadasEspeciales={config?.jornadas_especiales || []}
                mesesVisiblesCliente={mesesCliente}
                onChangeMesesVisiblesCliente={handleCambiarMesesCliente}
            />

            {/* Barra de herramientas del día: Imprevistos / Reprogramación Masiva / Feriados */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2 bg-stone-50 border border-stone-200/80 rounded-2xl p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-stone-700">
                    {jornadaEspecialDelDia ? (
                        <span className="bg-rose-100 text-rose-800 border border-rose-300 px-3 py-1 rounded-full font-bold">
                            📌 Día especial: {jornadaEspecialDelDia.tipo.toUpperCase()} (
                            {jornadaEspecialDelDia.motivo || 'Sin motivo'})
                        </span>
                    ) : (
                        <span>
                            Horario habitual: {config?.hora_inicio || '08:30'} a{' '}
                            {config?.hora_fin || '20:00'} hs (Turnos de 1h 30m)
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {/* Botón rápido para habilitar/deshabilitar el turno nocturno de las 21:00 hs */}
                    <button
                        type="button"
                        onClick={handleToggleNocturno}
                        disabled={togglingNocturno}
                        className={`text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 border shadow-sm ${
                            isNocturnoHabilitado
                                ? 'bg-amber-500 hover:bg-amber-600 text-stone-950 border-amber-400 ring-2 ring-amber-300/50'
                                : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200'
                        }`}
                        title="Habilita o deshabilita el turno de las 21:00 hs para que los clientes puedan reservarlo online en esta fecha"
                    >
                        <span>🌙 Turno 21:00 hs:</span>
                        <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                isNocturnoHabilitado
                                    ? 'bg-stone-950 text-amber-300'
                                    : 'bg-stone-200 text-stone-600'
                            }`}
                        >
                            {isNocturnoHabilitado ? 'Habilitado Online' : 'Deshabilitado'}
                        </span>
                    </button>

                    {jornadaEspecialDelDia && (
                        <button
                            type="button"
                            onClick={restaurarDiaNormal}
                            className="text-xs font-bold text-stone-600 hover:text-stone-900 bg-white border border-stone-200 px-3 py-2 rounded-xl"
                        >
                            Restaurar horario normal
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            setShowImprevisto(!showImprevisto)
                            setAvisosCola([])
                        }}
                        className="bg-gradient-to-r from-indigo-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm flex items-center gap-1.5"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Imprevisto / Feriado / Reprogramar Día
                    </button>
                </div>
            </div>

            {showImprevisto && (
                <div className="mb-6 bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 sm:p-5 animate-in fade-in">
                    <h4 className="text-sm font-black text-indigo-950 mb-3 flex items-center gap-2">
                        <CalendarOff className="w-4 h-4 text-indigo-600" />
                        Gestión de Imprevistos y Feriados ({selectedDateLabel})
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                        <button
                            type="button"
                            onClick={() => setModoMasivo('cliente_elige')}
                            className={`p-3 rounded-xl text-xs font-bold border text-left transition ${
                                modoMasivo === 'cliente_elige'
                                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                                    : 'bg-white text-stone-700 border-stone-200'
                            }`}
                        >
                            1. El cliente elige nuevo horario (Link)
                            <span className="block text-[10px] font-normal opacity-80 mt-0.5">
                                Libera los turnos y genera el link de autogestión por WhatsApp.
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setModoMasivo('mover_dia')}
                            className={`p-3 rounded-xl text-xs font-bold border text-left transition ${
                                modoMasivo === 'mover_dia'
                                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                                    : 'bg-white text-stone-700 border-stone-200'
                            }`}
                        >
                            2. Mover día completo a otra fecha
                            <span className="block text-[10px] font-normal opacity-80 mt-0.5">
                                Traslada todos los turnos manteniendo sus horarios.
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setModoMasivo('feriado_reducido')}
                            className={`p-3 rounded-xl text-xs font-bold border text-left transition ${
                                modoMasivo === 'feriado_reducido'
                                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                                    : 'bg-white text-stone-700 border-stone-200'
                            }`}
                        >
                            3. Feriado / Turnos Reducidos
                            <span className="block text-[10px] font-normal opacity-80 mt-0.5">
                                Elegí qué bloques de 2 hs se habilitan o cerrá el día.
                            </span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                        <div>
                            <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                                Motivo (visible para el cliente)
                            </label>
                            <input
                                type="text"
                                value={motivoImprevisto}
                                onChange={e => setMotivoImprevisto(e.target.value)}
                                placeholder="Ej: Feriado / Imprevisto personal"
                                className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs text-stone-800"
                            />
                        </div>

                        {modoMasivo !== 'feriado_reducido' && (
                            <div>
                                <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                                    Afectar turnos desde las (opcional, vacío = todo el día)
                                </label>
                                <select
                                    value={desdeHoraFiltro}
                                    onChange={e => setDesdeHoraFiltro(e.target.value)}
                                    className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs text-stone-800"
                                >
                                    <option value="">
                                        Todo el día ({dayReservas.length} turnos)
                                    </option>
                                    {horariosBaseConfig.map(h => (
                                        <option key={h} value={h}>
                                            Desde las {h} hs en adelante
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {modoMasivo === 'mover_dia' && (
                        <div className="mb-4">
                            <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                                Nueva fecha de destino para todos los turnos
                            </label>
                            <input
                                type="date"
                                min={getHoyUTC3()}
                                value={fechaDestinoMasiva}
                                onChange={e => setFechaDestinoMasiva(e.target.value)}
                                className="bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800"
                            />
                        </div>
                    )}

                    {modoMasivo === 'feriado_reducido' && (
                        <div className="mb-4">
                            <p className="text-xs font-bold text-stone-700 mb-2">
                                Seleccioná los bloques habilitados para este día (si desmarcás
                                todos, el día queda CERRADO):
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {horariosBaseConfig.map(h => {
                                    const activo = horariosReducidosSel.includes(h)
                                    return (
                                        <button
                                            key={h}
                                            type="button"
                                            onClick={() =>
                                                setHorariosReducidosSel(prev =>
                                                    prev.includes(h)
                                                        ? prev.filter(x => x !== h)
                                                        : [...prev, h].sort()
                                                )
                                            }
                                            className={`px-3 py-2 rounded-xl text-xs font-bold border ${
                                                activo
                                                    ? 'bg-emerald-500 text-white border-emerald-600'
                                                    : 'bg-white text-stone-500 border-stone-200'
                                            }`}
                                        >
                                            {h} hs
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {modoMasivo !== 'feriado_reducido' && (
                        <label className="flex items-center gap-2 text-xs font-semibold text-stone-700 mb-4 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={bloquearDiaCheck}
                                onChange={e => setBloquearDiaCheck(e.target.checked)}
                                className="w-4 h-4 accent-indigo-600 rounded"
                            />
                            Cerrar este día en el calendario público para que nadie más reserve
                        </label>
                    )}

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            disabled={procesandoMasivo}
                            onClick={ejecutarAccionDia}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm disabled:opacity-50"
                        >
                            {procesandoMasivo ? 'Aplicando...' : 'Aplicar cambios ahora'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowImprevisto(false)}
                            className="bg-white border border-stone-200 text-stone-600 text-xs font-semibold px-4 py-2.5 rounded-xl"
                        >
                            Cerrar
                        </button>
                    </div>

                    {/* Cola de avisos por WhatsApp generada tras aplicar reprogramación masiva */}
                    {avisosCola.length > 0 && (
                        <div className="mt-5 pt-4 border-t border-indigo-200">
                            <p className="text-xs font-black uppercase tracking-wider text-indigo-900 mb-2">
                                📲 Cola de avisos por WhatsApp ({avisosCola.length} clientes)
                            </p>
                            <div className="flex flex-col gap-2">
                                {avisosCola.map(a => (
                                    <div
                                        key={a.id}
                                        className="bg-white rounded-xl p-3 border border-indigo-100 flex items-center justify-between gap-2"
                                    >
                                        <div>
                                            <p className="text-xs font-bold text-stone-800">
                                                {a.nombre} ({a.horarioAnterior} hs)
                                            </p>
                                            <p className="text-[11px] text-stone-500">
                                                {a.servicio.split('(')[0]}
                                            </p>
                                        </div>
                                        {a.wppPhone ? (
                                            <a
                                                href={armarWppAvisoCola(a)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={() =>
                                                    setAvisadosSet(prev => ({
                                                        ...prev,
                                                        [a.id]: true
                                                    }))
                                                }
                                                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                                                    avisadosSet[a.id]
                                                        ? 'bg-stone-200 text-stone-700'
                                                        : 'bg-[#25D366] text-white shadow-sm'
                                                }`}
                                            >
                                                <Send className="w-3.5 h-3.5" />
                                                {avisadosSet[a.id]
                                                    ? 'Avisado ✓'
                                                    : 'Enviar link por WhatsApp'}
                                            </a>
                                        ) : (
                                            <span className="text-xs text-stone-400">
                                                Sin celular
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Formulario rápido para asignar turno cuando se hace clic en un horario libre */}
            {slotLibreElegido && (
                <form
                    onSubmit={handleCrearTurnoManual}
                    className="mb-6 bg-emerald-50/90 border border-emerald-300 rounded-2xl p-4 sm:p-5 shadow-sm animate-in fade-in"
                >
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-black text-emerald-950 flex items-center gap-2">
                            <Plus className="w-4 h-4 text-emerald-600" />
                            Asignar turno en {selectedDateLabel} a las {slotLibreElegido} hs
                        </h4>
                        <button
                            type="button"
                            onClick={() => setSlotLibreElegido(null)}
                            className="text-stone-400 hover:text-stone-700"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                        <input
                            type="text"
                            required
                            value={nuevoNombre}
                            onChange={e => setNuevoNombre(e.target.value)}
                            placeholder="Nombre del cliente *"
                            className="bg-white border border-emerald-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-800"
                        />
                        <input
                            type="tel"
                            value={nuevoCelular}
                            onChange={e => setNuevoCelular(e.target.value.replace(/\D/g, ''))}
                            placeholder="WhatsApp (ej: 3814556677)"
                            className="bg-white border border-emerald-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-800"
                        />
                        <select
                            required
                            value={nuevoServicio}
                            onChange={e => setNuevoServicio(e.target.value)}
                            className="bg-white border border-emerald-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-800"
                        >
                            <option value="">Seleccionar servicio *</option>
                            {serviciosLista.map(s => (
                                <option
                                    key={s.id}
                                    value={`${s.nombre} ($${Number(s.precio).toLocaleString('es-AR')})`}
                                >
                                    {s.nombre} (${Number(s.precio).toLocaleString('es-AR')})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="submit"
                            disabled={guardandoManual}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm disabled:opacity-50"
                        >
                            {guardandoManual ? 'Guardando...' : 'Guardar y Confirmar Turno'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setSlotLibreElegido(null)}
                            className="bg-white border border-stone-200 text-stone-600 text-xs font-semibold px-4 py-2.5 rounded-xl"
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            )}

            <EventGrid
                dayReservas={dayReservas}
                selectedDateStr={selectedDayStr}
                selectedDateLabel={selectedDateLabel}
                isSunday={selectedDate.getDay() === 0}
                jornadaEspecial={jornadaEspecialDelDia}
                config={config}
                handleEventClick={handleEventClick}
                onSelectFreeSlot={h => setSlotLibreElegido(h)}
            />
                </>
            )}
            </div>
        </div>
    )
}
