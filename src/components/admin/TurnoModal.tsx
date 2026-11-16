import React, { useState, useEffect } from 'react'
import {
    Calendar as CalendarIcon,
    Clock,
    X,
    Trash2,
    CheckCircle2,
    AlertTriangle,
    CircleDot,
    Sparkles,
    Send
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
    ModalData,
    EstadoReserva,
    ESTADO_CONFIG,
    getHoyUTC3,
    checkCumple
} from './agendaTypes'
import { generarHorariosDisponibles, celularParaWhatsapp } from '@/lib/utils'

interface TurnoModalProps {
    modalData: ModalData
    setModalData: React.Dispatch<React.SetStateAction<ModalData | null>>
    config: any
    historialCliente?: {
        totalTurnos: number
        completados: number
        ausencias: number
    }
}

const parsePrecio = (str: string) => {
    const m = str.match(/\$([\d.,]+)/)
    return m ? parseInt(m[1].replace(/\./g, ''), 10) : 0
}

export default function TurnoModal({
    modalData,
    setModalData,
    config,
    historialCliente
}: TurnoModalProps) {
    const router = useRouter()
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [descuento, setDescuento] = useState<number>(modalData.descuento_aplicado || 0)
    const [motivoDescuento, setMotivoDescuento] = useState<string>(
        modalData.descuento_motivo ||
            (checkCumple(modalData.fecha_nacimiento) ? 'Cumpleaños 🎂' : 'Cliente frecuente ⭐')
    )
    const [showDescuentoForm, setShowDescuentoForm] = useState(false)
    const [ocupaSiguiente, setOcupaSiguiente] = useState<boolean>(
        !!modalData.ocupa_bloque_siguiente
    )

    // Estados Reprogramación Manual
    const [isEditingDate, setIsEditingDate] = useState(false)
    const [nuevaFecha, setNuevaFecha] = useState(modalData.fecha)
    const [nuevoHorario, setNuevoHorario] = useState(modalData.hora)
    const [ocupadosDelDia, setOcupadosDelDia] = useState<{ horario: string; estado: string }[]>([])
    const [horariosDelDia, setHorariosDelDia] = useState<string[]>([])
    const [isFetchingTimes, setIsFetchingTimes] = useState(false)
    const [isRescheduling, setIsRescheduling] = useState(false)

    const estadoCfg = ESTADO_CONFIG[modalData.estado] || ESTADO_CONFIG.pendiente
    const esCumple = checkCumple(modalData.fecha_nacimiento)

    const getOrigin = () => (typeof window !== 'undefined' ? window.location.origin : '')

    const getWppLink = (tipo: 'confirmacion' | 'reprogramar' | 'cumple' = 'confirmacion') => {
        if (!modalData?.celular) return '#'
        const num = celularParaWhatsapp(modalData.celular)
        const fechaLatam = modalData.fecha.split('-').reverse().join('/')
        const srvLimpio = modalData.servicio.split('(')[0].trim()
        const codigo = modalData.codigo || `T${modalData.id}`
        const linkTurno = `${getOrigin()}/mi-turno/${codigo}`

        if (tipo === 'reprogramar') {
            const text = `Hola *${modalData.cliente}* 👋\nTe escribimos de *${config?.nombre_negocio || 'Fran & Romy Nails'}*.\nSurgió un imprevisto con tu turno del *${fechaLatam}* a las *${modalData.hora} hs* (${srvLimpio}).\n\nPodés elegir el nuevo día y horario que te quede más cómodo directamente desde este enlace:\n👉 ${linkTurno}\n\n¡Mil disculpas y muchas gracias! 💅✨`
            return `https://wa.me/${num}?text=${encodeURIComponent(text)}`
        }

        if (tipo === 'cumple') {
            const text = `¡Hola *${modalData.cliente}*! 🎂✨\nEn *${config?.nombre_negocio || 'Fran & Romy Nails'}* vimos que estás en tu semana de cumpleaños y queremos regalarte un beneficio especial en tu turno de *${srvLimpio}*. ¡Te esperamos! 💅🎉`
            return `https://wa.me/${num}?text=${encodeURIComponent(text)}`
        }

        const descTxt =
            (modalData.descuento_aplicado || 0) > 0
                ? `\n🎁 *Beneficio aplicado:* ${modalData.descuento_aplicado}% OFF (${modalData.descuento_motivo || 'Promoción'})`
                : ''

        const text = `Hola *${modalData.cliente}* 👋\nTe escribimos de *${config?.nombre_negocio || 'Fran & Romy Nails'}*. Confirmamos tu turno para *${srvLimpio}* el día *${fechaLatam}* a las *${modalData.hora} hs*.${descTxt}\n\nEnlace de tu turno (estado o reprogramación):\n${linkTurno}\n\n¡Te esperamos! 💅✨`
        return `https://wa.me/${num}?text=${encodeURIComponent(text)}`
    }

    const marcarNotificacionEnviada = async () => {
        setModalData({ ...modalData, notificacion_enviada: true })
        try {
            await fetch(`/api/admin/reservas/${modalData.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificacion_enviada: true })
            })
            router.refresh()
        } catch {}
    }

    const toggleOcupaSiguiente = async (val: boolean) => {
        setOcupaSiguiente(val)
        try {
            const res = await fetch(`/api/admin/reservas/${modalData.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ocupa_bloque_siguiente: val })
            })
            if (res.ok) {
                setModalData(prev => (prev ? { ...prev, ocupa_bloque_siguiente: val } : null))
                toast.success(
                    val
                        ? 'Se bloqueó también el bloque siguiente (+2 hs)'
                        : 'El turno vuelve a ocupar 1 bloque (2 hs)'
                )
                router.refresh()
            }
        } catch {
            toast.error('No se pudo actualizar la duración')
        }
    }

    const guardarDescuentoOpcional = async () => {
        const toastId = toast.loading('Guardando descuento...')
        try {
            const res = await fetch(`/api/admin/reservas/${modalData.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    descuento_aplicado: descuento,
                    descuento_motivo: motivoDescuento
                })
            })
            if (!res.ok) throw new Error()
            setModalData(prev =>
                prev
                    ? {
                          ...prev,
                          descuento_aplicado: descuento,
                          descuento_motivo: motivoDescuento
                      }
                    : null
            )
            setShowDescuentoForm(false)
            toast.success('Descuento actualizado', { id: toastId })
            router.refresh()
        } catch {
            toast.error('Error al aplicar descuento', { id: toastId })
        }
    }

    const liberarTurno = async () => {
        const idToDelete = modalData.id
        setConfirmDelete(false)
        setModalData(null)
        const toastId = toast.loading('Eliminando turno...')

        try {
            const res = await fetch(`/api/admin/reservas/${idToDelete}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Falló servidor')
            toast.success('Turno eliminado y horario liberado', { id: toastId })
            router.refresh()
        } catch {
            toast.error('Error al liberar turno', { id: toastId })
            router.refresh()
        }
    }

    const actualizarEstado = async (nuevoEstado: EstadoReserva, customDesc?: number) => {
        const payload: Record<string, unknown> = { estado: nuevoEstado }
        if (customDesc !== undefined) {
            payload.descuento_aplicado = customDesc
            payload.descuento_motivo = motivoDescuento
        }
        if (nuevoEstado === 'reprogramar') {
            payload.motivo_reprogramacion =
                'Surgió un imprevisto en el salón. Por favor elegí tu nuevo día y horario disponible.'
        }

        const toastId = toast.loading('Actualizando estado...')
        try {
            const res = await fetch(`/api/admin/reservas/${modalData.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            const data = await res.json()
            if (!res.ok) throw new Error()
            toast.success(`Estado → ${ESTADO_CONFIG[nuevoEstado].label}`, { id: toastId })
            setModalData(prev =>
                prev
                    ? {
                          ...prev,
                          estado: nuevoEstado,
                          codigo: data.codigo || prev.codigo,
                          ...(customDesc !== undefined ? { descuento_aplicado: customDesc } : {})
                      }
                    : null
            )
            setShowDescuentoForm(false)
            router.refresh()
        } catch {
            toast.error('No se pudo actualizar el estado', { id: toastId })
        }
    }

    useEffect(() => {
        if (!isEditingDate || !nuevaFecha) return

        let active = true
        setIsFetchingTimes(true)

        fetch(`/api/reservas/${nuevaFecha}`, { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                if (!active) return
                if (data.horariosBase) {
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
                if (data.ocupados) {
                    setOcupadosDelDia(
                        data.ocupados.map((o: any) => ({
                            horario: o.horario.substring(0, 5),
                            estado: o.estado || 'pendiente'
                        }))
                    )
                } else {
                    setOcupadosDelDia([])
                }
            })
            .catch(() => {
                if (active) toast.error('Error al consultar disponibilidad.')
            })
            .finally(() => {
                if (active) setIsFetchingTimes(false)
            })

        return () => {
            active = false
        }
    }, [isEditingDate, nuevaFecha, config])

    const handleFechaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        if (val < getHoyUTC3()) {
            toast.error('No podés reprogramar a una fecha pasada.')
            return
        }
        setNuevaFecha(val)
        setNuevoHorario('')
    }

    const confirmarReprogramacion = async () => {
        if (!nuevaFecha || !nuevoHorario) return
        setIsRescheduling(true)
        const toastId = toast.loading('Reprogramando...')
        try {
            const { reprogramarTurno } = await import('@/app/admin/actions')
            const result = await reprogramarTurno(modalData.id, nuevaFecha, nuevoHorario)
            if (result.error) {
                toast.error(result.error, { id: toastId })
            } else {
                toast.success('Turno reprogramado exitosamente', { id: toastId })
                setModalData(prev =>
                    prev
                        ? {
                              ...prev,
                              fecha: nuevaFecha,
                              hora: nuevoHorario,
                              reprogramado: true,
                              codigo: result.codigo || prev.codigo
                          }
                        : null
                )
                setIsEditingDate(false)
                router.refresh()
            }
        } catch {
            toast.error('Error de red al reprogramar.', { id: toastId })
        } finally {
            setIsRescheduling(false)
        }
    }

    const grillaHorariosModal =
        horariosDelDia.length > 0
            ? horariosDelDia
            : generarHorariosDisponibles(
                  config?.hora_inicio || '10:00',
                  config?.hora_fin || '22:00',
                  config?.intervalo_minutos || 120
              )

    return (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center animate-in fade-in duration-200 md:p-6">
            <div
                className="absolute inset-0"
                onClick={() => {
                    setModalData(null)
                    setConfirmDelete(false)
                }}
            />
            <div className="bg-gradient-to-br from-pink-100/95 via-orange-50/95 to-orange-100/95 backdrop-blur-xl border border-white/60 rounded-t-3xl md:rounded-3xl w-full md:w-auto md:min-w-[500px] md:max-w-lg shadow-2xl relative animate-bottom-sheet md:animate-none max-h-[88dvh] md:max-h-[90vh] flex flex-col overflow-hidden">
                <div className="p-6 pb-28 md:p-7 md:pb-8 overflow-y-auto overscroll-contain flex-1">
                    <div
                        className="w-12 h-1.5 bg-stone-200 rounded-full mx-auto mb-5 md:hidden cursor-pointer"
                        onClick={() => {
                            setModalData(null)
                            setConfirmDelete(false)
                        }}
                    />

                    <div className="flex justify-between items-start mb-3">
                        <div className="w-11 h-11 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 border border-rose-100 shadow-sm">
                            💅
                        </div>
                        <button
                            onClick={() => {
                                setModalData(null)
                                setConfirmDelete(false)
                            }}
                            className="text-stone-400 hover:text-stone-600 p-2 rounded-full hover:bg-stone-100 transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <h3 className="font-bold text-2xl text-stone-900 tracking-tight mb-1">
                        {modalData.cliente}
                    </h3>
                    {modalData.celular && (
                        <p className="text-stone-600 text-sm mb-2 font-medium">
                            📱 {modalData.celular}{' '}
                            {modalData.email && `• ✉️ ${modalData.email}`}
                        </p>
                    )}

                    {/* Ficha rápida del cliente (historial y cumpleaños) */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        <div
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border ${estadoCfg.bg} ${estadoCfg.color} ${estadoCfg.border}`}
                        >
                            <CircleDot className="w-3 h-3" />
                            {estadoCfg.label}
                        </div>
                        {modalData.reprogramado && (
                            <span className="flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-full text-[11px] font-bold">
                                🔄 Reprogramado
                            </span>
                        )}
                        {historialCliente && (
                            <span className="bg-white/80 text-stone-700 border border-stone-200 px-2.5 py-1 rounded-full text-[11px] font-semibold">
                                ⭐ {historialCliente.completados} servicios
                                {historialCliente.ausencias > 0 &&
                                    ` • ⚠️ ${historialCliente.ausencias} ausencias`}
                            </span>
                        )}
                        {esCumple && (
                            <span className="bg-rose-100 text-rose-700 border border-rose-300 px-2.5 py-1 rounded-full text-[11px] font-bold">
                                🎂 ¡Semana de Cumpleaños!
                            </span>
                        )}
                    </div>

                    {/* Acciones rápidas de WhatsApp al cliente */}
                    {modalData.celular && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                            <a
                                href={getWppLink('confirmacion')}
                                onClick={marcarNotificacionEnviada}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20b857] text-white font-bold py-2.5 px-3 rounded-xl text-xs shadow-sm transition min-h-[42px]"
                            >
                                <Send className="w-3.5 h-3.5" />
                                WhatsApp Confirmación
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
                                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs shadow-sm transition min-h-[42px]"
                            >
                                🔄 Enviar link para elegir horario
                            </a>
                        </div>
                    )}

                    {/* Detalle de Cobro y Descuento Opcional */}
                    <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-4 mb-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                                Detalle del Servicio
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowDescuentoForm(!showDescuentoForm)}
                                className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                {(modalData.descuento_aplicado || 0) > 0
                                    ? `Editar descuento (${modalData.descuento_aplicado}%)`
                                    : 'Aplicar descuento / promo'}
                            </button>
                        </div>

                        {(() => {
                            const srvName = modalData.servicio.split('(')[0].trim()
                            const precioBase = parsePrecio(modalData.servicio)
                            const descActual = modalData.descuento_aplicado ?? 0
                            const valorDescontado = Math.round(precioBase * (descActual / 100))
                            const precioFinal = Math.max(0, precioBase - valorDescontado)

                            return (
                                <div className="flex flex-col w-full">
                                    <div className="flex justify-between items-center w-full mb-2">
                                        <span className="text-stone-700 font-semibold text-sm">
                                            {srvName}
                                        </span>
                                        <span className="text-stone-900 font-bold">
                                            ${precioBase.toLocaleString('es-AR')}
                                        </span>
                                    </div>
                                    {descActual > 0 && (
                                        <div className="flex justify-between items-center w-full mb-2">
                                            <span className="text-rose-600 text-xs font-bold">
                                                {modalData.descuento_motivo || 'Descuento'} (-
                                                {descActual}%)
                                            </span>
                                            <span className="text-rose-600 text-xs font-bold">
                                                -${valorDescontado.toLocaleString('es-AR')}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center w-full border-t border-stone-200 pt-3 mt-1">
                                        <span className="text-stone-500 text-xs uppercase tracking-wide font-bold">
                                            Total a Cobrar
                                        </span>
                                        <span className="text-3xl font-black text-rose-500 leading-none">
                                            ${precioFinal.toLocaleString('es-AR')}
                                        </span>
                                    </div>
                                </div>
                            )
                        })()}

                        {showDescuentoForm && (
                            <div className="mt-4 pt-3 border-t border-rose-200/70 flex flex-col gap-2.5">
                                <div className="flex flex-wrap gap-1.5">
                                    {[0, 10, 15, 20, 25].map(pct => (
                                        <button
                                            key={pct}
                                            type="button"
                                            onClick={() => setDescuento(pct)}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                                                descuento === pct
                                                    ? 'bg-rose-500 text-white border-rose-600'
                                                    : 'bg-white text-stone-700 border-stone-200'
                                            }`}
                                        >
                                            {pct === 0 ? 'Sin desc.' : `${pct}% OFF`}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <select
                                        value={motivoDescuento}
                                        onChange={e => setMotivoDescuento(e.target.value)}
                                        className="flex-1 bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-semibold text-stone-800"
                                    >
                                        <option value="Cumpleaños 🎂">Cumpleaños 🎂</option>
                                        <option value="Cliente frecuente ⭐">
                                            Cliente frecuente ⭐
                                        </option>
                                        <option value="Promoción especial ✨">
                                            Promoción especial ✨
                                        </option>
                                    </select>
                                    <button
                                        type="button"
                                        onClick={guardarDescuentoOpcional}
                                        className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm"
                                    >
                                        Guardar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Opción para servicios que duran más de 2 hs */}
                    <label className="flex items-center justify-between gap-3 bg-white/70 border border-stone-200/80 rounded-xl px-4 py-2.5 mb-4 cursor-pointer">
                        <span className="text-xs font-semibold text-stone-700">
                            ⏱️ Servicio largo: ocupar también el bloque siguiente (+2 hs)
                        </span>
                        <input
                            type="checkbox"
                            checked={ocupaSiguiente}
                            onChange={e => toggleOcupaSiguiente(e.target.checked)}
                            className="w-4 h-4 accent-pink-500 rounded"
                        />
                    </label>

                    {/* Reprogramación directa por el dueño */}
                    {isEditingDate ? (
                        <div className="bg-orange-50/80 border border-orange-200/60 rounded-2xl p-4 mb-4 shadow-sm flex flex-col gap-3">
                            <div className="flex justify-between items-center">
                                <p className="text-orange-700 font-bold text-sm flex items-center gap-2">
                                    <CalendarIcon className="w-4 h-4" /> Reprogramar Manualmente
                                </p>
                                <button
                                    onClick={() => {
                                        setIsEditingDate(false)
                                        setNuevaFecha(modalData.fecha)
                                        setNuevoHorario(modalData.hora)
                                    }}
                                    className="text-orange-900/50 hover:text-orange-900"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex flex-col gap-3">
                                <div>
                                    <label
                                        htmlFor="nuevaFechaInput"
                                        className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1 block"
                                    >
                                        Nueva Fecha
                                    </label>
                                    <input
                                        id="nuevaFechaInput"
                                        type="date"
                                        min={getHoyUTC3()}
                                        value={nuevaFecha}
                                        onChange={handleFechaChange}
                                        className="w-full bg-white border border-orange-200 text-stone-900 rounded-xl px-3.5 py-2.5 text-sm font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5 block">
                                        Seleccionar Horario Disponible
                                    </label>
                                    {isFetchingTimes ? (
                                        <div className="h-24 bg-white/50 border border-orange-100 rounded-xl flex items-center justify-center">
                                            <span className="text-xs text-stone-500">
                                                Consultando disponibilidad...
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-3 gap-2">
                                            {grillaHorariosModal.map(t => {
                                                const ocupadoInfo = ocupadosDelDia.find(
                                                    o => o.horario === t
                                                )
                                                const isSelf =
                                                    t === modalData?.hora &&
                                                    modalData?.fecha === nuevaFecha
                                                const isLibre = !ocupadoInfo || isSelf
                                                const isSelected = nuevoHorario === t

                                                return (
                                                    <button
                                                        key={t}
                                                        type="button"
                                                        disabled={!isLibre}
                                                        onClick={() => setNuevoHorario(t)}
                                                        className={`py-2 px-1 rounded-xl text-xs font-bold border min-h-[40px] ${
                                                            !isLibre
                                                                ? 'bg-stone-100 text-stone-400 border-stone-200 line-through cursor-not-allowed'
                                                                : isSelected
                                                                  ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                                                                  : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                                                        }`}
                                                    >
                                                        {t}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button
                                disabled={isRescheduling || !nuevoHorario}
                                onClick={confirmarReprogramacion}
                                className="w-full bg-gradient-to-r from-orange-400 to-rose-400 text-white font-bold py-2.5 rounded-xl shadow-md disabled:opacity-50 flex justify-center items-center gap-2 text-sm min-h-[44px]"
                            >
                                <CheckCircle2 className="w-4 h-4" /> Confirmar Nuevo Horario
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div className="bg-white/70 border border-stone-200/60 rounded-xl p-3.5 shadow-sm">
                                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                        <CalendarIcon className="w-3 h-3" /> Día
                                    </p>
                                    <p className="text-stone-800 font-bold text-sm">
                                        {modalData.fecha.split('-').reverse().join('/')}
                                    </p>
                                </div>
                                <div className="bg-white/70 border border-stone-200/60 rounded-xl p-3.5 shadow-sm">
                                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Horario
                                    </p>
                                    <p className="text-stone-800 font-bold text-sm">
                                        {modalData.hora} hs
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsEditingDate(true)}
                                className="w-full py-2.5 bg-orange-50 text-orange-700 font-bold rounded-xl border border-orange-200 hover:bg-orange-100 transition shadow-sm mb-4 text-xs flex justify-center items-center gap-2 min-h-[42px]"
                            >
                                <CalendarIcon className="w-4 h-4" /> Cambiar fecha/hora manualmente
                            </button>
                        </>
                    )}

                    {/* Cambio de Estado */}
                    <div className="flex flex-col gap-2 mb-4">
                        <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest px-1">
                            Cambiar Estado del Turno
                        </p>
                        <div className="grid grid-cols-3 gap-2">
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

                                return (
                                    <button
                                        key={e}
                                        type="button"
                                        onClick={() => !isCurrent && actualizarEstado(e)}
                                        disabled={isCurrent}
                                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition min-h-[40px] ${
                                            isCurrent
                                                ? `${cfg.bg} ${cfg.color} ${cfg.border} cursor-default`
                                                : `bg-white text-stone-600 border-stone-200 ${cfg.hoverCls}`
                                        }`}
                                    >
                                        {isCurrent && (
                                            <CheckCircle2 className="w-3 h-3 inline mr-1" />
                                        )}
                                        {cfg.label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Eliminar registro */}
                    <div className="flex flex-col mt-4">
                        {!confirmDelete ? (
                            <button
                                onClick={() => setConfirmDelete(true)}
                                className="w-full flex items-center justify-center gap-2 bg-white text-stone-400 border border-stone-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 font-bold py-2.5 rounded-xl transition text-xs min-h-[42px]"
                            >
                                <Trash2 className="w-4 h-4" /> Eliminar registro definitivamente
                            </button>
                        ) : (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                <div className="flex items-center gap-2 text-red-600 font-bold mb-2 text-sm">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span>¿Confirmar eliminación permanente?</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setConfirmDelete(false)}
                                        className="flex-1 bg-white border border-stone-200 text-stone-600 font-bold py-2 rounded-lg text-xs"
                                    >
                                        Volver
                                    </button>
                                    <button
                                        onClick={liberarTurno}
                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg text-xs"
                                    >
                                        Sí, eliminar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
