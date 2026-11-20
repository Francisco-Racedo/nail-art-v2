'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
    Calendar as CalendarIcon,
    Clock,
    Trash2,
    CheckCircle2,
    AlertTriangle,
    CircleDot,
    Sparkles,
    Send,
    ArrowLeft,
    Bell,
    User,
    FileText,
    DollarSign,
    Copy,
    ExternalLink,
    Save,
    RefreshCw,
    History,
    Gift,
    Lock
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { notificarCambioEnTiempoReal } from '@/app/providers'
import GiftCardModal from '../GiftCardModal'
import { ConfirmBottomSheetModal } from '../ui/BottomSheetModal'
import {
    ModalData,
    EstadoReserva,
    ESTADO_CONFIG,
    getHoyUTC3,
    checkCumple,
    validarTransicionEstado
} from './agendaTypes'
import {
    generarHorariosDisponibles,
    celularParaWhatsapp,
    ADICIONALES_CATALOGO
} from '@/lib/utils'

interface ServicioCatalogo {
    id: number
    nombre: string
    precio: number
    categoria: string
}

interface TurnoModalProps {
    modalData: ModalData
    setModalData: React.Dispatch<React.SetStateAction<ModalData | null>>
    config: any
    serviciosCatalogo?: ServicioCatalogo[]
    historialCliente?: {
        totalTurnos: number
        completados: number
        ausencias: number
    }
    onUpdated?: (updatedReservaPartial?: Record<string, any>) => void
}

const ADICIONALES_RAPIDOS = ADICIONALES_CATALOGO

const LAPSOS_SERVICE = [
    { dias: 10, label: '10 días' },
    { dias: 12, label: '12 días' },
    { dias: 14, label: '14 días (2 sem)' },
    { dias: 15, label: '15 días' },
    { dias: 18, label: '18 días (Estándar)' },
    { dias: 21, label: '21 días (3 sem)' }
]

const parsePrecio = (str: string) => {
    const m = (str || '').match(/\$([\d.,]+)/)
    return m ? parseInt(m[1].replace(/[.,]/g, ''), 10) || 0 : 0
}

function sumarDiasFecha(fechaYYYYMMDD: string, dias: number): string {
    const [y, m, d] = (fechaYYYYMMDD || '').split('-').map(Number)
    if (!y || !m || !d) return ''
    const dt = new Date(y, m - 1, d, 12, 0, 0)
    dt.setDate(dt.getDate() + dias)
    const yr = dt.getFullYear()
    const mo = String(dt.getMonth() + 1).padStart(2, '0')
    const da = String(dt.getDate()).padStart(2, '0')
    return `${da}/${mo}/${yr}`
}

