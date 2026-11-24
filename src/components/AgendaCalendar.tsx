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
    X,
    Clock,
    SlidersHorizontal,
    Sun,
    Moon
} from 'lucide-react'
import WeekNavigator from './admin/WeekNavigator'
import EventGrid from './admin/EventGrid'
import TurnoModal from './admin/TurnoModal'
import RecordatoriosMananaPanel from './admin/RecordatoriosMananaPanel'
import BottomSheetModal from './ui/BottomSheetModal'
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
    HORARIOS_DOMINGO_DICIEMBRE,
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
    const [vistaActiva, setVistaActiva] = useState<
        'calendario' | 'recordatorios_manana' | 'detalle_turno'
    >('calendario')
    const [mesesCliente, setMesesCliente] = useState<number>(
        Number(config?.meses_visibles_cliente) || 3
    )

    // Cálculo de la fecha de mañana en zona horaria Argentina (UTC-3) y turnos del día siguiente
    const mananaStr = useMemo(() => {
        const now = getAhoraArgentina()
        const tomorrow = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1,
            12,
            0,
            0
        )
        return formatDateStr(tomorrow)
    }, [])

    const resumenManana = useMemo(() => {
        const activos = reservasList.filter(r => {
            if (r.fecha !== mananaStr) return false
            const ef = getEstadoEfectivo(r)
            return ef === 'pendiente' || ef === 'confirmado' || ef === 'completado'
        })
        const sinAvisar = activos.filter(r => !r.notificacion_enviada).length
        return {
            total: activos.length,
            sinAvisar,
            avisados: activos.length - sinAvisar
        }
    }, [reservasList, mananaStr])

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

    // Panel de Configuración de Horarios del Día (Horario Especial / Reducido / Cerrado)
    const [showConfigHorarios, setShowConfigHorarios] = useState(false)
    const [horariosConfigSel, setHorariosConfigSel] = useState<string[]>([])
    const [motivoConfigDia, setMotivoConfigDia] = useState('')
    const [guardandoConfigDia, setGuardandoConfigDia] = useState(false)

    // Panel de Reprogramación Masiva por Imprevisto (cuando hay turnos de clientes afectados)
    const [showReprogramarImprevisto, setShowReprogramarImprevisto] = useState(false)
    const [modoMasivo, setModoMasivo] = useState<'cliente_elige' | 'mover_dia'>('cliente_elige')
    const [motivoImprevisto, setMotivoImprevisto] = useState('')
    const [desdeHoraFiltro, setDesdeHoraFiltro] = useState('')
    const [fechaDestinoMasiva, setFechaDestinoMasiva] = useState('')
    const [bloquearDiaCheck, setBloquearDiaCheck] = useState(true)
    const [procesandoMasivo, setProcesandoMasivo] = useState(false)
    const [avisosCola, setAvisosCola] = useState<AvisoReprogramacionCliente[]>([])
    const [avisadosSet, setAvisadosSet] = useState<Record<number, boolean>>({})

    // Estado reactivo local de jornadas especiales para reflejar cambios instantáneamente
    const [localJornadas, setLocalJornadas] = useState<any[]>(() => config?.jornadas_especiales || [])

    useEffect(() => {
        if (!showConfigHorarios && config?.jornadas_especiales) {
            setLocalJornadas(config.jornadas_especiales)
        }
    }, [config?.jornadas_especiales, showConfigHorarios])

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
        const list = localJornadas || []
        return list.find((j: any) => j.fecha === selectedDayStr)
    }, [localJornadas, selectedDayStr])

    // Sincronizar automáticamente la selección de horarios cuando cambia el día seleccionado o su jornada
    useEffect(() => {
        if (jornadaEspecialDelDia) {
            if (jornadaEspecialDelDia.tipo === 'reducido') {
                setHorariosConfigSel(
                    Array.isArray(jornadaEspecialDelDia.horarios) ? [...jornadaEspecialDelDia.horarios] : []
                )
            } else {
                setHorariosConfigSel([])
            }
            setMotivoConfigDia(jornadaEspecialDelDia.motivo || '')
        } else {
            const isSun = selectedDate.getDay() === 0
            const isSunDec = isSun && selectedDate.getMonth() === 11
            if (isSunDec) {
                setHorariosConfigSel([...HORARIOS_DOMINGO_DICIEMBRE])
            } else if (isSun) {
                setHorariosConfigSel([])
            } else {
                setHorariosConfigSel([...HORARIOS_ESTANDAR_HABITUALES])
            }
            setMotivoConfigDia('')
        }
    }, [selectedDayStr, jornadaEspecialDelDia, selectedDate])

    const infoEstadoDia = useMemo(() => {
        const isSun = selectedDate.getDay() === 0
        const isSunDec = isSun && selectedDate.getMonth() === 11
        if (jornadaEspecialDelDia?.tipo === 'cerrado') {
            return {
                badge: '🔴 Cerrado',
                detalle: jornadaEspecialDelDia.motivo || 'Feriado / Sin atención',
                tipo: 'cerrado'
            }
        }
        if (jornadaEspecialDelDia?.tipo === 'reducido') {
            const count = Array.isArray(jornadaEspecialDelDia.horarios)
                ? jornadaEspecialDelDia.horarios.length
                : 0
            if (count === 0) {
                return {
                    badge: '🔴 Cerrado',
                    detalle: jornadaEspecialDelDia.motivo || 'Sin horarios habilitados',
                    tipo: 'cerrado'
                }
            }
            return {
                badge: `⚡ Especial: ${count} turnos`,
                detalle: (jornadaEspecialDelDia.horarios || []).join(', ') + ' hs',
                tipo: 'reducido'
            }
        }
        if (isSunDec) {
            return {
                badge: '☀️ Domingo Verano',
                detalle: '11:00 a 16:00 hs (4 turnos)',
                tipo: 'habitual'
            }
        }
        if (isSun) {
            return {
                badge: '⚪ Domingo Habitual',
                detalle: 'Cerrado',
                tipo: 'cerrado'
            }
        }
        return {
            badge: '🟢 Horario Habitual',
            detalle: '08:30 a 18:00 hs (6 turnos)',
            tipo: 'habitual'
        }
    }, [selectedDate, jornadaEspecialDelDia])

    const formatearFin = (h: string) => {
        const parts = (h || '08:30').split(':')
        let hora = parseInt(parts[0], 10) || 0
        let min = parseInt(parts[1], 10) || 0
        min += 90
        hora += Math.floor(min / 60)
        min = min % 60
        return `${String(hora).padStart(2, '0')}:${String(min).padStart(2, '0')} hs`
    }

    const toggleSlot = (h: string) => {
        setHorariosConfigSel(prev => {
            if (prev.includes(h)) {
                return prev.filter(x => x !== h)
            } else {
                return [...prev, h].sort()
            }
        })
    }

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

    const guardarHorariosDia = async () => {
        setGuardandoConfigDia(true)
        const toastId = toast.loading('Guardando horarios para este día...')
        try {
            const { guardarJornadaEspecialAction } = await import('@/app/admin/actions')
            const tipoFinal = horariosConfigSel.length === 0 ? 'cerrado' : 'reducido'
            const horariosOrdenados = [...horariosConfigSel].sort()
            const motivoFinal =
                motivoConfigDia ||
                (tipoFinal === 'cerrado'
                    ? 'Día cerrado'
                    : selectedDate.getDay() === 0
                      ? 'Atención en domingo'
                      : 'Horario especial')

            const res = await guardarJornadaEspecialAction({
                fecha: selectedDayStr,
                tipo: tipoFinal,
                horarios: tipoFinal === 'cerrado' ? [] : horariosOrdenados,
                motivo: motivoFinal
            })

            if (res.error) {
                toast.error(res.error, { id: toastId })
            } else {
                setLocalJornadas(prev => {
                    const resto = prev.filter((j: any) => j.fecha !== selectedDayStr)
                    return [
                        ...resto,
                        {
                            fecha: selectedDayStr,
                            tipo: tipoFinal,
                            horarios: tipoFinal === 'cerrado' ? [] : horariosOrdenados,
                            motivo: motivoFinal
                        }
                    ]
                })
                toast.success(
                    tipoFinal === 'cerrado'
                        ? 'Día configurado como CERRADO'
                        : `Horarios guardados: ${horariosOrdenados.length} turnos habilitados`,
                    { id: toastId }
                )
                setShowConfigHorarios(false)
                router.refresh()
                notificarCambioEnTiempoReal('config')
            }
        } catch {
            toast.error('Error al guardar la configuración de horarios', { id: toastId })
        } finally {
            setGuardandoConfigDia(false)
        }
    }

    const ejecutarReprogramacionMasiva = async () => {
        setProcesandoMasivo(true)
        const toastId = toast.loading('Aplicando reprogramación por imprevisto...')
        try {
            const { reprogramarMasivoImprevisto } = await import('@/app/admin/actions')

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
                        ? `Se reprogramaron ${res.avisos.length} turnos. Avisales por WhatsApp abajo.`
                        : res.mensaje || 'Cambios aplicados',
                    { id: toastId }
                )
                setAvisosCola(res.avisos || [])
                router.refresh()
                notificarCambioEnTiempoReal('reservas')
                if (bloquearDiaCheck) {
                    setLocalJornadas(prev => {
                        const resto = prev.filter((j: any) => j.fecha !== selectedDayStr)
                        return [
                            ...resto,
                            {
                                fecha: selectedDayStr,
                                tipo: 'cerrado',
                                horarios: [],
                                motivo: motivoImprevisto || 'Cerrado por imprevisto'
                            }
                        ]
                    })
                    notificarCambioEnTiempoReal('config')
                }
            }
        } catch {
            toast.error('Error al procesar la reprogramación masiva', { id: toastId })
        } finally {
            setProcesandoMasivo(false)
        }
    }

    const restaurarDiaNormal = async () => {
        const toastId = toast.loading('Restaurando horario habitual...')
        try {
            const { eliminarJornadaEspecialAction } = await import('@/app/admin/actions')
            await eliminarJornadaEspecialAction(selectedDayStr)
            setLocalJornadas(prev => prev.filter((j: any) => j.fecha !== selectedDayStr))
            toast.success('Día restaurado a su horario habitual', { id: toastId })
            setShowConfigHorarios(false)
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
            <div className="w-full relative bg-white/90 backdrop-blur-sm p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-orange-200/50 shadow-md overflow-hidden">
                {/* Barra de Pestañas (Tabs) de la Agenda */}
                <div className="flex flex-wrap items-center gap-2 mb-6 pb-3 border-b border-stone-200">
                    <button
                        type="button"
                        onClick={() => setVistaActiva('calendario')}
                        className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition flex items-center gap-2 cursor-pointer ${
                            vistaActiva === 'calendario' ||
                            (vistaActiva === 'detalle_turno' && !modalData)
                                ? 'bg-stone-900 text-white shadow-sm'
                                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                    >
                        <span>📅 Calendario y Grilla del Día</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setVistaActiva('recordatorios_manana')}
                        className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition flex items-center gap-2 cursor-pointer ${
                            vistaActiva === 'recordatorios_manana'
                                ? 'bg-stone-900 text-white shadow-sm'
                                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        }`}
                    >
                        <span>🔔 Turnos de Mañana</span>
                        {resumenManana.total === 0 ? (
                            <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                                    vistaActiva === 'recordatorios_manana'
                                        ? 'bg-stone-700 text-stone-200'
                                        : 'bg-stone-200 text-stone-600'
                                }`}
                            >
                                0
                            </span>
                        ) : resumenManana.sinAvisar > 0 ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-amber-400 text-stone-950 shadow-2xs">
                                {resumenManana.sinAvisar} por avisar
                            </span>
                        ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-emerald-500 text-white shadow-2xs">
                                ✓ {resumenManana.total}/{resumenManana.total} avisadas
                            </span>
                        )}
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

                {vistaActiva === 'recordatorios_manana' ? (
                    <RecordatoriosMananaPanel
                        mananaStr={mananaStr}
                        reservas={reservasList}
                        config={config}
                        historialPorCliente={historialPorCliente}
                        onOpenTurno={r => handleEventClick(r)}
                        onIrAGrillaFecha={fechaStr => {
                            const [y, m, d] = (fechaStr || '').split('-').map(Number)
                            if (y && m && d) {
                                handleSelectDate(new Date(y, m - 1, d, 12, 0, 0))
                            }
                            setVistaActiva('calendario')
                        }}
                        onUpdateReservaLocal={(id, changes) => {
                            setReservasList(prev =>
                                prev.map(r => (r.id === id ? { ...r, ...changes } : r))
                            )
                        }}
                    />
                ) : modalData && vistaActiva === 'detalle_turno' ? (
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
                                                  ...(partial.notificacion_enviada !== undefined
                                                      ? {
                                                            notificacion_enviada:
                                                                partial.notificacion_enviada
                                                        }
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
                jornadasEspeciales={localJornadas}
                mesesVisiblesCliente={mesesCliente}
                onChangeMesesVisiblesCliente={handleCambiarMesesCliente}
            />

            {/* Barra de herramientas del día */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 bg-stone-50 border border-stone-200/80 rounded-2xl p-3.5 shadow-sm">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                        className={`px-3 py-1 rounded-full font-bold border flex items-center gap-1.5 ${
                            infoEstadoDia.tipo === 'cerrado'
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : infoEstadoDia.tipo === 'reducido'
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}
                    >
                        {infoEstadoDia.badge}
                    </span>
                    <span className="text-stone-600 font-medium hidden sm:inline">
                        {infoEstadoDia.detalle}
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Botón 1: Configurar Horarios del Día */}
                    <button
                        type="button"
                        onClick={() => {
                            setShowConfigHorarios(!showConfigHorarios)
                            setShowReprogramarImprevisto(false)
                        }}
                        className={`text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 border shadow-sm ${
                            showConfigHorarios
                                ? 'bg-stone-900 text-white border-stone-900 ring-2 ring-rose-400/50'
                                : 'bg-white hover:bg-stone-50 text-stone-800 border-stone-300'
                        }`}
                        title="Elegí qué bloques de horarios habilitar o cerrar para este día"
                    >
                        <SlidersHorizontal className="w-3.5 h-3.5 text-rose-500" />
                        <span>Configurar Horarios del Día</span>
                    </button>

                    {/* Botón 2: Turno nocturno 21:00 hs */}
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
                            {isNocturnoHabilitado ? 'Habilitado' : 'Deshabilitado'}
                        </span>
                    </button>

                    {/* Botón 3: Reprogramar por Imprevisto */}
                    <button
                        type="button"
                        onClick={() => {
                            setShowReprogramarImprevisto(!showReprogramarImprevisto)
                            setShowConfigHorarios(false)
                            setAvisosCola([])
                        }}
                        className={`text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 border shadow-sm ${
                            showReprogramarImprevisto
                                ? 'bg-indigo-600 text-white border-indigo-700'
                                : 'bg-white hover:bg-stone-50 text-indigo-700 border-indigo-200'
                        }`}
                        title="Reprogramación masiva en caso de imprevistos con clientas agendadas"
                    >
                        <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Reprogramar por Imprevisto</span>
                        {dayReservas.length > 0 && (
                            <span className="bg-indigo-100 text-indigo-800 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                                {dayReservas.length}
                            </span>
                        )}
                    </button>

                    {/* Botón 4: Restaurar Horario Habitual (si el día está personalizado) */}
                    {jornadaEspecialDelDia && (
                        <button
                            type="button"
                            onClick={restaurarDiaNormal}
                            className="text-xs font-bold text-stone-600 hover:text-stone-900 bg-white border border-stone-200 hover:bg-stone-100 px-3 py-2 rounded-xl"
                            title="Quitar cambios especiales y volver al horario estándar de este día"
                        >
                            Restaurar Habitual
                        </button>
                    )}
                </div>
            </div>

            {/* Modal Slide-Up 1: Configuración de Horarios del Día */}
            <BottomSheetModal
                isOpen={showConfigHorarios}
                onClose={() => setShowConfigHorarios(false)}
                maxWidthClass="max-w-2xl"
                headerClassName="bg-gradient-to-r from-rose-50/70 via-pink-50/40 to-white"
                icon={
                    <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center shadow-2xs">
                        <Clock className="w-5 h-5" />
                    </div>
                }
                badge={<span className="text-rose-500">Jornada & Atención</span>}
                title={`Configuración de Horarios: ${selectedDateLabel}`}
                subtitle="Seleccioná con 1 toque qué turnos estarán habilitados para reserva y atención en esta fecha, o cerrá el día completo."
                footer={
                    <div className="flex flex-wrap items-center gap-2 w-full">
                        <button
                            type="button"
                            onClick={() => setShowConfigHorarios(false)}
                            className="px-4 py-3 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 text-xs sm:text-sm font-bold transition cursor-pointer"
                        >
                            Cancelar
                        </button>
                        {jornadaEspecialDelDia && (
                            <button
                                type="button"
                                onClick={restaurarDiaNormal}
                                className="bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-900 text-xs sm:text-sm font-bold px-4 py-3 rounded-xl transition cursor-pointer"
                            >
                                Restaurar Habitual
                            </button>
                        )}
                        <button
                            type="button"
                            disabled={guardandoConfigDia}
                            onClick={guardarHorariosDia}
                            className="flex-1 bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm font-black px-5 py-3 rounded-xl shadow-md disabled:opacity-50 flex items-center justify-center gap-2 transition cursor-pointer"
                        >
                            {guardandoConfigDia ? 'Guardando...' : 'Aplicar y Guardar Horarios'}
                        </button>
                    </div>
                }
            >
                <div className="space-y-4">
                    {/* Plantillas rápidas */}
                    <div className="bg-stone-50 border border-stone-200/90 rounded-2xl p-3.5 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
                            <span className="text-[11px] font-black uppercase text-stone-500 tracking-wider flex items-center gap-1.5">
                                ⚡ Plantillas Rápidas de Horario:
                            </span>
                            <button
                                type="button"
                                onClick={() => setHorariosConfigSel([])}
                                className="w-full sm:w-auto text-xs font-bold px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                                title="Desmarcar todos los turnos para indicar que el día no tendrá atención"
                            >
                                <X className="w-3.5 h-3.5 text-rose-600" />
                                <span>Desmarcar todos (Cerrar día)</span>
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setHorariosConfigSel([...HORARIOS_ESTANDAR_HABITUALES])}
                                className="text-xs font-bold px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-rose-50 hover:border-rose-300 text-stone-700 transition shadow-2xs cursor-pointer"
                            >
                                🌿 Semana Completa (08:30 a 18:00)
                            </button>
                            <button
                                type="button"
                                onClick={() => setHorariosConfigSel([...HORARIOS_DOMINGO_DICIEMBRE])}
                                className="text-xs font-bold px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-rose-50 hover:border-rose-300 text-stone-700 transition shadow-2xs cursor-pointer"
                            >
                                ☀️ Horario Domingo (11:00 a 16:00)
                            </button>
                            <button
                                type="button"
                                onClick={() => setHorariosConfigSel(['08:30', '10:00'])}
                                className="text-xs font-bold px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-rose-50 hover:border-rose-300 text-stone-700 transition shadow-2xs cursor-pointer"
                            >
                                🌅 Solo Mañana
                            </button>
                            <button
                                type="button"
                                onClick={() => setHorariosConfigSel(['13:30', '15:00', '16:30', '18:00'])}
                                className="text-xs font-bold px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-rose-50 hover:border-rose-300 text-stone-700 transition shadow-2xs cursor-pointer"
                            >
                                🌆 Solo Tarde
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    setHorariosConfigSel(prev =>
                                        prev.includes('21:00') ? prev : [...prev, '21:00'].sort()
                                    )
                                }
                                className="text-xs font-bold px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 transition shadow-2xs cursor-pointer"
                            >
                                🌙 + Turno Noche (21:00)
                            </button>
                        </div>
                    </div>

                    {/* Bloques de turnos organizados */}
                    <div className="space-y-4">
                        {/* Bloques de Semana */}
                        <div>
                            <p className="text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Sun className="w-3.5 h-3.5 text-amber-500" />
                                Turnos de Semana y Sábados (Turnos de 1h 30m):
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {HORARIOS_ESTANDAR_HABITUALES.map(h => {
                                    const activo = horariosConfigSel.includes(h)
                                    const fin = formatearFin(h)
                                    return (
                                        <button
                                            key={h}
                                            type="button"
                                            onClick={() => toggleSlot(h)}
                                            className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                                                activo
                                                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                                                    : 'bg-white hover:bg-stone-50 text-stone-600 border-stone-200'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-black">{h} hs</span>
                                                {activo && (
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                                )}
                                            </div>
                                            <span
                                                className={`text-[10px] mt-1 ${
                                                    activo ? 'text-emerald-100' : 'text-stone-400'
                                                }`}
                                            >
                                                Hasta las {fin}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Bloques de Domingo */}
                        <div>
                            <p className="text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <CalendarOff className="w-3.5 h-3.5 text-rose-500" />
                                Turnos de Domingos / Horario Verano (11:00 a 16:00 hs):
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {HORARIOS_DOMINGO_DICIEMBRE.map(h => {
                                    const activo = horariosConfigSel.includes(h)
                                    const fin = formatearFin(h)
                                    return (
                                        <button
                                            key={h}
                                            type="button"
                                            onClick={() => toggleSlot(h)}
                                            className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                                                activo
                                                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                                                    : 'bg-white hover:bg-stone-50 text-stone-600 border-stone-200'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-black">{h} hs</span>
                                                {activo && (
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                                )}
                                            </div>
                                            <span
                                                className={`text-[10px] mt-1 ${
                                                    activo ? 'text-emerald-100' : 'text-stone-400'
                                                }`}
                                            >
                                                Hasta las {fin}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Turno Nocturno Extra */}
                        <div>
                            <p className="text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Moon className="w-3.5 h-3.5 text-indigo-500" />
                                Turno Nocturno Extra:
                            </p>
                            <div className="w-full sm:w-1/2">
                                {(() => {
                                    const h = '21:00'
                                    const activo = horariosConfigSel.includes(h)
                                    const fin = formatearFin(h)
                                    return (
                                        <button
                                            key={h}
                                            type="button"
                                            onClick={() => toggleSlot(h)}
                                            className={`w-full p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                                                activo
                                                    ? 'bg-amber-500 text-stone-950 border-amber-600 shadow-sm font-bold'
                                                    : 'bg-white hover:bg-stone-50 text-stone-600 border-stone-200'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-black">🌙 21:00 hs</span>
                                                {activo && (
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-stone-950" />
                                                )}
                                            </div>
                                            <span
                                                className={`text-[10px] mt-1 ${
                                                    activo ? 'text-stone-900' : 'text-stone-400'
                                                }`}
                                            >
                                                Hasta las {fin}
                                            </span>
                                        </button>
                                    )
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* Motivo o detalle visible para el cliente */}
                    <div>
                        <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                            Motivo / Aclaración (visible para clientas al consultar o reservar):
                        </label>
                        <input
                            type="text"
                            value={motivoConfigDia}
                            onChange={e => setMotivoConfigDia(e.target.value)}
                            placeholder="Ej: Horario especial de domingo / Feriado / Atención reducida"
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-800"
                        />
                    </div>

                    {/* Resumen del resultado */}
                    <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {horariosConfigSel.length > 0 ? (
                                <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>
                                        {horariosConfigSel.length}{' '}
                                        {horariosConfigSel.length === 1
                                            ? 'turno habilitado'
                                            : 'turnos habilitados'}
                                        :{' '}
                                        <span className="font-semibold text-stone-700">
                                            {[...horariosConfigSel].sort().join(', ')} hs
                                        </span>
                                    </span>
                                </span>
                            ) : (
                                <span className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                    Día CERRADO (no habrá turnos disponibles para clientas en esta fecha)
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </BottomSheetModal>

            {/* Modal Slide-Up 2: Reprogramación Masiva por Imprevisto */}
            <BottomSheetModal
                isOpen={showReprogramarImprevisto}
                onClose={() => setShowReprogramarImprevisto(false)}
                maxWidthClass="max-w-xl"
                headerClassName="bg-gradient-to-r from-indigo-50/80 via-blue-50/40 to-white"
                icon={
                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 border border-indigo-200 flex items-center justify-center shadow-2xs">
                        <RefreshCw className="w-5 h-5" />
                    </div>
                }
                badge={<span className="text-indigo-600">Gestión de Imprevistos</span>}
                title={`Reprogramación Masiva (${selectedDateLabel})`}
                subtitle="Gestioná avisos urgentes o traslado en lote para clientas con turnos tomados en esta fecha."
                footer={
                    <div className="flex items-center gap-2.5 w-full">
                        <button
                            type="button"
                            onClick={() => setShowReprogramarImprevisto(false)}
                            className="flex-1 sm:flex-initial px-4 py-3 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 text-xs sm:text-sm font-bold transition cursor-pointer"
                        >
                            Cerrar
                        </button>
                        {dayReservas.length > 0 && (
                            <button
                                type="button"
                                disabled={procesandoMasivo}
                                onClick={ejecutarReprogramacionMasiva}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold px-5 py-3 rounded-xl shadow-md shadow-indigo-200 disabled:opacity-50 transition cursor-pointer"
                            >
                                {procesandoMasivo ? 'Procesando...' : 'Aplicar Reprogramación'}
                            </button>
                        )}
                    </div>
                }
            >
                <div className="space-y-4">
                    {dayReservas.length === 0 ? (
                        <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-6 text-center">
                            <AlertCircle className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                            <p className="text-xs font-bold text-indigo-900 mb-1">
                                No hay turnos registrados en este día
                            </p>
                            <p className="text-[11px] text-stone-500 max-w-md mx-auto">
                                No hay clientas con reservas para reprogramar. Si querés cambiar los horarios de atención o cerrar el día, utilizá el botón <b>&ldquo;Configurar Horarios del Día&rdquo;</b>.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setModoMasivo('cliente_elige')}
                                    className={`p-3 rounded-2xl text-xs font-bold border text-left transition cursor-pointer ${
                                        modoMasivo === 'cliente_elige'
                                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                                            : 'bg-white text-stone-700 border-stone-200'
                                    }`}
                                >
                                    1. El cliente elige nuevo horario (Link WhatsApp)
                                    <span className="block text-[10px] font-normal opacity-80 mt-0.5">
                                        Libera los turnos y genera enlaces de autogestión directa.
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setModoMasivo('mover_dia')}
                                    className={`p-3 rounded-2xl text-xs font-bold border text-left transition cursor-pointer ${
                                        modoMasivo === 'mover_dia'
                                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                                            : 'bg-white text-stone-700 border-stone-200'
                                    }`}
                                >
                                    2. Mover día completo a otra fecha
                                    <span className="block text-[10px] font-normal opacity-80 mt-0.5">
                                        Traslada todos los turnos manteniendo su horario original.
                                    </span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                                        Motivo (visible para la clienta en el mensaje)
                                    </label>
                                    <input
                                        type="text"
                                        value={motivoImprevisto}
                                        onChange={e => setMotivoImprevisto(e.target.value)}
                                        placeholder="Ej: Imprevisto de fuerza mayor / Problema edilicio"
                                        className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2.5 text-xs text-stone-800"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                                        Afectar turnos desde las (opcional, vacío = todo el día)
                                    </label>
                                    <select
                                        value={desdeHoraFiltro}
                                        onChange={e => setDesdeHoraFiltro(e.target.value)}
                                        className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2.5 text-xs text-stone-800"
                                    >
                                        <option value="">Todo el día ({dayReservas.length} turnos)</option>
                                        {dayReservas.map(r => (
                                            <option key={r.id} value={(r.horario || '').substring(0, 5)}>
                                                Desde las {(r.horario || '').substring(0, 5)} hs en adelante
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {modoMasivo === 'mover_dia' && (
                                <div>
                                    <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                                        Nueva fecha de destino para todos los turnos
                                    </label>
                                    <input
                                        type="date"
                                        min={getHoyUTC3()}
                                        value={fechaDestinoMasiva}
                                        onChange={e => setFechaDestinoMasiva(e.target.value)}
                                        className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2.5 text-xs font-bold text-stone-800"
                                    />
                                </div>
                            )}

                            <label className="flex items-center gap-2.5 text-xs font-semibold text-stone-700 p-3 rounded-xl bg-indigo-50/70 border border-indigo-200/70 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={bloquearDiaCheck}
                                    onChange={e => setBloquearDiaCheck(e.target.checked)}
                                    className="w-4 h-4 accent-indigo-600 rounded"
                                />
                                Cerrar este día en el calendario público para que nadie más reserve
                            </label>
                        </>
                    )}

                    {/* Cola de avisos por WhatsApp generada tras aplicar reprogramación masiva */}
                    {avisosCola.length > 0 && (
                        <div className="pt-4 border-t border-indigo-200">
                            <p className="text-xs font-black uppercase tracking-wider text-indigo-900 mb-2">
                                📲 Cola de avisos por WhatsApp ({avisosCola.length} clientes)
                            </p>
                            <div className="flex flex-col gap-2">
                                {avisosCola.map(a => (
                                    <div
                                        key={a.id}
                                        className="bg-stone-50 rounded-xl p-3 border border-indigo-100 flex items-center justify-between gap-2"
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
            </BottomSheetModal>

            {/* Modal Slide-Up 3: Asignar turno cuando se hace clic en un horario libre */}
            <BottomSheetModal
                isOpen={!!slotLibreElegido}
                onClose={() => setSlotLibreElegido(null)}
                maxWidthClass="max-w-md"
                headerClassName="bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-white"
                icon={
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center shadow-2xs">
                        <Plus className="w-5 h-5" />
                    </div>
                }
                badge={<span className="text-emerald-600">Horario Disponible</span>}
                title={`Asignar turno a las ${slotLibreElegido || ''} hs`}
                subtitle={selectedDateLabel}
                footer={
                    <div className="flex items-center gap-2.5 w-full">
                        <button
                            type="button"
                            onClick={() => setSlotLibreElegido(null)}
                            className="px-4 py-3 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 text-xs sm:text-sm font-bold transition cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            form="form-turno-manual-agenda"
                            disabled={guardandoManual}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold px-5 py-3 rounded-xl shadow-md shadow-emerald-200 disabled:opacity-50 transition cursor-pointer"
                        >
                            {guardandoManual ? 'Guardando...' : 'Guardar y Confirmar Turno'}
                        </button>
                    </div>
                }
            >
                <form
                    id="form-turno-manual-agenda"
                    onSubmit={handleCrearTurnoManual}
                    className="space-y-3.5"
                >
                    <div>
                        <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                            Nombre y Apellido de la Clienta *
                        </label>
                        <input
                            type="text"
                            required
                            value={nuevoNombre}
                            onChange={e => setNuevoNombre(e.target.value)}
                            placeholder="Ej: Sofía González"
                            className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-3 text-sm font-semibold text-stone-800"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                            WhatsApp (sin 0 ni 15)
                        </label>
                        <input
                            type="tel"
                            value={nuevoCelular}
                            onChange={e => setNuevoCelular(e.target.value.replace(/\D/g, ''))}
                            placeholder="Ej: 3814556677"
                            className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-3 text-sm font-semibold text-stone-800"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                            Servicio a Realizar *
                        </label>
                        <select
                            required
                            value={nuevoServicio}
                            onChange={e => setNuevoServicio(e.target.value)}
                            className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-3 text-sm font-semibold text-stone-800"
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
                </form>
            </BottomSheetModal>

            <EventGrid
                dayReservas={dayReservas}
                selectedDateStr={selectedDayStr}
                selectedDateLabel={selectedDateLabel}
                isSunday={selectedDate.getDay() === 0}
                jornadaEspecial={jornadaEspecialDelDia}
                config={{
                    ...config,
                    jornadas_especiales: localJornadas
                }}
                handleEventClick={handleEventClick}
                onSelectFreeSlot={h => setSlotLibreElegido(h)}
            />
                </>
            )}
            </div>
        </div>
    )
}
