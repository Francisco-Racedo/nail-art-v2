'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
    Cake,
    Search,
    Send,
    Star,
    AlertTriangle,
    UserPlus,
    Edit3,
    ClipboardList,
    CalendarPlus,
    BellRing,
    Users,
    Crown,
    Trash2,
    X,
    FileText
} from 'lucide-react'
import { celularParaWhatsapp, getHoyArgentina } from '@/lib/utils'
import type { ResumenCliente, EtiquetaCliente } from '@/lib/reservas-server'
import {
    guardarFichaClienteAction,
    eliminarFichaClienteAction
} from '@/app/admin/dashboard/clientes/actions'
import { crearTurnoManualAdmin } from '@/app/admin/actions'

type FiltroClientes =
    | 'todas'
    | 'cumple_semana'
    | 'cumple_mes'
    | 'service'
    | 'frecuentes'
    | 'sin_celular'

const ETIQUETA_BADGE: Record<
    EtiquetaCliente,
    { label: string; cls: string }
> = {
    vip: {
        label: '👑 Clienta VIP',
        cls: 'bg-amber-100 text-amber-800 border-amber-300'
    },
    frecuente: {
        label: '💖 Frecuente',
        cls: 'bg-pink-100 text-pink-800 border-pink-300'
    },
    nueva: {
        label: '🆕 Nueva',
        cls: 'bg-sky-100 text-sky-800 border-sky-200'
    },
    atencion: {
        label: '⚠️ Revisar ausencias',
        cls: 'bg-red-100 text-red-700 border-red-200'
    }
}

