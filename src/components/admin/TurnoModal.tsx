import React, { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, Clock, X, Trash2, CheckCircle2, AlertTriangle, CircleDot } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { ModalData, EstadoReserva, ESTADO_CONFIG, getHoyUTC3, checkCumple } from './agendaTypes'
import { generarHorariosDisponibles } from '@/lib/utils'

interface TurnoModalProps {
    modalData: ModalData;
    setModalData: React.Dispatch<React.SetStateAction<ModalData | null>>;
    config: any;
}

const parsePrecio = (str: string) => {
    const m = str.match(/\$([\d.,]+)/)
    return m ? parseInt(m[1].replace(/\./g, ''), 10) : 0
}

export default function TurnoModal({ modalData, setModalData, config }: TurnoModalProps) {
    const router = useRouter()
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [descuento, setDescuento] = useState<number>(0)
    const [showDescuentoForm, setShowDescuentoForm] = useState(false)

    // Estados Reprogramación
    const [isEditingDate, setIsEditingDate] = useState(false)
    const [nuevaFecha, setNuevaFecha] = useState(modalData.fecha)
    const [nuevoHorario, setNuevoHorario] = useState(modalData.hora)
    const [ocupadosDelDia, setOcupadosDelDia] = useState<{ horario: string, estado: string }[]>([])
    const [isFetchingTimes, setIsFetchingTimes] = useState(false)
    const [isRescheduling, setIsRescheduling] = useState(false)

    const estadoCfg = ESTADO_CONFIG[modalData.estado]

    const getWppLink = () => {
        if (!modalData?.celular) return '#'
        const cleared = modalData.celular.replace(/\D/g, '')
        const num = cleared.startsWith('549') ? cleared : (cleared.startsWith('54') ? `549${cleared.substring(2)}` : `549${cleared}`)
        const fechaLatam = modalData.fecha.split('-').reverse().join('/')
        const text = `Hola *${modalData.cliente}* 👋\nTe escribimos de FRAN & ROMY NAILS. Confirmamos tu turno para *${modalData.servicio.split('(')[0].trim()}* el día *${fechaLatam}* a las *${modalData.hora}*.\n\nPor favor, recordá asistir puntual. En caso de no poder venir, avísanos con anticipación.\n¡Te esperamos encantadas! 💅✨`
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
        } catch { }
    }

    const iniciarBorrado = () => setConfirmDelete(true)

    const liberarTurno = async () => {
        const idToDelete = modalData.id
        setConfirmDelete(false)
        setModalData(null)
        const toastId = toast.loading('Liberando turno...')

        try {
            const res = await fetch(`/api/admin/reservas/${idToDelete}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Falló servidor')
            toast.success('Turno liberado correctamente', { id: toastId })
            router.refresh()
        } catch {
            toast.error('Error al liberar turno', { id: toastId })
            router.refresh()
        }
    }

    const actualizarEstado = async (nuevoEstado: EstadoReserva, customDesc?: number) => {
        if (nuevoEstado === 'completado' && checkCumple(modalData.fecha_nacimiento) && !showDescuentoForm && customDesc === undefined) {
            setShowDescuentoForm(true)
            return
        }

        const payload: any = { estado: nuevoEstado }
        if (customDesc !== undefined) payload.descuento_aplicado = customDesc

        const toastId = toast.loading('Actualizando estado...')
        try {
            const res = await fetch(`/api/admin/reservas/${modalData.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            if (!res.ok) throw new Error()
            toast.success(`Estado → ${ESTADO_CONFIG[nuevoEstado].label}`, { id: toastId })
            setModalData(prev => prev ? { ...prev, estado: nuevoEstado, descuento_aplicado: customDesc } : null)
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
                if (data.ocupados) {
                    setOcupadosDelDia(data.ocupados.map((o: any) => ({
                        horario: o.horario.substring(0, 5),
                        estado: o.estado || 'pendiente'
                    })))
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

        return () => { active = false }
    }, [isEditingDate, nuevaFecha])

    const handleFechaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        if (val < getHoyUTC3()) {
            toast.error("No puedes reprogramar a una fecha pasada.")
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
                setModalData(prev => prev ? { ...prev, fecha: nuevaFecha, hora: nuevoHorario } : null)
                setIsEditingDate(false)
                router.refresh()
            }
        } catch (e) {
            toast.error('Error de red al reprogramar.', { id: toastId })
        } finally {
            setIsRescheduling(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center animate-in fade-in duration-200 md:p-6">
            <div className="absolute inset-0" onClick={() => { setModalData(null); setConfirmDelete(false) }} />
            <div className="bg-gradient-to-br from-pink-100/95 via-orange-50/95 to-orange-100/95 backdrop-blur-xl border border-white/60 rounded-t-3xl md:rounded-3xl w-full md:w-auto md:min-w-[480px] md:max-w-lg shadow-2xl relative animate-bottom-sheet md:animate-none max-h-[85dvh] md:max-h-[88vh] flex flex-col overflow-hidden">

                <div className="p-6 pb-32 md:p-8 md:pb-8 overflow-y-auto overscroll-contain flex-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-stone-300 [&::-webkit-scrollbar-thumb]:rounded-full">
                    <div className="w-12 h-1.5 bg-stone-200 rounded-full mx-auto mb-6 md:hidden cursor-pointer hover:bg-stone-300 transition" onClick={() => { setModalData(null); setConfirmDelete(false) }} />

                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 border border-rose-100 shadow-sm">
                            💅
                        </div>
                        <button onClick={() => { setModalData(null); setConfirmDelete(false) }} className="text-stone-400 hover:text-stone-600 p-2 rounded-full hover:bg-stone-100 transition">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <h3 className="font-bold text-2xl text-stone-900 tracking-tight mb-1">{modalData.cliente}</h3>
                    {modalData.celular && (
                        <p className="text-stone-500 text-sm mb-3 font-medium">📱 {modalData.celular} {modalData.email && `• ✉️ ${modalData.email}`}</p>
                    )}

                    <div className="flex items-center flex-wrap gap-2 mb-4">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border ${estadoCfg?.bg} ${estadoCfg?.color} ${estadoCfg?.border}`}>
                            <CircleDot className="w-3 h-3" />
                            {estadoCfg?.label}
                        </div>
                        {modalData.reprogramado && (
                            <span className="flex items-center gap-1 bg-indigo-50 text-indigo-600 border border-indigo-200 px-2.5 py-1 rounded-md text-[10.5px] font-bold uppercase tracking-wider shrink-0 shadow-sm">
                                <span>🔄</span> Reprogramado
                            </span>
                        )}

                        {((modalData.estado_pago === 'pagado_sena' || modalData.estado_pago === 'pagado_total') || (modalData.monto_sena ?? 0) > 0) && (
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                                💳 SEÑA ACREDITADA
                            </span>
                        )}
                    </div>

                    <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-5 mb-5 shadow-sm">
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
                            <span className="w-8 h-[1px] bg-stone-200"></span>
                            Detalle de Cobro
                            <span className="w-8 h-[1px] bg-stone-200"></span>
                        </p>

                        {(() => {
                            const srvName = modalData.servicio.split('(')[0].trim()
                            const precioBase = parsePrecio(modalData.servicio)
                            const descuento = modalData.descuento_aplicado ?? 0
                            const valorDescontado = Math.round(precioBase * (descuento / 100))
                            const precioConDescuento = precioBase - valorDescontado
                            const montoSena = modalData.monto_sena ?? 0
                            const saldoRestante = Math.max(0, precioConDescuento - montoSena)

                            const tieneDescuento = descuento > 0
                            const tieneSeña = montoSena > 0

                            return (
                                <div className="flex flex-col w-full">
                                    <div className="flex justify-between items-center w-full mb-3">
                                        <span className="text-stone-600 font-medium">{srvName}</span>
                                        <span className="text-stone-900 font-bold">${precioBase.toLocaleString('es-AR')}</span>
                                    </div>
                                    {tieneDescuento && (
                                        <div className="flex justify-between items-center w-full mb-3">
                                            <span className="text-rose-500 text-sm font-bold">Promo Cumpleaños (-{descuento}%)</span>
                                            <span className="text-rose-500 text-sm font-bold">-${valorDescontado.toLocaleString('es-AR')}</span>
                                        </div>
                                    )}
                                    {tieneSeña && (
                                        <div className="flex justify-between items-center w-full mb-3">
                                            <span className="text-emerald-500 text-sm font-bold">Seña ({modalData.metodo_pago === 'mp' ? 'MercadoPago' : 'Transferencia'})</span>
                                            <span className="text-emerald-500 text-sm font-bold">-${montoSena.toLocaleString('es-AR')}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center w-full border-t border-stone-200 pt-4 mt-2">
                                        <span className="text-stone-500 text-sm uppercase tracking-wide font-bold mt-1">Saldo a Cobrar</span>
                                        <span className="text-4xl font-black text-rose-500 leading-none drop-shadow-sm">${saldoRestante.toLocaleString('es-AR')}</span>
                                    </div>
                                </div>
                            )
                        })()}
                    </div>

                    {isEditingDate ? (
                        <div className="bg-orange-50/80 border border-orange-200/60 rounded-2xl p-5 mb-5 shadow-sm animate-in fade-in flex flex-col gap-4 relative overflow-hidden">
                            <div className="flex justify-between items-center mb-1">
                                <p className="text-orange-700 font-bold flex items-center gap-2"><CalendarIcon className="w-4 h-4" /> Reprogramar Turno</p>
                                <button onClick={() => { setIsEditingDate(false); setNuevaFecha(modalData.fecha); setNuevoHorario(modalData.hora) }} className="text-orange-900/40 hover:text-orange-900/80 transition">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col">
                                    <label htmlFor="nuevaFechaInput" className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5 ml-1">Nueva Fecha</label>
                                    <input
                                        id="nuevaFechaInput"
                                        type="date"
                                        min={getHoyUTC3()}
                                        value={nuevaFecha}
                                        onChange={handleFechaChange}
                                        className="w-full bg-white border border-orange-200 text-stone-900 rounded-xl px-4 py-3 text-sm font-bold outline-none ring-0 focus:border-rose-400 border-b-4 focus:ring-4 focus:ring-rose-400/10 transition"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5 ml-1">Seleccionar Horario Disponible</label>
                                    {isFetchingTimes ? (
                                        <div className="h-32 bg-white/50 border border-orange-100 rounded-xl flex flex-col items-center justify-center gap-3">
                                            <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
                                            <span className="text-xs text-stone-500 font-medium">Sincronizando disponibilidad...</span>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                            {generarHorariosDisponibles(config?.hora_inicio || '09:00', config?.hora_fin || '20:00', config?.intervalo_minutos || 90).map(t => {
                                                const ocupadoInfo = ocupadosDelDia.find(o => o.horario === t)
                                                const isSelf = t === modalData?.hora && modalData?.fecha === nuevaFecha

                                                const isLibre = !ocupadoInfo || isSelf
                                                const isPendiente = ocupadoInfo?.estado === 'pendiente' && !isSelf
                                                const isConfirmado = (ocupadoInfo?.estado === 'confirmado' || ocupadoInfo?.estado === 'completado') && !isSelf
                                                const isSelected = nuevoHorario === t

                                                let btnClass = ""
                                                let icon = null

                                                if (isConfirmado) {
                                                    btnClass = "bg-stone-100/80 text-stone-400 border-stone-200 cursor-not-allowed opacity-75 line-through"
                                                    icon = <span className="text-[10px]">🔒</span>
                                                } else if (isPendiente) {
                                                    btnClass = "bg-orange-50 text-orange-400 border-orange-200 cursor-not-allowed opacity-80"
                                                } else {
                                                    if (isSelected) {
                                                        btnClass = "bg-emerald-500 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20"
                                                    } else {
                                                        btnClass = "bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 border-b-2 hover:border-b-4 hover:border-emerald-300 active:translate-y-0"
                                                    }
                                                }

                                                return (
                                                    <button
                                                        key={t}
                                                        disabled={!isLibre}
                                                        onClick={() => setNuevoHorario(t)}
                                                        className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 min-h-[40px] ${btnClass}`}
                                                    >
                                                        {icon}{t}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button disabled={isRescheduling || !nuevoHorario} onClick={confirmarReprogramacion} className="w-full bg-gradient-to-r from-orange-400 to-rose-400 text-white font-bold py-3 mt-1 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2">
                                {isRescheduling ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><CheckCircle2 className="w-5 h-5" /> Confirmar Cambios</>}
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-4 mb-3">
                                <div className="bg-white/60 border border-stone-200/60 rounded-xl p-4 shadow-sm">
                                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><CalendarIcon className="w-3 h-3" /> Día</p>
                                    <p className="text-stone-800 font-bold">{modalData.fecha.split('-').reverse().join('/')}</p>
                                </div>
                                <div className="bg-white/60 border border-stone-200/60 rounded-xl p-4 shadow-sm">
                                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Horario</p>
                                    <p className="text-stone-800 font-bold">{modalData.hora}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsEditingDate(true)} className="w-full py-2 bg-orange-50 text-orange-600 font-bold rounded-xl border border-orange-200 hover:bg-orange-100 transition shadow-sm mb-6 active:scale-95 text-sm flex justify-center items-center gap-2">
                                <CalendarIcon className="w-4 h-4" /> Reprogramar Turno
                            </button>
                        </>
                    )}

                    <div className="flex flex-col gap-2 mb-4">
                        <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest px-1">Cambiar Estado</p>
                        <div className="grid grid-cols-3 gap-2">
                            {(['pendiente', 'confirmado', 'completado'] as EstadoReserva[]).map(e => {
                                const cfg = ESTADO_CONFIG[e]
                                const isCurrent = modalData.estado === e;
                                const disableReverse = modalData.estado === 'completado' && e !== 'completado';
                                const isDisabled = isCurrent || disableReverse;

                                return (
                                    <button
                                        key={e}
                                        onClick={() => !isDisabled && actualizarEstado(e)}
                                        disabled={isDisabled}
                                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition duration-200 shadow-sm ${isCurrent ? `${cfg.bg} ${cfg.color} ${cfg.border} cursor-default` : disableReverse ? 'bg-stone-100 border-stone-200 text-stone-400 opacity-50 cursor-not-allowed hidden' : `bg-white text-stone-500 border-stone-200 ${cfg.hoverCls}`}`}
                                    >
                                        {isCurrent && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                                        {cfg.label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {showDescuentoForm && (
                        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 mb-5 shadow-sm animate-in fade-in flex flex-col gap-3">
                            <p className="text-rose-600 font-bold flex items-center gap-2">🎂 Promo Cumpleaños Detectada</p>
                            <p className="text-stone-600 text-sm font-medium">Descuento a aplicar:</p>
                            <div className="flex gap-2 w-full">
                                <input
                                    type="number"
                                    min="0" max="100"
                                    value={descuento}
                                    onChange={(e) => setDescuento(Number(e.target.value))}
                                    className="bg-white border border-stone-200 text-stone-900 rounded-xl px-3 py-2 w-20 text-center font-bold outline-none ring-0 focus:border-rose-400"
                                />
                                <span className="text-rose-400 self-center font-black mr-2">%</span>
                                <button
                                    onClick={() => actualizarEstado('completado', descuento)}
                                    className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold py-2 rounded-xl transition shadow-md"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    )}

                    {modalData.estado === 'confirmado' && modalData.celular && !modalData.notificacion_enviada && (
                        <div className="mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <a href={getWppLink()} onClick={marcarNotificacionEnviada} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20b857] text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-[#25D366]/20">
                                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" /></svg>
                                Notificar por WhatsApp
                            </a>
                        </div>
                    )}

                    <div className="flex flex-col mt-6">
                        {!confirmDelete ? (
                            <button
                                onClick={iniciarBorrado}
                                className="w-full flex items-center justify-center gap-2 bg-white text-stone-400 border border-stone-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 font-bold py-3 rounded-xl transition-all duration-300 hover:scale-[1.03] active:scale-95 shadow-sm hover:shadow-md"
                            >
                                <Trash2 className="w-4 h-4" /> Eliminar Turno
                            </button>
                        ) : (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-in fade-in duration-200">
                                <div className="flex items-center gap-2 text-red-600 font-bold mb-3">
                                    <AlertTriangle className="w-5 h-5" />
                                    <span>¿Confirmar eliminación?</span>
                                </div>
                                <p className="text-stone-600 text-sm mb-4 font-medium">Esta acción es irreversible. El turno será liberado para que otro cliente pueda agendarlo.</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setConfirmDelete(false)}
                                        className="flex-1 bg-white border border-stone-200 text-stone-600 font-bold py-2 rounded-lg hover:bg-stone-100 transition text-sm"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={liberarTurno}
                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg transition text-sm flex items-center justify-center gap-1.5 shadow-sm"
                                    >
                                        <Trash2 className="w-4 h-4" /> Sí, eliminar
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