export default function TurnoModal({
    modalData,
    setModalData,
    config,
    serviciosCatalogo = [],
    historialCliente,
    onUpdated
}: TurnoModalProps) {
    const router = useRouter()
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [estadoPorConfirmar, setEstadoPorConfirmar] = useState<EstadoReserva | null>(null)

    // 1. Estado de Servicio, Adicionales, Descuento y Pago
    const [servicioElegido, setServicioElegido] = useState<string>(modalData.servicio)
    const [adicionalesSel, setAdicionalesSel] = useState<string[]>(
        modalData.adicionales || []
    )
    const [precioPersonalizado, setPrecioPersonalizado] = useState<string>(
        modalData.precio_personalizado !== undefined
            ? String(modalData.precio_personalizado)
            : ''
    )
    const [descuento, setDescuento] = useState<number>(modalData.descuento_aplicado || 0)
    const [motivoDescuento, setMotivoDescuento] = useState<string>(
        modalData.descuento_motivo ||
            (checkCumple(modalData.fecha_nacimiento)
                ? 'Cumpleaños 🎂'
                : 'Clienta frecuente ⭐')
    )
    const [metodoPago, setMetodoPago] = useState<string>(
        modalData.metodo_pago || 'local'
    )
    const [estadoPago, setEstadoPago] = useState<string>(
        modalData.estado_pago || 'pendiente'
    )
    const [ocupaSiguiente, setOcupaSiguiente] = useState<boolean>(
        !!modalData.ocupa_bloque_siguiente
    )
    const [guardandoServicio, setGuardandoServicio] = useState(false)
    const [giftCardModalOpen, setGiftCardModalOpen] = useState(false)

    // 2. Estado de Fecha y Horario (Zona Horaria Argentina)
    const [nuevaFecha, setNuevaFecha] = useState(modalData.fecha)
    const [nuevoHorario, setNuevoHorario] = useState(modalData.hora)
    const [horarioCustom, setHorarioCustom] = useState('')
    const [usarHorarioCustom, setUsarHorarioCustom] = useState(false)
    const [ocupadosDelDia, setOcupadosDelDia] = useState<
        { horario: string; estado: string }[]
    >([])
    const [horariosDelDia, setHorariosDelDia] = useState<string[]>([])
    const [cerradoDiaInfo, setCerradoDiaInfo] = useState<{
        cerrado: boolean
        motivo?: string
    }>({ cerrado: false })
    const [isFetchingTimes, setIsFetchingTimes] = useState(false)
    const [isRescheduling, setIsRescheduling] = useState(false)

    // 3. Estado de Recordatorio de Service (personalizable por turno/clienta)
    const [diasService, setDiasService] = useState<number>(
        modalData.dias_recordatorio_service || 18
    )
    const [guardandoService, setGuardandoService] = useState(false)

    // 4. Estado de Datos de la Clienta y Notas del Turno
    const [nombreCliente, setNombreCliente] = useState(modalData.cliente || '')
    const [celularCliente, setCelularCliente] = useState(modalData.celular || '')
    const [emailCliente, setEmailCliente] = useState(modalData.email || '')
    const [nacimientoCliente, setNacimientoCliente] = useState(
        modalData.fecha_nacimiento || ''
    )
    const [notasTurno, setNotasTurno] = useState(modalData.notas_turno || '')
    const [guardandoFicha, setGuardandoFicha] = useState(false)

    // Sincronizar si cambia el turno seleccionado
    useEffect(() => {
        setServicioElegido(modalData.servicio)
        setAdicionalesSel(modalData.adicionales || [])
        setPrecioPersonalizado(
            modalData.precio_personalizado !== undefined
                ? String(modalData.precio_personalizado)
                : ''
        )
        setDescuento(modalData.descuento_aplicado || 0)
        setMotivoDescuento(
            modalData.descuento_motivo ||
                (checkCumple(modalData.fecha_nacimiento)
                    ? 'Cumpleaños 🎂'
                    : 'Clienta frecuente ⭐')
        )
        setMetodoPago(modalData.metodo_pago || 'local')
        setEstadoPago(modalData.estado_pago || 'pendiente')
        setOcupaSiguiente(!!modalData.ocupa_bloque_siguiente)
        setNuevaFecha(modalData.fecha)
        setNuevoHorario(modalData.hora)
        setUsarHorarioCustom(false)
        setHorarioCustom('')
        setDiasService(modalData.dias_recordatorio_service || 18)
        setNombreCliente(modalData.cliente || '')
        setCelularCliente(modalData.celular || '')
        setEmailCliente(modalData.email || '')
        setNacimientoCliente(modalData.fecha_nacimiento || '')
        setNotasTurno(modalData.notas_turno || '')
    }, [modalData.id])

    // Consultar disponibilidad real en vivo cada vez que cambia `nuevaFecha`
    useEffect(() => {
        if (!nuevaFecha) return

        let active = true
        setIsFetchingTimes(true)

        fetch(`/api/reservas/${nuevaFecha}?t=${Date.now()}`, { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                if (!active) return
                setCerradoDiaInfo({
                    cerrado: !!data.cerrado,
                    motivo: data.motivo
                })
                if (Array.isArray(data.horariosBase) && data.horariosBase.length > 0) {
                    setHorariosDelDia(data.horariosBase)
                } else {
                    setHorariosDelDia(
                        generarHorariosDisponibles(
                            config?.hora_inicio || '10:00',
                            config?.hora_fin || '22:00',
                            config?.intervalo_minutos || 120
                        )
                    )
                }
                if (Array.isArray(data.ocupados)) {
                    setOcupadosDelDia(
                        data.ocupados.map((o: any) => ({
                            horario: (o.horario || '').substring(0, 5),
                            estado: o.estado || 'pendiente'
                        }))
                    )
                } else {
                    setOcupadosDelDia([])
                }
            })
            .catch(() => {
                if (active) toast.error('Error al consultar disponibilidad del día.')
            })
            .finally(() => {
                if (active) setIsFetchingTimes(false)
            })

        return () => {
            active = false
        }
    }, [nuevaFecha, config])

    const estadoCfg = ESTADO_CONFIG[modalData.estado] || ESTADO_CONFIG.pendiente
    const esCumple = checkCumple(nacimientoCliente || modalData.fecha_nacimiento)
    const nombreNegocio = config?.nombre_negocio || 'Pintaditas Nails'

    // Agrupar catálogo de servicios por categoría para el selector
    const serviciosPorCategoria = useMemo(() => {
        const grupos: Record<string, ServicioCatalogo[]> = {}
        for (const s of serviciosCatalogo) {
            const cat = s.categoria || 'Servicios'
            if (!grupos[cat]) grupos[cat] = []
            grupos[cat].push(s)
        }
        return grupos
    }, [serviciosCatalogo])

    // Cálculo en vivo de precios (Servicio base + Adicionales o Precio Manual - Descuento)
    const calculoPrecio = useMemo(() => {
        const baseServicio = parsePrecio(servicioElegido)
        const extraAdicionales = adicionalesSel.reduce((acc, id) => {
            const item = ADICIONALES_RAPIDOS.find(a => a.id === id)
            return acc + (item ? item.precio : 0)
        }, 0)
        const subtotalAutomatico = baseServicio + extraAdicionales
        const manualNum =
            precioPersonalizado.trim() !== ''
                ? parseInt(precioPersonalizado.replace(/\D/g, ''), 10)
                : NaN
        const subtotalBase = !isNaN(manualNum) && manualNum >= 0 ? manualNum : subtotalAutomatico
        const montoDescuento = Math.round(subtotalBase * ((descuento || 0) / 100))
        const totalFinal = Math.max(0, subtotalBase - montoDescuento)

        return {
            baseServicio,
            extraAdicionales,
            subtotalAutomatico,
            subtotalBase,
            montoDescuento,
            totalFinal,
            usaManual: !isNaN(manualNum) && manualNum >= 0
        }
    }, [servicioElegido, adicionalesSel, precioPersonalizado, descuento])

    const fechaSugeridaService = useMemo(
        () => sumarDiasFecha(nuevaFecha || modalData.fecha, diasService),
        [nuevaFecha, modalData.fecha, diasService]
    )

    const getOrigin = () =>
        typeof window !== 'undefined' ? window.location.origin : ''

    const codigoPublico = modalData.codigo || `T${modalData.id}`
    const linkSeguimiento = `${getOrigin()}/mi-turno/${codigoPublico}`

    const getWppLink = (
        tipo:
            | 'confirmacion'
            | 'reprogramar'
            | 'recordatorio_24h'
            | 'proximo_service'
            | 'cumple' = 'confirmacion'
    ) => {
        const cel = celularCliente || modalData.celular
        if (!cel) return '#'
        const num = celularParaWhatsapp(cel)
        const fechaLatam = (nuevaFecha || modalData.fecha)
            .split('-')
            .reverse()
            .join('/')
        const horaFinal = usarHorarioCustom && horarioCustom ? horarioCustom : nuevoHorario || modalData.hora
        const srvLimpio = servicioElegido.split('(')[0].trim()

        if (tipo === 'reprogramar') {
            const text = `Hola *${nombreCliente}* 👋\nTe escribimos de *${nombreNegocio}*.\nSurgió un imprevisto con tu turno del *${fechaLatam}* a las *${horaFinal} hs* (${srvLimpio}).\n\nPodés elegir el nuevo día y horario que te quede más cómodo directamente desde tu enlace:\n👉 ${linkSeguimiento}\n\n¡Mil disculpas y muchas gracias! 💅✨`
            return `https://wa.me/${num}?text=${encodeURIComponent(text)}`
        }

        if (tipo === 'recordatorio_24h') {
            const text = `¡Hola *${nombreCliente}*! 👋✨\nTe recordamos tu turno en *${nombreNegocio}* para *${srvLimpio}* el día *${fechaLatam}* a las *${horaFinal} hs*.\n\nPodés ver los detalles de tu turno aquí:\n👉 ${linkSeguimiento}\n\n¡Te esperamos! 💖💅`
            return `https://wa.me/${num}?text=${encodeURIComponent(text)}`
        }

        if (tipo === 'proximo_service') {
            const text = `¡Hola *${nombreCliente}*! 💖✨\nTe escribimos de *${nombreNegocio}*. Según el lapso de *${diasService} días* que acordamos para cuidar el crecimiento de tus uñas (${srvLimpio}), tu próximo service/retoque te tocaría alrededor del *${fechaSugeridaService}*.\n\nSi querés ir reservando tu lugar, avisanos o elegí tu horario desde la web. ¡Te esperamos! 💅✨`
            return `https://wa.me/${num}?text=${encodeURIComponent(text)}`
        }

        if (tipo === 'cumple') {
            const text = `¡Hola *${nombreCliente}*! 🎂✨\nEn *${nombreNegocio}* celebramos tu Día Especial y queremos regalarte un beneficio especial en tu turno de *${srvLimpio}*. ¡Te esperamos! 💅🎉`
            return `https://wa.me/${num}?text=${encodeURIComponent(text)}`
        }

        const descTxt =
            descuento > 0
                ? `\n🎁 *Beneficio aplicado:* ${descuento}% OFF (${motivoDescuento})`
                : ''
        const adicTxt =
            adicionalesSel.length > 0
                ? `\n✨ *Adicionales:* ${adicionalesSel
                      .map(id => ADICIONALES_RAPIDOS.find(a => a.id === id)?.label)
                      .filter(Boolean)
                      .join(', ')}`
                : ''

        const text = `Hola *${nombreCliente}* 👋\nTe escribimos de *${nombreNegocio}*. Confirmamos tu turno para *${srvLimpio}* el día *${fechaLatam}* a las *${horaFinal} hs*.${adicTxt}${descTxt}\n💰 *Total estimado:* $${calculoPrecio.totalFinal.toLocaleString('es-AR')}\n\nEnlace de tu turno (estado o reprogramación):\n👉 ${linkSeguimiento}\n\n¡Te esperamos! 💅✨`
        return `https://wa.me/${num}?text=${encodeURIComponent(text)}`
    }

    const patchTurno = async (
        payload: Record<string, unknown>,
        successMessage: string
    ) => {
        const res = await fetch(`/api/admin/reservas/${modalData.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        const data = await res.json()
        if (!res.ok) {
            throw new Error(data.error || 'No se pudo actualizar el turno')
        }
        toast.success(successMessage)
        onUpdated?.({
            id: modalData.id,
            ...payload,
            ...(data.mp_preference_id ? { mp_preference_id: data.mp_preference_id } : {})
        })
        router.refresh()
        notificarCambioEnTiempoReal('reservas')
        return data
    }

    const handleGuardarServicioYCobro = async () => {
        setGuardandoServicio(true)
        const toastId = toast.loading('Guardando cambios de servicio y cobro...')
        try {
            const manualNum =
                precioPersonalizado.trim() !== ''
                    ? parseInt(precioPersonalizado.replace(/\D/g, ''), 10)
                    : null

            // Solo guardamos precio_personalizado cuando la administradora ingresó explícitamente un valor manual;
            // de lo contrario enviamos null para que siempre se calcule de forma dinámica (Servicio Base + Adicionales).
            const precioParaGuardar =
                manualNum !== null && !isNaN(manualNum) ? manualNum : null

            const data = await patchTurno(
                {
                    servicio: servicioElegido,
                    adicionales: adicionalesSel,
                    precio_personalizado: precioParaGuardar,
                    descuento_aplicado: descuento,
                    descuento_motivo: motivoDescuento,
                    metodo_pago: metodoPago,
                    estado_pago: estadoPago,
                    ocupa_bloque_siguiente: ocupaSiguiente
                },
                'Servicio, adicionales y cobro actualizados'
            )
            toast.dismiss(toastId)
            setModalData(prev =>
                prev
                    ? {
                          ...prev,
                          servicio: servicioElegido,
                          adicionales: adicionalesSel,
                          precio_personalizado:
                              precioParaGuardar === null ? undefined : precioParaGuardar,
                          descuento_aplicado: descuento,
                          descuento_motivo: motivoDescuento,
                          metodo_pago: metodoPago,
                          estado_pago: estadoPago,
                          ocupa_bloque_siguiente: ocupaSiguiente,
                          mp_preference_id: data.mp_preference_id || prev.mp_preference_id
                      }
                    : null
            )
        } catch (err: any) {
            toast.error(err.message || 'Error al guardar servicio', { id: toastId })
        } finally {
            setGuardandoServicio(false)
        }
    }

    const handleGuardarFechaHora = async () => {
        const horaElegida = (
            usarHorarioCustom ? horarioCustom : nuevoHorario
        )
            .trim()
            .substring(0, 5)

        if (!nuevaFecha || !/^\d{2}:\d{2}$/.test(horaElegida)) {
            toast.error('Seleccioná una fecha y un horario válido (HH:MM).')
            return
        }

        setIsRescheduling(true)
        const toastId = toast.loading('Actualizando día y horario del turno...')
        try {
            const data = await patchTurno(
                {
                    fecha: nuevaFecha,
                    horario: horaElegida
                },
                `Turno reprogramado al ${nuevaFecha.split('-').reverse().join('/')} a las ${horaElegida} hs`
            )
            toast.dismiss(toastId)
            setModalData(prev =>
                prev
                    ? {
                          ...prev,
                          fecha: nuevaFecha,
                          hora: horaElegida,
                          reprogramado: true,
                          codigo: data.codigo || prev.codigo
                      }
                    : null
            )
            setNuevoHorario(horaElegida)
            setUsarHorarioCustom(false)
        } catch (err: any) {
            toast.error(err.message || 'No se pudo cambiar la fecha/hora', {
                id: toastId
            })
        } finally {
            setIsRescheduling(false)
        }
    }

    const handleGuardarLapsoService = async (diasNuevo?: number) => {
        const valor = Math.max(5, Math.min(90, Number(diasNuevo ?? diasService) || 18))
        setDiasService(valor)
        setGuardandoService(true)
        const toastId = toast.loading('Guardando configuración de recordatorio...')
        try {
            await patchTurno(
                { dias_recordatorio_service: valor },
                `Recordatorio de service configurado a ${valor} días`
            )
            toast.dismiss(toastId)
            setModalData(prev =>
                prev ? { ...prev, dias_recordatorio_service: valor } : null
            )
        } catch (err: any) {
            toast.error(err.message || 'Error al guardar recordatorio', { id: toastId })
        } finally {
            setGuardandoService(false)
        }
    }

    const handleGuardarDatosCliente = async () => {
        if (nombreCliente.trim().length < 2) {
            toast.error('El nombre de la clienta debe tener al menos 2 caracteres.')
            return
        }
        setGuardandoFicha(true)
        const toastId = toast.loading('Actualizando datos y notas del turno...')
        try {
            await patchTurno(
                {
                    nombre: nombreCliente.trim(),
                    celular: celularCliente.trim(),
                    email: emailCliente.trim(),
                    fecha_nacimiento: nacimientoCliente.trim(),
                    notas_turno: notasTurno.trim()
                },
                'Datos de la clienta y notas guardados'
            )
            toast.dismiss(toastId)
            setModalData(prev =>
                prev
                    ? {
                          ...prev,
                          cliente: nombreCliente.trim(),
                          celular: celularCliente.trim(),
                          email: emailCliente.trim(),
                          fecha_nacimiento: nacimientoCliente.trim(),
                          notas_turno: notasTurno.trim()
                      }
                    : null
            )
        } catch (err: any) {
            toast.error(err.message || 'Error al guardar datos', { id: toastId })
        } finally {
            setGuardandoFicha(false)
        }
    }

    const ejecutarCambioEstado = async (nuevoEstado: EstadoReserva) => {
        if (!modalData) return
        setEstadoPorConfirmar(null)

        const payload: Record<string, unknown> = { estado: nuevoEstado }
        if (nuevoEstado === 'reprogramar') {
            payload.motivo_reprogramacion =
                'Surgió un imprevisto en el salón. Por favor elegí tu nuevo día y horario disponible.'
        }

        const toastId = toast.loading('Actualizando estado del turno...')
        try {
            const data = await patchTurno(
                payload,
                `Estado cambiado a ${ESTADO_CONFIG[nuevoEstado].label}`
            )
            toast.dismiss(toastId)
            setModalData(prev =>
                prev
                    ? {
                          ...prev,
                          estado: nuevoEstado,
                          codigo: data.codigo || prev.codigo,
                          ...(nuevoEstado === 'completado'
                              ? { estado_pago: 'pagado_total' }
                              : {})
                      }
                    : null
            )
            if (nuevoEstado === 'completado') {
                setEstadoPago('pagado_total')
            }
        } catch (err: any) {
            toast.error(err.message || 'No se pudo actualizar el estado', {
                id: toastId
            })
        }
    }

    const actualizarEstado = async (nuevoEstado: EstadoReserva) => {
        if (!modalData) return

        // 1. Validar si la transición entre estados es legal
        const validacion = validarTransicionEstado(modalData.estado, nuevoEstado)
        if (!validacion.permitida) {
            toast.error(validacion.motivo || 'Transición de estado no permitida.')
            return
        }

        // 2. Confirmaciones preventivas en modal slide-up según el tipo de estado
        if (
            nuevoEstado === 'cancelado' ||
            nuevoEstado === 'ausente' ||
            (modalData.estado === 'completado' && nuevoEstado === 'confirmado')
        ) {
            setEstadoPorConfirmar(nuevoEstado)
            return
        }

        await ejecutarCambioEstado(nuevoEstado)
    }

    const liberarTurno = async () => {
        const idToDelete = modalData.id
        setConfirmDelete(false)
        const toastId = toast.loading('Eliminando turno y liberando horario...')

        try {
            const res = await fetch(`/api/admin/reservas/${idToDelete}`, {
                method: 'DELETE'
            })
            if (!res.ok) throw new Error('Falló servidor')
            toast.success('Turno eliminado y horario liberado', { id: toastId })
            setModalData(null)
            router.refresh()
            notificarCambioEnTiempoReal('reservas')
            onUpdated?.()
        } catch {
            toast.error('Error al liberar turno', { id: toastId })
        }
    }

    const grillaHorariosVista = useMemo(() => {
        const base =
            horariosDelDia.length > 0
                ? horariosDelDia
                : generarHorariosDisponibles(
                      config?.hora_inicio || '10:00',
                      config?.hora_fin || '22:00',
                      config?.intervalo_minutos || 120
                  )
        // Si el turno actual tiene un horario que no está en base y estamos viendo su misma fecha, incluirlo ordenado
        const set = new Set<string>(base)
        if (nuevaFecha === modalData.fecha && modalData.hora) {
            set.add(modalData.hora.substring(0, 5))
        }
        return Array.from(set).sort()
    }, [horariosDelDia, config, nuevaFecha, modalData.fecha, modalData.hora])

    return (
        <div className="w-full animate-in fade-in duration-300">
            {/* Barra superior de navegación de la Pestaña del Turno */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-stone-200">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setModalData(null)}
                        className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm transition cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver a la Grilla del Día
                    </button>
                    <div className="hidden sm:flex items-center gap-2 text-xs text-stone-500 font-semibold">
                        <span>Agenda</span>
                        <span>›</span>
                        <span>{modalData.fecha.split('-').reverse().join('/')}</span>
                        <span>›</span>
                        <span className="text-rose-600 font-bold">
                            Turno #{modalData.id} ({modalData.hora} hs)
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setGiftCardModalOpen(true)}
                        className="inline-flex items-center gap-1.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow-sm cursor-pointer"
                    >
                        <Gift className="w-3.5 h-3.5" />
                        Emitir Gift Card
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            navigator.clipboard?.writeText(linkSeguimiento)
                            toast.success('Enlace de seguimiento copiado al portapapeles')
                        }}
                        className="inline-flex items-center gap-1.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer"
                    >
                        <Copy className="w-3.5 h-3.5 text-rose-500" />
                        Copiar link cliente
                    </button>
                    <a
                        href={`/mi-turno/${codigoPublico}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold px-3 py-2 rounded-xl transition"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Ver página del turno
                    </a>
                </div>
            </div>

            {/* Tarjeta Principal de Resumen y Acciones Rápidas de WhatsApp */}
            <div className="bg-gradient-to-br from-rose-50/90 via-orange-50/60 to-white border border-rose-200/80 rounded-3xl p-5 sm:p-6 mb-6 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-rose-200/60">
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${estadoCfg.bg} ${estadoCfg.color} ${estadoCfg.border}`}
                            >
                                <CircleDot className="w-3.5 h-3.5" />
                                {estadoCfg.label}
                            </span>
                            <span className="bg-white text-stone-800 border border-stone-200 px-3 py-1 rounded-full text-xs font-bold">
                                📅 {modalData.fecha.split('-').reverse().join('/')} • 🕒{' '}
                                {modalData.hora} hs (ARG)
                            </span>
                            {modalData.reprogramado && (
                                <span className="bg-indigo-100 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-full text-xs font-bold">
                                    🔄 Reprogramado
                                </span>
                            )}
                            {historialCliente && (
                                <span className="bg-white text-stone-700 border border-stone-200 px-2.5 py-1 rounded-full text-xs font-semibold">
                                    ⭐ {historialCliente.completados} servicios realizados
                                    {historialCliente.ausencias > 0 &&
                                        ` • ⚠️ ${historialCliente.ausencias} ausencias`}
                                </span>
                            )}
                            {esCumple && (
                                <span className="bg-rose-100 text-rose-700 border border-rose-300 px-2.5 py-1 rounded-full text-xs font-bold">
                                    🎂 ¡Día / Semana de Cumpleaños!
                                </span>
                            )}
                        </div>

                        <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                            {nombreCliente || modalData.cliente}
                        </h2>
                        <p className="text-stone-600 text-sm font-medium mt-0.5">
                            📱 {celularCliente || 'Sin WhatsApp cargado'}
                            {emailCliente ? ` • ✉️ ${emailCliente}` : ''}
                            {nacimientoCliente
                                ? ` • 🎂 Nac.: ${nacimientoCliente.split('-').reverse().join('/')}`
                                : ''}
                        </p>
                    </div>

                    <div className="bg-white/95 border border-rose-200 rounded-2xl px-5 py-3.5 flex flex-col items-start lg:items-end justify-center shrink-0 shadow-sm">
                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                            Total Final del Turno
                        </span>
                        <span className="text-3xl font-black text-rose-600 leading-tight">
                            ${calculoPrecio.totalFinal.toLocaleString('es-AR')}
                        </span>
                        <span className="text-[11px] font-semibold text-stone-500">
                            {servicioElegido.split('(')[0].trim()}
                            {adicionalesSel.length > 0 &&
                                ` + ${adicionalesSel.length} adic.`}
                            {descuento > 0 && ` (-${descuento}%)`}
                        </span>
                    </div>
                </div>

                {/* Centro de Mensajes WhatsApp en 1 Clic */}
                {(celularCliente || modalData.celular) && (
                    <div className="pt-4">
                        <p className="text-[11px] font-black uppercase tracking-wider text-stone-500 mb-2.5">
                            📲 Enviar aviso directo por WhatsApp a {nombreCliente}:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                            <a
                                href={getWppLink('confirmacion')}
                                onClick={() => {
                                    if (modalData.estado === 'pendiente') {
                                        actualizarEstado('confirmado')
                                    }
                                }}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20b857] text-white font-bold py-2.5 px-3.5 rounded-xl text-xs shadow-sm transition"
                            >
                                <Send className="w-3.5 h-3.5" />
                                Confirmar Turno
                            </a>
                            <a
                                href={getWppLink('recordatorio_24h')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3.5 rounded-xl text-xs shadow-sm transition"
                            >
                                <Clock className="w-3.5 h-3.5" />
                                Recordatorio de Turno
                            </a>
                            <a
                                href={getWppLink('reprogramar')}
                                onClick={() => {
                                    if (modalData.estado !== 'reprogramar') {
                                        actualizarEstado('reprogramar')
                                    }
                                }}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-3.5 rounded-xl text-xs shadow-sm transition"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Link para Reprogramar
                            </a>
                            <a
                                href={getWppLink('proximo_service')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white font-bold py-2.5 px-3.5 rounded-xl text-xs shadow-sm transition"
                            >
                                <Bell className="w-3.5 h-3.5" />
                                Recordar Service ({diasService} d)
                            </a>
                        </div>
                    </div>
                )}
            </div>

            {/* Grilla Principal de 2 Columnas con todas las herramientas de edición */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* COLUMNA IZQUIERDA (7 cols): Servicio/Precio + Día/Horario */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                    {/* TARJETA 1: CAMBIO DE SERVICIO, ADICIONALES, DESCUENTO Y COBRO */}
                    <div className="bg-white border border-stone-200/90 rounded-3xl p-5 sm:p-6 shadow-sm">
                        <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-stone-100">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                                    <Sparkles className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-stone-900">
                                        1. Servicio, Adicionales y Cobro
                                    </h3>
                                    <p className="text-xs text-stone-500">
                                        Modificá el trabajo si la clienta cambió de idea o sumó
                                        deco/retirado.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Selector de Servicio Principal */}
                        <div className="mb-4">
                            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                                Servicio Principal Seleccionado
                            </label>
                            <select
                                value={servicioElegido}
                                onChange={e => {
                                    setServicioElegido(e.target.value)
                                    setPrecioPersonalizado('')
                                }}
                                className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-rose-400 rounded-xl px-3.5 py-3 text-sm font-bold text-stone-900 transition"
                            >
                                {/* Mantener opción actual si es histórica y no coincide con el catálogo nuevo */}
                                {!serviciosCatalogo.some(
                                    s =>
                                        `${s.nombre} ($${Number(s.precio).toLocaleString('es-AR')})` ===
                                            servicioElegido ||
                                        `${s.nombre} ($${s.precio})` === servicioElegido
                                ) && (
                                    <option value={servicioElegido}>
                                        {servicioElegido} (Servicio actual)
                                    </option>
                                )}
                                {Object.keys(serviciosPorCategoria).map(cat => (
                                    <optgroup key={cat} label={cat.toUpperCase()}>
                                        {serviciosPorCategoria[cat].map(s => {
                                            const val = `${s.nombre} ($${Number(s.precio).toLocaleString('es-AR')})`
                                            return (
                                                <option key={s.id} value={val}>
                                                    {s.nombre} ($
                                                    {Number(s.precio).toLocaleString('es-AR')})
                                                </option>
                                            )
                                        })}
                                    </optgroup>
                                ))}
                            </select>
                        </div>

                        {/* Adicionales / Nail Art / Retirado (Chips interactivos) */}
                        <div className="mb-4">
                            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                                Sumar Adicionales / Nail Art / Retirado al turno
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {ADICIONALES_RAPIDOS.filter(
                                    ad => ad.id !== 'retirado_otro'
                                ).map(ad => {
                                    const activo = adicionalesSel.includes(ad.id)
                                    return (
                                        <button
                                            key={ad.id}
                                            type="button"
                                            onClick={() => {
                                                setAdicionalesSel(prev =>
                                                    prev.includes(ad.id)
                                                        ? prev.filter(x => x !== ad.id)
                                                        : [...prev, ad.id]
                                                )
                                                setPrecioPersonalizado('')
                                            }}
                                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                                                activo
                                                    ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                                                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-rose-50 hover:border-rose-200'
                                            }`}
                                        >
                                            {activo ? '✓ ' : '+ '}
                                            {ad.label} (+${ad.precio.toLocaleString('es-AR')})
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Alerta inteligente: 10% OFF en 12° Servicio (Fidelidad) */}
                        {historialCliente && historialCliente.completados >= 11 && (
                            <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-pink-50 border border-amber-300 flex items-center justify-between gap-3 shadow-sm">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-2xl">🏆</span>
                                    <div>
                                        <p className="text-xs font-black text-amber-950 uppercase tracking-wide">
                                            ¡12° Servicio • 10% OFF Fidelidad!
                                        </p>
                                        <p className="text-[11px] text-amber-900 font-medium">
                                            {historialCliente.completados === 11
                                                ? '¡Este turno completa su ciclo de 12 servicios! Le corresponde un 10% de regalo.'
                                                : `Esta clienta acumula ${historialCliente.completados} servicios realizados.`}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDescuento(10)
                                        setMotivoDescuento('Servicio N° 12 (10% OFF Fidelidad) 🏆')
                                        toast.success('Descuento de 10% por 12° servicio aplicado')
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black tracking-wide shadow-sm transition shrink-0 cursor-pointer"
                                >
                                    Aplicar 10% OFF
                                </button>
                            </div>
                        )}

                        {/* Descuento (%) y Precio Personalizado */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                            <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-3.5">
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-2">
                                    Descuento / Promoción (%)
                                </label>
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {[0, 10, 15, 20, 25, 100].map(pct => (
                                        <button
                                            key={pct}
                                            type="button"
                                            onClick={() => {
                                                setDescuento(pct)
                                                if (pct === 100) {
                                                    setMotivoDescuento('Voucher / Gift Card de Regalo 🎁')
                                                }
                                            }}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer ${
                                                descuento === pct
                                                    ? 'bg-rose-500 text-white border-rose-600'
                                                    : 'bg-white text-stone-700 border-stone-200'
                                            }`}
                                        >
                                            {pct === 0 ? '0%' : pct === 100 ? '100% (Voucher)' : `-${pct}%`}
                                        </button>
                                    ))}
                                </div>
                                <select
                                    value={motivoDescuento}
                                    onChange={e => setMotivoDescuento(e.target.value)}
                                    className="w-full bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-stone-800"
                                >
                                    <option value="Servicio N° 12 (10% OFF Fidelidad) 🏆">
                                        Servicio N° 12 (10% OFF Fidelidad) 🏆
                                    </option>
                                    <option value="Voucher / Gift Card de Regalo 🎁">
                                        Voucher / Gift Card de Regalo 🎁
                                    </option>
                                    <option value="Cumpleaños 🎂">Cumpleaños 🎂</option>
                                    <option value="Clienta frecuente ⭐">
                                        Clienta frecuente ⭐
                                    </option>
                                    <option value="Promoción especial ✨">
                                        Promoción especial ✨
                                    </option>
                                </select>
                            </div>

                            <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-3.5">
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600">
                                        Precio Base Manual (Opcional)
                                    </label>
                                    {precioPersonalizado.trim() !== '' && (
                                        <button
                                            type="button"
                                            onClick={() => setPrecioPersonalizado('')}
                                            className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                                        >
                                            Usar automático ($
                                            {calculoPrecio.subtotalAutomatico.toLocaleString(
                                                'es-AR'
                                            )}
                                            )
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <DollarSign className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="number"
                                        min={0}
                                        step={500}
                                        value={precioPersonalizado}
                                        onChange={e => setPrecioPersonalizado(e.target.value)}
                                        placeholder={`Automático: $${calculoPrecio.subtotalAutomatico.toLocaleString('es-AR')}`}
                                        className="w-full bg-white border border-stone-200 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-stone-900"
                                    />
                                </div>
                                <p className="text-[10px] text-stone-500 mt-1.5">
                                    Dejalo vacío para calcular automático (servicio + adicionales).
                                </p>
                            </div>
                        </div>

                        {/* Método de Pago y Duración del Bloque */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1">
                                    Medio de Pago
                                </label>
                                <select
                                    value={metodoPago}
                                    onChange={e => setMetodoPago(e.target.value)}
                                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-bold text-stone-800"
                                >
                                    <option value="local">💵 Efectivo / En el Salón</option>
                                    <option value="transferencia">🏦 Transferencia / Alias</option>
                                    <option value="voucher">🎁 Voucher / Gift Card de Regalo</option>
                                    <option value="mp">💳 Mercado Pago</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1">
                                    Estado del Cobro
                                </label>
                                <select
                                    value={estadoPago}
                                    onChange={e => setEstadoPago(e.target.value)}
                                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-bold text-stone-800"
                                >
                                    <option value="pendiente">⏳ Pendiente de cobro</option>
                                    <option value="pagado_sena">✨ Seña abonada</option>
                                    <option value="pagado_total">✅ Pagado Total</option>
                                </select>
                            </div>
                        </div>

                        <label className="flex items-center justify-between gap-3 bg-amber-50/70 border border-amber-200 rounded-2xl px-4 py-3 mb-4 cursor-pointer">
                            <div>
                                <span className="text-xs font-bold text-stone-800 block">
                                    ⏱️ Servicio largo: ocupar también el bloque siguiente (+1h 30m)
                                </span>
                                <span className="text-[11px] text-stone-500">
                                    Activalo si el trabajo incluye retirado + diseño complejo (ej: 2 horas o más).
                                </span>
                            </div>
                            <input
                                type="checkbox"
                                checked={ocupaSiguiente}
                                onChange={e => setOcupaSiguiente(e.target.checked)}
                                className="w-4 h-4 accent-rose-600 rounded"
                            />
                        </label>

                        {/* Resumen de liquidación y botón de guardado */}
                        <div className="bg-stone-900 text-white rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-[11px] text-stone-300 font-semibold">
                                    Base: ${calculoPrecio.baseServicio.toLocaleString('es-AR')}
                                    {calculoPrecio.extraAdicionales > 0 &&
                                        ` + Adic.: $${calculoPrecio.extraAdicionales.toLocaleString('es-AR')}`}
                                    {calculoPrecio.montoDescuento > 0 &&
                                        ` - Desc.: $${calculoPrecio.montoDescuento.toLocaleString('es-AR')}`}
                                </p>
                                <p className="text-lg font-black text-white">
                                    Total a cobrar: $
                                    {calculoPrecio.totalFinal.toLocaleString('es-AR')}
                                </p>
                            </div>
                            <button
                                type="button"
                                disabled={guardandoServicio}
                                onClick={handleGuardarServicioYCobro}
                                className="bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white text-xs font-bold px-5 py-3 rounded-xl shadow-md flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
                            >
                                <Save className="w-4 h-4" />
                                {guardandoServicio
                                    ? 'Guardando...'
                                    : 'Guardar Servicio y Cobro'}
                            </button>
                        </div>
                    </div>

                    {/* TARJETA 2: CAMBIO DE DÍA Y HORARIO (ZONA HORARIA ARGENTINA) */}
                    <div className="bg-white border border-stone-200/90 rounded-3xl p-5 sm:p-6 shadow-sm">
                        <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-stone-100">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                                    <CalendarIcon className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-stone-900">
                                        2. Día y Horario del Turno (Hora Argentina)
                                    </h3>
                                    <p className="text-xs text-stone-500">
                                        Turno asignado actualmente el{' '}
                                        <strong>
                                            {modalData.fecha.split('-').reverse().join('/')}
                                        </strong>{' '}
                                        a las <strong>{modalData.hora} hs</strong>.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                                    Fecha del Turno
                                </label>
                                <input
                                    type="date"
                                    value={nuevaFecha}
                                    onChange={e => {
                                        setNuevaFecha(e.target.value)
                                        if (e.target.value === modalData.fecha) {
                                            setNuevoHorario(modalData.hora)
                                        } else {
                                            setNuevoHorario('')
                                        }
                                    }}
                                    className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-orange-400 text-stone-900 rounded-xl px-3.5 py-2.5 text-sm font-bold"
                                />
                            </div>

                            <div className="flex flex-col justify-end">
                                <label className="flex items-center gap-2 text-xs font-bold text-stone-700 cursor-pointer mb-1.5">
                                    <input
                                        type="checkbox"
                                        checked={usarHorarioCustom}
                                        onChange={e => setUsarHorarioCustom(e.target.checked)}
                                        className="w-4 h-4 accent-orange-500 rounded"
                                    />
                                    Asignar horario especial / personalizado
                                </label>
                                {usarHorarioCustom && (
                                    <input
                                        type="time"
                                        value={horarioCustom}
                                        onChange={e => setHorarioCustom(e.target.value)}
                                        className="w-full bg-orange-50 border border-orange-300 text-stone-900 rounded-xl px-3.5 py-2 text-sm font-bold"
                                    />
                                )}
                            </div>
                        </div>

                        {cerradoDiaInfo.cerrado && (
                            <div className="mb-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs font-semibold text-amber-800">
                                ⚠️ Nota: El día {nuevaFecha.split('-').reverse().join('/')} figura
                                como cerrado para clientes ({cerradoDiaInfo.motivo || 'Cerrado'}),
                                pero como administradora podés asignar un horario igualmente.
                            </div>
                        )}

                        {!usarHorarioCustom && (
                            <div className="mb-4">
                                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
                                    Disponibilidad de Bloques el{' '}
                                    {nuevaFecha.split('-').reverse().join('/')}
                                </label>

                                {isFetchingTimes ? (
                                    <div className="h-28 bg-stone-50 border border-stone-200 rounded-2xl flex items-center justify-center">
                                        <span className="text-xs font-semibold text-stone-500">
                                            Consultando horarios en tiempo real...
                                        </span>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                        {grillaHorariosVista.map(t => {
                                            const ocupadoInfo = ocupadosDelDia.find(
                                                o => o.horario === t
                                            )
                                            const esHorarioActualDeEsteTurno =
                                                t === modalData.hora &&
                                                nuevaFecha === modalData.fecha
                                            const ocupadoPorOtro =
                                                !!ocupadoInfo && !esHorarioActualDeEsteTurno
                                            const isSelected = nuevoHorario === t

                                            let cardStyle =
                                                'bg-emerald-50/70 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                                            let subLabel = '🟢 Disponible'

                                            if (ocupadoPorOtro) {
                                                cardStyle =
                                                    'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed opacity-75'
                                                subLabel = '🔒 Ocupado'
                                            } else if (esHorarioActualDeEsteTurno && isSelected) {
                                                cardStyle =
                                                    'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-300'
                                                subLabel = '📍 Turno actual'
                                            } else if (esHorarioActualDeEsteTurno) {
                                                cardStyle =
                                                    'bg-indigo-50 text-indigo-900 border-indigo-300 hover:bg-indigo-100'
                                                subLabel = '📍 Turno actual'
                                            } else if (isSelected) {
                                                cardStyle =
                                                    'bg-gradient-to-r from-orange-500 to-rose-500 text-white border-transparent shadow-md scale-[1.02]'
                                                subLabel = '✨ Nuevo elegido'
                                            }

                                            return (
                                                <button
                                                    key={t}
                                                    type="button"
                                                    disabled={ocupadoPorOtro}
                                                    onClick={() => setNuevoHorario(t)}
                                                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${cardStyle}`}
                                                >
                                                    <span className="text-sm font-black">
                                                        {t} hs
                                                    </span>
                                                    <span className="text-[10px] font-bold mt-1 opacity-90">
                                                        {subLabel}
                                                    </span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            type="button"
                            disabled={
                                isRescheduling ||
                                (!usarHorarioCustom && !nuevoHorario) ||
                                (usarHorarioCustom && !horarioCustom)
                            }
                            onClick={handleGuardarFechaHora}
                            className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3 rounded-xl shadow-sm disabled:opacity-50 flex justify-center items-center gap-2 text-xs sm:text-sm transition cursor-pointer"
                        >
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            {isRescheduling
                                ? 'Actualizando horario...'
                                : 'Guardar Día y Horario del Turno'}
                        </button>
                    </div>
                </div>

                {/* COLUMNA DERECHA (5 cols): Lapso Recordatorio Service + Ficha Clienta + Estado */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                    {/* TARJETA 3: LAPSO PERSONALIZADO DEL RECORDATORIO DE SERVICE */}
                    <div className="bg-gradient-to-br from-indigo-50/80 via-white to-rose-50/50 border border-indigo-200/90 rounded-3xl p-5 sm:p-6 shadow-sm">
                        <div className="flex items-center gap-2.5 mb-3 pb-3 border-b border-indigo-100">
                            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                                <Bell className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-stone-900">
                                    3. Recordatorio de Próximo Service
                                </h3>
                                <p className="text-xs text-stone-500">
                                    Elegí en cuántos días avisarle a esta clienta (ej. 10, 14, 15 o
                                    18 días).
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mb-3">
                            {LAPSOS_SERVICE.map(op => {
                                const activo = diasService === op.dias
                                return (
                                    <button
                                        key={op.dias}
                                        type="button"
                                        onClick={() => handleGuardarLapsoService(op.dias)}
                                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                                            activo
                                                ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                                                : 'bg-white text-stone-700 border-stone-200 hover:bg-indigo-50'
                                        }`}
                                    >
                                        {op.label}
                                    </button>
                                )
                            })}
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                            <label className="text-xs font-bold text-stone-700 shrink-0">
                                Cantidad personalizada (días):
                            </label>
                            <input
                                type="number"
                                min={5}
                                max={90}
                                value={diasService}
                                onChange={e =>
                                    setDiasService(
                                        Math.max(1, parseInt(e.target.value || '18', 10))
                                    )
                                }
                                className="w-20 bg-white border border-indigo-200 rounded-xl px-3 py-1.5 text-xs font-black text-indigo-900 text-center"
                            />
                            <button
                                type="button"
                                disabled={guardandoService}
                                onClick={() => handleGuardarLapsoService(diasService)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer"
                            >
                                Guardar lapso
                            </button>
                        </div>

                        <div className="bg-white/90 border border-indigo-200/80 rounded-2xl p-3.5 flex items-center justify-between gap-2">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500 block">
                                    Fecha sugerida de Service (+{diasService} días)
                                </span>
                                <span className="text-sm font-black text-stone-900">
                                    📅 Alrededor del {fechaSugeridaService}
                                </span>
                            </div>
                            {(celularCliente || modalData.celular) && (
                                <a
                                    href={getWppLink('proximo_service')}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shrink-0"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                    Avisar WhatsApp
                                </a>
                            )}
                        </div>
                    </div>

                    {/* TARJETA 4: DATOS DE LA CLIENTA Y NOTAS TÉCNICAS DEL TURNO */}
                    <div className="bg-white border border-stone-200/90 rounded-3xl p-5 sm:p-6 shadow-sm">
                        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-stone-100">
                            <div className="w-9 h-9 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center font-bold">
                                <User className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-stone-900">
                                    4. Datos de la Clienta y Notas
                                </h3>
                                <p className="text-xs text-stone-500">
                                    Se sincroniza automáticamente con la pestaña Clientes.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                            <div>
                                <label className="block text-[11px] font-bold uppercase text-stone-600 mb-1">
                                    Nombre y Apellido
                                </label>
                                <input
                                    type="text"
                                    value={nombreCliente}
                                    onChange={e => setNombreCliente(e.target.value)}
                                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold uppercase text-stone-600 mb-1">
                                    WhatsApp
                                </label>
                                <input
                                    type="tel"
                                    value={celularCliente}
                                    onChange={e =>
                                        setCelularCliente(e.target.value.replace(/\D/g, ''))
                                    }
                                    placeholder="Ej: 3814556677"
                                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold uppercase text-stone-600 mb-1">
                                    Fecha de Nacimiento
                                </label>
                                <input
                                    type="date"
                                    value={nacimientoCliente}
                                    onChange={e => setNacimientoCliente(e.target.value)}
                                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold uppercase text-stone-600 mb-1">
                                    Email (Opcional)
                                </label>
                                <input
                                    type="email"
                                    value={emailCliente}
                                    onChange={e => setEmailCliente(e.target.value)}
                                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900"
                                />
                            </div>
                        </div>

                        <div className="mb-3">
                            <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-stone-600 mb-1">
                                <FileText className="w-3.5 h-3.5 text-pink-500" />
                                Notas del Turno / Ficha Técnica de Manicuría
                            </label>
                            <textarea
                                rows={3}
                                value={notasTurno}
                                onChange={e => setNotasTurno(e.target.value)}
                                placeholder="Ej: Quiere almendra largo #2, base rubber rosa, trae trabajo de otro salón para retirar..."
                                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs font-medium text-stone-800"
                            />
                        </div>

                        <button
                            type="button"
                            disabled={guardandoFicha}
                            onClick={handleGuardarDatosCliente}
                            className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <Save className="w-3.5 h-3.5" />
                            {guardandoFicha
                                ? 'Guardando datos...'
                                : 'Guardar Datos y Notas Técnicas'}
                        </button>
                    </div>

                    {/* TARJETA 5: ESTADO DEL TURNO Y ELIMINACIÓN */}
                    <div className="bg-white border border-stone-200/90 rounded-3xl p-5 sm:p-6 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-stone-100">
                            <div>
                                <p className="text-xs font-black text-stone-800 uppercase tracking-wider">
                                    5. Cambiar Estado del Turno
                                </p>
                                <p className="text-[11px] text-stone-500">
                                    Gestión secuencial del ciclo de atención. No es posible retroceder a estados previos ya superados.
                                </p>
                            </div>
                            <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${estadoCfg.bg} ${estadoCfg.color} ${estadoCfg.border}`}
                            >
                                <span className="w-2 h-2 rounded-full bg-current" />
                                Estado: {estadoCfg.label}
                            </span>
                        </div>

                        {/* Flujo Guía de Estados */}
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-stone-500 bg-stone-50 p-2.5 rounded-xl border border-stone-200/80 mb-3.5 overflow-x-auto">
                            <span className="text-stone-400">Flujo habitual:</span>
                            <span
                                className={`px-2 py-0.5 rounded-md transition-all ${
                                    modalData.estado === 'pendiente'
                                        ? 'bg-amber-100 text-amber-800 font-black ring-1 ring-amber-300'
                                        : 'text-stone-500'
                                }`}
                            >
                                1. Pendiente
                            </span>
                            <span>➔</span>
                            <span
                                className={`px-2 py-0.5 rounded-md transition-all ${
                                    modalData.estado === 'confirmado'
                                        ? 'bg-emerald-100 text-emerald-800 font-black ring-1 ring-emerald-300'
                                        : 'text-stone-500'
                                }`}
                            >
                                2. Confirmado
                            </span>
                            <span>➔</span>
                            <span
                                className={`px-2 py-0.5 rounded-md transition-all ${
                                    modalData.estado === 'completado'
                                        ? 'bg-rose-100 text-rose-800 font-black ring-1 ring-rose-300'
                                        : 'text-stone-500'
                                }`}
                            >
                                3. Completado
                            </span>
                            <span className="ml-auto text-stone-400 text-[9px] hidden sm:inline">
                                (Opciones: Reprogramar / Ausente / Cancelar)
                            </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
                            {(
                                [
                                    'pendiente',
                                    'confirmado',
                                    'completado',
                                    'reprogramar',
                                    'ausente',
                                    'cancelado'
                                ] as EstadoReserva[]
                            ).map(e => {
                                const cfg = ESTADO_CONFIG[e]
                                const isCurrent = modalData.estado === e
                                const validacion = validarTransicionEstado(modalData.estado, e)
                                const isAllowed = isCurrent || validacion.permitida

                                return (
                                    <button
                                        key={e}
                                        type="button"
                                        onClick={() => {
                                            if (isCurrent) return
                                            if (!isAllowed) {
                                                toast.error(
                                                    validacion.motivo ||
                                                        'Transición de estado no permitida'
                                                )
                                                return
                                            }
                                            actualizarEstado(e)
                                        }}
                                        title={
                                            isCurrent
                                                ? 'Estado actual'
                                                : isAllowed
                                                  ? `Cambiar a ${cfg.label}`
                                                  : validacion.motivo
                                        }
                                        className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition ${
                                            isCurrent
                                                ? `${cfg.bg} ${cfg.color} ${cfg.border} cursor-default shadow-sm ring-2 ring-current/20`
                                                : isAllowed
                                                  ? `bg-stone-50 text-stone-700 border-stone-200 cursor-pointer ${cfg.hoverCls}`
                                                  : 'bg-stone-100/70 text-stone-400 border-stone-200/60 cursor-not-allowed opacity-40 hover:bg-stone-100'
                                        }`}
                                    >
                                        {isCurrent ? (
                                            <CheckCircle2 className="w-3 h-3 inline mr-1 text-current" />
                                        ) : !isAllowed ? (
                                            <Lock className="w-3 h-3 inline mr-1 text-stone-400" />
                                        ) : null}
                                        {cfg.label}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Historial rápido de eventos del turno */}
                        {modalData.historial_eventos &&
                            modalData.historial_eventos.length > 0 && (
                                <div className="mb-4 pt-3 border-t border-stone-100">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-2 flex items-center gap-1">
                                        <History className="w-3.5 h-3.5" /> Registro de Actividad del
                                        Turno
                                    </p>
                                    <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                                        {modalData.historial_eventos
                                            .slice()
                                            .reverse()
                                            .map((ev, idx) => (
                                                <div
                                                    key={idx}
                                                    className="text-[11px] text-stone-600 bg-stone-50 rounded-lg px-2.5 py-1.5 border border-stone-100"
                                                >
                                                    <span className="font-bold text-stone-800">
                                                        {ev.detalle || ev.accion}
                                                    </span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}

                        {/* Eliminar registro y liberar horario */}
                        <div className="pt-3 border-t border-stone-100">
                            <button
                                type="button"
                                onClick={() => setConfirmDelete(true)}
                                className="w-full flex items-center justify-center gap-2 bg-white text-stone-500 border border-stone-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 font-bold py-2.5 rounded-xl transition text-xs cursor-pointer"
                            >
                                <Trash2 className="w-4 h-4" /> Eliminar turno y liberar horario
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Slide-Up de confirmación para cambio de estado delicado */}
            <ConfirmBottomSheetModal
                isOpen={!!estadoPorConfirmar}
                onClose={() => setEstadoPorConfirmar(null)}
                onConfirm={() => {
                    if (estadoPorConfirmar) {
                        ejecutarCambioEstado(estadoPorConfirmar)
                    }
                }}
                title={
                    estadoPorConfirmar === 'cancelado'
                        ? '¿Cancelar este turno?'
                        : estadoPorConfirmar === 'ausente'
                          ? '¿Registrar inasistencia (Ausente)?'
                          : '¿Rectificar estado a Confirmado?'
                }
                description={
                    estadoPorConfirmar === 'cancelado'
                        ? 'El turno pasará a estado Cancelado y el horario quedará liberado en la agenda para otra clienta.'
                        : estadoPorConfirmar === 'ausente'
                          ? 'Se registrará que la clienta no asistió a su turno en su ficha de historial.'
                          : 'Este turno ya figuraba como Completado. ¿Seguro que deseás rectificarlo y volver a marcarlo como Confirmado?'
                }
                confirmLabel={
                    estadoPorConfirmar === 'cancelado'
                        ? 'Sí, Cancelar Turno'
                        : estadoPorConfirmar === 'ausente'
                          ? 'Sí, Marcar Ausente'
                          : 'Sí, Rectificar'
                }
                cancelLabel="Volver"
                variant={estadoPorConfirmar === 'cancelado' ? 'danger' : 'warning'}
            />

            {/* Modal Slide-Up de confirmación para eliminar turno */}
            <ConfirmBottomSheetModal
                isOpen={confirmDelete}
                onClose={() => setConfirmDelete(false)}
                onConfirm={liberarTurno}
                title="¿Eliminar turno permanentemente?"
                description="Esta acción borrará el registro del turno de la base de datos y dejará el bloque horario libre en la agenda."
                confirmLabel="Sí, Eliminar Turno"
                cancelLabel="Cancelar"
                variant="danger"
            />

            {/* Modal de Emisión de Gift Card digital */}
            <GiftCardModal
                isOpen={giftCardModalOpen}
                onClose={() => setGiftCardModalOpen(false)}
                isAdmin={true}
                defaultServicio={servicioElegido.split('(')[0].trim()}
                clienteDestino={{
                    nombre: nombreCliente || modalData.cliente,
                    celular: celularCliente || modalData.celular
                }}
            />
        </div>
    )
}