export default function ClientesPanel({
    clientes,
    nombreNegocio,
    horariosBase,
    servicios
}: {
    clientes: ResumenCliente[]
    nombreNegocio: string
    horariosBase: string[]
    servicios: { id: number; nombre: string; precio: number; categoria: string }[]
}) {
    const router = useRouter()
    const [busqueda, setBusqueda] = useState('')
    const [filtro, setFiltro] = useState<FiltroClientes>('todas')

    // Modal de Historial de Turnos
    const [clienteHistorial, setClienteHistorial] = useState<ResumenCliente | null>(
        null
    )

    // Modal de Edición / Creación de Ficha Técnica
    const [modalFichaOpen, setModalFichaOpen] = useState(false)
    const [editandoKey, setEditandoKey] = useState<string | undefined>(undefined)
    const [editandoReservaIds, setEditandoReservaIds] = useState<number[]>([])
    const [formNombre, setFormNombre] = useState('')
    const [formCelular, setFormCelular] = useState('')
    const [formFechaNac, setFormFechaNac] = useState('')
    const [formEmail, setFormEmail] = useState('')
    const [formNotas, setFormNotas] = useState('')
    const [formEtiqueta, setFormEtiqueta] = useState<EtiquetaCliente>('frecuente')
    const [guardandoFicha, setGuardandoFicha] = useState(false)

    // Modal de Agendar Nuevo Turno directo para una clienta
    const [clienteAgendar, setClienteAgendar] = useState<ResumenCliente | null>(
        null
    )
    const [turnoFecha, setTurnoFecha] = useState(() => getHoyArgentina())
    const [turnoHorario, setTurnoHorario] = useState(horariosBase[0] || '10:00')
    const [turnoServicio, setTurnoServicio] = useState('')
    const [guardandoTurno, setGuardandoTurno] = useState(false)

    // Métricas superiores de cartera
    const kpis = useMemo(() => {
        return {
            total: clientes.length,
            frecuentes: clientes.filter(
                c => c.etiqueta === 'vip' || c.etiqueta === 'frecuente' || c.completados >= 2
            ).length,
            cumpleSemana: clientes.filter(c => c.esCumpleSemana).length,
            cumpleMes: clientes.filter(c => c.esCumpleMes).length,
            paraService: clientes.filter(c => c.necesitaService).length,
            sinCelular: clientes.filter(c => !c.celularDisplay).length
        }
    }, [clientes])

    const filtrados = useMemo(() => {
        const q = busqueda.toLowerCase().trim()
        return clientes.filter(c => {
            if (filtro === 'cumple_semana' && !c.esCumpleSemana) return false
            if (filtro === 'cumple_mes' && !c.esCumpleMes) return false
            if (filtro === 'service' && !c.necesitaService) return false
            if (
                filtro === 'frecuentes' &&
                c.etiqueta !== 'vip' &&
                c.etiqueta !== 'frecuente' &&
                c.completados < 2
            ) {
                return false
            }
            if (filtro === 'sin_celular' && !!c.celularDisplay) return false

            if (!q) return true
            return (
                c.nombre.toLowerCase().includes(q) ||
                c.celularDisplay.includes(q) ||
                (c.email && c.email.toLowerCase().includes(q)) ||
                (c.notas_tecnicas && c.notas_tecnicas.toLowerCase().includes(q))
            )
        })
    }, [clientes, busqueda, filtro])

    const abrirNuevaClienta = () => {
        setEditandoKey(undefined)
        setEditandoReservaIds([])
        setFormNombre('')
        setFormCelular('')
        setFormFechaNac('')
        setFormEmail('')
        setFormNotas('')
        setFormEtiqueta('nueva')
        setModalFichaOpen(true)
    }

    const abrirEditarClienta = (c: ResumenCliente) => {
        setEditandoKey(c.key)
        setEditandoReservaIds(c.reservaIds || [])
        setFormNombre(c.nombre)
        setFormCelular(c.celularDisplay || '')
        setFormFechaNac(c.fecha_nacimiento || '')
        setFormEmail(c.email || '')
        setFormNotas(c.notas_tecnicas || '')
        setFormEtiqueta(c.etiqueta || 'frecuente')
        setModalFichaOpen(true)
    }

    const handleGuardarFicha = async (e: React.FormEvent) => {
        e.preventDefault()
        setGuardandoFicha(true)
        const toastId = toast.loading('Guardando ficha de la clienta...')
        try {
            const res = await guardarFichaClienteAction({
                keyOriginal: editandoKey,
                nombre: formNombre,
                celular: formCelular,
                email: formEmail,
                fecha_nacimiento: formFechaNac,
                notas_tecnicas: formNotas,
                etiqueta: formEtiqueta,
                reservaIds: editandoReservaIds
            })
            if (res.error) {
                toast.error(res.error, { id: toastId })
            } else {
                toast.success('Ficha de clienta actualizada', { id: toastId })
                setModalFichaOpen(false)
                router.refresh()
            }
        } catch {
            toast.error('No se pudo guardar la ficha', { id: toastId })
        }
        setGuardandoFicha(false)
    }

    const handleEliminarFicha = async (
        c: ResumenCliente,
        borrarReservas: boolean
    ) => {
        const toastId = toast.loading('Eliminando ficha...')
        try {
            const res = await eliminarFichaClienteAction({
                key: c.key,
                reservaIds: c.reservaIds,
                borrarReservas
            })
            if (res.error) {
                toast.error(res.error, { id: toastId })
            } else {
                toast.success('Ficha eliminada correctamente', { id: toastId })
                setModalFichaOpen(false)
                router.refresh()
            }
        } catch {
            toast.error('Error al eliminar la ficha', { id: toastId })
        }
    }

    const handleAgendarDirecto = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!clienteAgendar || !turnoFecha || !turnoHorario || !turnoServicio) {
            toast.error('Seleccioná fecha, horario y servicio.')
            return
        }
        setGuardandoTurno(true)
        const toastId = toast.loading(
            `Asignando turno para ${clienteAgendar.nombre}...`
        )
        try {
            const res = await crearTurnoManualAdmin({
                nombre: clienteAgendar.nombre,
                celular: clienteAgendar.celularDisplay,
                servicio: turnoServicio,
                fecha: turnoFecha,
                horario: turnoHorario,
                estado: 'confirmado'
            })
            if (res.error) {
                toast.error(res.error, { id: toastId })
            } else {
                toast.success(
                    `¡Turno agendado para ${clienteAgendar.nombre} el ${turnoFecha.split('-').reverse().join('/')} a las ${turnoHorario} hs!`,
                    { id: toastId }
                )
                setClienteAgendar(null)
                router.refresh()
            }
        } catch {
            toast.error('Error al asignar el turno', { id: toastId })
        }
        setGuardandoTurno(false)
    }

    const linkSaludoCumple = (c: ResumenCliente) => {
        const num = celularParaWhatsapp(c.celularDisplay)
        const msg = `¡Hola *${c.nombre}*! 🎂✨\nDesde *${nombreNegocio}* queremos desearte un muy feliz cumpleaños y regalarte un beneficio especial en tu próximo turno con nosotras. ¡Escribinos cuando quieras coordinar tu día! 💅🎉`
        return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
    }

    const linkRecordatorioService = (c: ResumenCliente) => {
        const num = celularParaWhatsapp(c.celularDisplay)
        const msg = `¡Hola *${c.nombre}*! 👋✨\nTe escribimos de *${nombreNegocio}*. Ya pasaron unos ${c.diasDesdeUltimoTurno || 20} días desde tu último servicio y queríamos consultarte si te gustaría agendar tu próximo turno de mantenimiento/service para mantener tus uñas impecables. 💅💖`
        return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
    }

    return (
        <div className="w-full space-y-6">
            {/* 1. Tarjetas Superiores de Resumen de Cartera */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                <button
                    type="button"
                    onClick={() => setFiltro('todas')}
                    className={`bg-white/95 rounded-2xl p-4 border text-left transition shadow-sm ${
                        filtro === 'todas'
                            ? 'border-rose-400 ring-2 ring-rose-300/40'
                            : 'border-orange-200/60 hover:border-rose-300'
                    }`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                            Total Clientas
                        </span>
                        <Users className="w-4 h-4 text-rose-500" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-stone-900">
                        {kpis.total}
                    </p>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                        Registradas en el salón
                    </p>
                </button>

                <button
                    type="button"
                    onClick={() => setFiltro('frecuentes')}
                    className={`bg-white/95 rounded-2xl p-4 border text-left transition shadow-sm ${
                        filtro === 'frecuentes'
                            ? 'border-amber-400 ring-2 ring-amber-300/40'
                            : 'border-orange-200/60 hover:border-amber-300'
                    }`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                            Frecuentes / VIP
                        </span>
                        <Crown className="w-4 h-4 text-amber-500" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-stone-900">
                        {kpis.frecuentes}
                    </p>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                        Con +2 servicios realizados
                    </p>
                </button>

                <button
                    type="button"
                    onClick={() =>
                        setFiltro(
                            filtro === 'cumple_semana' ? 'cumple_mes' : 'cumple_semana'
                        )
                    }
                    className={`bg-white/95 rounded-2xl p-4 border text-left transition shadow-sm ${
                        filtro === 'cumple_semana' || filtro === 'cumple_mes'
                            ? 'border-pink-400 ring-2 ring-pink-300/40'
                            : 'border-orange-200/60 hover:border-pink-300'
                    }`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                            Cumpleaños
                        </span>
                        <Cake className="w-4 h-4 text-pink-500" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-stone-900">
                        {kpis.cumpleSemana}{' '}
                        <span className="text-xs font-bold text-pink-600">
                            esta sem. ({kpis.cumpleMes} en el mes)
                        </span>
                    </p>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                        Tocá para filtrar cumpleañeras
                    </p>
                </button>

                <button
                    type="button"
                    onClick={() => setFiltro('service')}
                    className={`bg-white/95 rounded-2xl p-4 border text-left transition shadow-sm ${
                        filtro === 'service'
                            ? 'border-indigo-400 ring-2 ring-indigo-300/40'
                            : 'border-orange-200/60 hover:border-indigo-300'
                    }`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                            Para Service (+18 d)
                        </span>
                        <BellRing className="w-4 h-4 text-indigo-500" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-stone-900">
                        {kpis.paraService}
                    </p>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                        Listas para retoque / service
                    </p>
                </button>
            </div>

            {/* 2. Barra de Búsqueda, Filtros Rápidos y Botón + Registrar Clienta */}
            <div className="bg-white/95 rounded-2xl p-4 sm:p-5 border border-orange-200/60 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                            placeholder="Buscar por nombre, WhatsApp o notas técnicas..."
                            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-800 focus:outline-none focus:border-pink-400"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={abrirNuevaClienta}
                        className="bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm shrink-0"
                    >
                        <UserPlus className="w-4 h-4" />
                        Registrar Clienta
                    </button>
                </div>

                {/* Pastillas de filtro rápido */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                    {(
                        [
                            { id: 'todas', label: `Todas (${kpis.total})` },
                            {
                                id: 'cumple_semana',
                                label: `🎂 Cumple esta semana (${kpis.cumpleSemana})`
                            },
                            {
                                id: 'cumple_mes',
                                label: `🎉 Cumple este mes (${kpis.cumpleMes})`
                            },
                            {
                                id: 'service',
                                label: `🔔 Para Service +18 días (${kpis.paraService})`
                            },
                            {
                                id: 'frecuentes',
                                label: `⭐ Frecuentes / VIP (${kpis.frecuentes})`
                            },
                            {
                                id: 'sin_celular',
                                label: `📱 Sin Celular (${kpis.sinCelular})`
                            }
                        ] as { id: FiltroClientes; label: string }[]
                    ).map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setFiltro(tab.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                                filtro === tab.id
                                    ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 3. Grilla de Tarjetas de Clientas */}
            {filtrados.length === 0 ? (
                <div className="bg-white/90 rounded-2xl p-10 text-center border border-stone-200">
                    <p className="text-stone-600 font-bold text-base mb-1">
                        No hay clientas que coincidan con este filtro
                    </p>
                    <p className="text-stone-400 text-xs mb-4">
                        Probá cambiar el filtro superior o registrar una nueva clienta.
                    </p>
                    {filtro !== 'todas' && (
                        <button
                            type="button"
                            onClick={() => setFiltro('todas')}
                            className="bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs px-4 py-2 rounded-xl"
                        >
                            Ver todas las clientas
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtrados.map((c, idx) => {
                        const badgeEtiqueta =
                            ETIQUETA_BADGE[c.etiqueta || 'nueva'] || ETIQUETA_BADGE.nueva

                        return (
                            <div
                                key={`${c.key}-${idx}`}
                                className="bg-white/95 rounded-2xl p-5 border border-orange-200/70 shadow-sm hover:shadow-md transition flex flex-col justify-between gap-4"
                            >
                                <div>
                                    {/* Cabecera de la tarjeta: Nombre + Etiqueta + Cumpleaños */}
                                    <div className="flex flex-wrap items-start justify-between gap-2 mb-1.5">
                                        <div>
                                            <h3 className="font-bold text-lg text-stone-900 leading-tight">
                                                {c.nombre}
                                            </h3>
                                            <p className="text-xs text-stone-500 font-medium mt-0.5">
                                                📱{' '}
                                                {c.celularDisplay ? (
                                                    c.celularDisplay
                                                ) : (
                                                    <span className="text-amber-600 font-semibold">
                                                        Sin celular (tocá Editar para agregarlo)
                                                    </span>
                                                )}
                                                {c.fecha_nacimiento &&
                                                    ` • 🎂 Nac.: ${c.fecha_nacimiento.split('-').reverse().join('/')}`}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span
                                                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badgeEtiqueta.cls}`}
                                            >
                                                {badgeEtiqueta.label}
                                            </span>
                                            {c.esCumpleHoy ? (
                                                <span className="bg-gradient-to-r from-rose-500 to-amber-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm animate-pulse">
                                                    🎂 ¡Cumple HOY!
                                                </span>
                                            ) : c.esCumpleSemana ? (
                                                <span className="bg-rose-100 text-rose-700 border border-rose-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                                                    🎂 Cumple esta semana
                                                </span>
                                            ) : c.esCumpleMes ? (
                                                <span className="bg-pink-50 text-pink-700 border border-pink-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                                                    🎉 Cumple este mes
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>

                                    {/* Métricas de servicios e inversión */}
                                    <div className="flex flex-wrap gap-2 text-xs my-3">
                                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1">
                                            <Star className="w-3.5 h-3.5 text-emerald-600" />{' '}
                                            {c.completados}{' '}
                                            {c.completados === 1 ? 'servicio' : 'servicios'}
                                        </span>
                                        <span className="bg-stone-100 text-stone-700 px-2.5 py-1 rounded-lg font-semibold">
                                            Reservas: {c.totalTurnos}
                                        </span>
                                        {c.totalInvertido > 0 && (
                                            <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-lg font-bold">
                                                💰 ${c.totalInvertido.toLocaleString('es-AR')}
                                            </span>
                                        )}
                                        {c.ausencias > 0 && (
                                            <span className="bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1">
                                                <AlertTriangle className="w-3.5 h-3.5" />{' '}
                                                {c.ausencias} ausencias
                                            </span>
                                        )}
                                    </div>

                                    {/* Estado de última visita / alerta de service / próximo turno */}
                                    <div className="text-xs text-stone-600 space-y-1 bg-stone-50/90 rounded-xl p-2.5 border border-stone-200/70">
                                        {c.proximoTurno ? (
                                            <p className="text-emerald-700 font-bold">
                                                📌 Próximo turno:{' '}
                                                {c.proximoTurno.fecha
                                                    .split('-')
                                                    .reverse()
                                                    .join('/')}{' '}
                                                a las {c.proximoTurno.horario} hs (
                                                {c.proximoTurno.servicio.split('(')[0].trim()})
                                            </p>
                                        ) : c.ultimoTurno ? (
                                            <p className="flex items-center justify-between gap-2">
                                                <span>
                                                    🗓️ Última visita:{' '}
                                                    <strong>
                                                        {c.ultimoTurno
                                                            .split('-')
                                                            .reverse()
                                                            .join('/')}
                                                    </strong>
                                                </span>
                                                {c.diasDesdeUltimoTurno !== null && (
                                                    <span
                                                        className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                                                            c.necesitaService
                                                                ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                                                : 'bg-stone-200/70 text-stone-600'
                                                        }`}
                                                    >
                                                        Hace {c.diasDesdeUltimoTurno} días
                                                        {c.necesitaService ? ' • 🔔 Service' : ''}
                                                    </span>
                                                )}
                                            </p>
                                        ) : (
                                            <p className="text-stone-400 italic">
                                                Sin servicios registrados todavía
                                            </p>
                                        )}

                                        {c.notas_tecnicas && (
                                            <p className="text-stone-700 pt-1.5 mt-1.5 border-t border-stone-200/80 flex items-start gap-1.5">
                                                <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                                                <span>
                                                    <strong>Ficha técnica:</strong>{' '}
                                                    {c.notas_tecnicas}
                                                </span>
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Barra de Botones de Acción (Siempre visible en todas las tarjetas) */}
                                <div className="space-y-2 pt-2 border-t border-stone-100">
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setClienteHistorial(c)}
                                            className="bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition"
                                        >
                                            <ClipboardList className="w-3.5 h-3.5 text-stone-600" />
                                            Historial ({c.turnos.length})
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => abrirEditarClienta(c)}
                                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition"
                                        >
                                            <Edit3 className="w-3.5 h-3.5" />
                                            Editar Ficha
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setClienteAgendar(c)
                                                setTurnoServicio(
                                                    servicios[0]
                                                        ? `${servicios[0].nombre} ($${Number(servicios[0].precio).toLocaleString('es-AR')})`
                                                        : ''
                                                )
                                            }}
                                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition"
                                        >
                                            <CalendarPlus className="w-3.5 h-3.5" />
                                            Dar Turno
                                        </button>
                                    </div>

                                    {/* Botones de WhatsApp contextuales si tiene número */}
                                    {c.celularDisplay && (
                                        <div className="flex flex-wrap items-center gap-2">
                                            {(c.esCumpleSemana || c.esCumpleMes) && (
                                                <a
                                                    href={linkSaludoCumple(c)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex-1 bg-gradient-to-r from-pink-500 to-orange-400 hover:from-pink-600 hover:to-orange-500 text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
                                                >
                                                    <Cake className="w-3.5 h-3.5" /> Saludar por
                                                    Cumpleaños
                                                </a>
                                            )}

                                            {c.necesitaService && (
                                                <a
                                                    href={linkRecordatorioService(c)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
                                                >
                                                    <BellRing className="w-3.5 h-3.5" /> Recordar
                                                    Service (+{c.dias_recordatorio_service || 18} d)
                                                </a>
                                            )}

                                            <a
                                                href={`https://wa.me/${celularParaWhatsapp(c.celularDisplay)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 bg-[#25D366] hover:bg-[#20b857] text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
                                            >
                                                <Send className="w-3.5 h-3.5" /> Chat WhatsApp
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* =================================================================
                MODAL 1: HISTORIAL COMPLETO DE TURNOS DE LA CLIENTA
               ================================================================= */}
            {clienteHistorial && (
                <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in">
                    <div
                        className="absolute inset-0"
                        onClick={() => setClienteHistorial(null)}
                    />
                    <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-lg max-h-[85dvh] overflow-y-auto p-6 relative z-10 shadow-2xl border border-stone-200">
                        <div className="flex items-start justify-between gap-2 mb-4 pb-3 border-b border-stone-100">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500">
                                    Historial de Servicios
                                </p>
                                <h3 className="text-xl font-black text-stone-900">
                                    {clienteHistorial.nombre}
                                </h3>
                                <p className="text-xs text-stone-500">
                                    {clienteHistorial.completados} servicios realizados • Total
                                    invertido: $
                                    {clienteHistorial.totalInvertido.toLocaleString('es-AR')}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setClienteHistorial(null)}
                                className="p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {clienteHistorial.turnos.length === 0 ? (
                            <p className="text-sm text-stone-500 py-8 text-center">
                                Esta clienta aún no registra turnos en el historial.
                            </p>
                        ) : (
                            <div className="space-y-2.5">
                                {clienteHistorial.turnos.map(t => (
                                    <div
                                        key={t.id}
                                        className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-center justify-between gap-3"
                                    >
                                        <div>
                                            <p className="text-xs font-bold text-stone-900">
                                                📅 {t.fecha.split('-').reverse().join('/')} •{' '}
                                                {t.horario} hs
                                            </p>
                                            <p className="text-xs text-stone-600 font-medium mt-0.5">
                                                {t.servicio.split('(')[0].trim()}
                                            </p>
                                            {t.descuento_aplicado > 0 && (
                                                <span className="inline-block text-[10px] font-bold text-rose-600 mt-0.5">
                                                    🎁 Descuento aplicado: -{t.descuento_aplicado}%
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="block text-sm font-black text-stone-900">
                                                ${t.precioFinal.toLocaleString('es-AR')}
                                            </span>
                                            <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white border border-stone-200 text-stone-600 mt-1">
                                                {t.estado}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* =================================================================
                MODAL 2: CREAR / EDITAR FICHA TÉCNICA DE LA CLIENTA
               ================================================================= */}
            {modalFichaOpen && (
                <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in">
                    <div
                        className="absolute inset-0"
                        onClick={() => setModalFichaOpen(false)}
                    />
                    <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-lg max-h-[88dvh] overflow-y-auto p-6 relative z-10 shadow-2xl border border-stone-200">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
                            <h3 className="text-xl font-black text-stone-900">
                                {editandoKey
                                    ? 'Editar Ficha y Notas Técnicas'
                                    : 'Registrar Nueva Clienta'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setModalFichaOpen(false)}
                                className="p-2 rounded-full text-stone-400 hover:text-stone-700"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleGuardarFicha} className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                                    Nombre y Apellido *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formNombre}
                                    onChange={e => setFormNombre(e.target.value)}
                                    placeholder="Ej: Liliana Martínez"
                                    className="w-full p-3 rounded-xl border border-stone-200 text-sm text-stone-900"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                                        WhatsApp (sin 0 ni 15)
                                    </label>
                                    <input
                                        type="tel"
                                        value={formCelular}
                                        onChange={e =>
                                            setFormCelular(e.target.value.replace(/\D/g, ''))
                                        }
                                        placeholder="Ej: 3814556677"
                                        className="w-full p-3 rounded-xl border border-stone-200 text-sm text-stone-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                                        Fecha de Cumpleaños / Nac.
                                    </label>
                                    <input
                                        type="date"
                                        value={formFechaNac}
                                        onChange={e => setFormFechaNac(e.target.value)}
                                        className="w-full p-3 rounded-xl border border-stone-200 text-sm text-stone-900"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                                        Categoría de Clienta
                                    </label>
                                    <select
                                        value={formEtiqueta}
                                        onChange={e =>
                                            setFormEtiqueta(e.target.value as EtiquetaCliente)
                                        }
                                        className="w-full p-3 rounded-xl border border-stone-200 text-sm text-stone-900 bg-white"
                                    >
                                        <option value="vip">👑 Clienta VIP</option>
                                        <option value="frecuente">💖 Clienta Frecuente</option>
                                        <option value="nueva">🆕 Clienta Nueva</option>
                                        <option value="atencion">⚠️ Revisar por ausencias</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                                        Email (opcional)
                                    </label>
                                    <input
                                        type="email"
                                        value={formEmail}
                                        onChange={e => setFormEmail(e.target.value)}
                                        placeholder="correo@ejemplo.com"
                                        className="w-full p-3 rounded-xl border border-stone-200 text-sm text-stone-900"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                                    💅 Ficha Técnica y Notas Privadas de Manicuría
                                </label>
                                <textarea
                                    rows={3}
                                    value={formNotas}
                                    onChange={e => setFormNotas(e.target.value)}
                                    placeholder="Ej: Prefiere Soft Gel almendrado largo #2, uña natural sensible, tonos vía láctea y french..."
                                    className="w-full p-3 rounded-xl border border-stone-200 text-sm text-stone-900"
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <button
                                    type="submit"
                                    disabled={guardandoFicha}
                                    className="flex-1 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-bold py-3 rounded-xl text-sm shadow-md disabled:opacity-50"
                                >
                                    {guardandoFicha ? 'Guardando...' : 'Guardar Ficha'}
                                </button>
                                {editandoKey && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleEliminarFicha(
                                                {
                                                    key: editandoKey,
                                                    reservaIds: editandoReservaIds
                                                } as ResumenCliente,
                                                false
                                            )
                                        }
                                        className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold py-3 px-4 rounded-xl text-xs flex items-center gap-1"
                                    >
                                        <Trash2 className="w-4 h-4" /> Ocultar Ficha
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* =================================================================
                MODAL 3: AGENDAR TURNO DIRECTO PARA ESTA CLIENTA
               ================================================================= */}
            {clienteAgendar && (
                <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in">
                    <div
                        className="absolute inset-0"
                        onClick={() => setClienteAgendar(null)}
                    />
                    <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-md p-6 relative z-10 shadow-2xl border border-stone-200">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                                    Asignación Rápida
                                </p>
                                <h3 className="text-lg font-black text-stone-900">
                                    Dar turno a {clienteAgendar.nombre}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setClienteAgendar(null)}
                                className="p-2 rounded-full text-stone-400 hover:text-stone-700"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAgendarDirecto} className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                                    Fecha del Turno
                                </label>
                                <input
                                    type="date"
                                    required
                                    min={getHoyArgentina()}
                                    value={turnoFecha}
                                    onChange={e => setTurnoFecha(e.target.value)}
                                    className="w-full p-3 rounded-xl border border-stone-200 text-sm font-bold text-stone-900"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                                    Bloque Horario (2 hs)
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {horariosBase.map(h => (
                                        <button
                                            key={h}
                                            type="button"
                                            onClick={() => setTurnoHorario(h)}
                                            className={`py-2.5 rounded-xl text-xs font-bold border transition ${
                                                turnoHorario === h
                                                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                                                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-emerald-50'
                                            }`}
                                        >
                                            {h} hs
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                                    Servicio a Realizar
                                </label>
                                <select
                                    required
                                    value={turnoServicio}
                                    onChange={e => setTurnoServicio(e.target.value)}
                                    className="w-full p-3 rounded-xl border border-stone-200 text-sm font-semibold text-stone-900 bg-white"
                                >
                                    {servicios.map(s => (
                                        <option
                                            key={s.id}
                                            value={`${s.nombre} ($${Number(s.precio).toLocaleString('es-AR')})`}
                                        >
                                            {s.nombre} (${Number(s.precio).toLocaleString('es-AR')}
                                            )
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={guardandoTurno}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl text-sm shadow-md disabled:opacity-50"
                            >
                                {guardandoTurno
                                    ? 'Asignando turno...'
                                    : 'Confirmar y Agendar Turno'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
