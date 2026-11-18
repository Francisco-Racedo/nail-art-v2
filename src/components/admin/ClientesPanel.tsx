'use client'

import React, { useState, useMemo, useEffect } from 'react'
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
    FileText,
    Gift,
    Award,
    Filter,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    Check,
    PhoneOff,
    CalendarCheck
} from 'lucide-react'
import GiftCardModal from '../GiftCardModal'
import { celularParaWhatsapp, getHoyArgentina } from '@/lib/utils'
import type { ResumenCliente, EtiquetaCliente } from '@/lib/reservas-server'
import {
    guardarFichaClienteAction,
    eliminarFichaClienteAction
} from '@/app/admin/dashboard/clientes/actions'
import { crearTurnoManualAdmin } from '@/app/admin/actions'

type FiltroClientes =
    | 'todas'
    | 'nuevas'
    | 'frecuentes'
    | 'con_turno_futuro'
    | 'sin_turno_futuro'
    | 'service'
    | 'inactivas'
    | 'cumple_hoy'
    | 'cumple_mes'
    | 'fidelidad_12'
    | 'con_ausencias'
    | 'sin_celular'

type OrdenClientes = 'recientes' | 'inversion' | 'servicios' | 'nombre'

const AVATAR_GRADIENTS = [
    'from-rose-400 to-pink-500',
    'from-amber-400 to-orange-500',
    'from-pink-400 to-rose-500',
    'from-purple-400 to-indigo-500',
    'from-emerald-400 to-teal-500',
    'from-sky-400 to-blue-500'
]

function getAvatarGradient(nombre: string): string {
    let hash = 0
    const str = nombre || 'Cliente'
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    const idx = Math.abs(hash) % AVATAR_GRADIENTS.length
    return AVATAR_GRADIENTS[idx]
}

function obtenerIniciales(nombre: string): string {
    const partes = (nombre || '').trim().split(/\s+/)
    if (partes.length === 0 || !partes[0]) return 'CL'
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase()
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

const ETIQUETAS_FILTRO: Record<FiltroClientes, string> = {
    todas: 'Todas',
    nuevas: 'Nuevas (1 servicio)',
    frecuentes: 'Frecuentes / VIP',
    con_turno_futuro: 'Con Turno Futuro',
    sin_turno_futuro: 'Sin Próximo Turno',
    service: 'Para Service (+18 d)',
    inactivas: 'Inactivas (+45 d)',
    cumple_hoy: '¡Cumple Hoy!',
    cumple_mes: 'Cumple este Mes',
    fidelidad_12: '12° Servicio / 10% OFF',
    con_ausencias: 'Con Ausencias',
    sin_celular: 'Sin Celular'
}

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

function generarRangoPaginas(actual: number, total: number): (number | '...')[] {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1)
    }
    if (actual <= 4) {
        return [1, 2, 3, 4, 5, '...', total]
    }
    if (actual >= total - 3) {
        return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
    }
    return [1, '...', actual - 1, actual, actual + 1, '...', total]
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
    const [orden, setOrden] = useState<OrdenClientes>('recientes')
    const [elementosPorPagina, setElementosPorPagina] = useState<number>(10)
    const [paginaActual, setPaginaActual] = useState<number>(1)

    // Resetear a página 1 cuando cambia filtro, búsqueda, orden o cantidad por página
    useEffect(() => {
        setPaginaActual(1)
    }, [busqueda, filtro, orden, elementosPorPagina])

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
    const [giftCardClient, setGiftCardClient] = useState<ResumenCliente | null>(null)

    // Métricas superiores de cartera ampliadas
    const kpis = useMemo(() => {
        return {
            total: clientes.length,
            nuevas: clientes.filter(c => c.completados === 1).length,
            frecuentes: clientes.filter(
                c => c.etiqueta === 'vip' || c.etiqueta === 'frecuente' || c.completados >= 2
            ).length,
            conTurnoFuturo: clientes.filter(c => !!c.proximoTurno).length,
            sinTurnoFuturo: clientes.filter(c => !c.proximoTurno).length,
            paraService: clientes.filter(c => c.necesitaService).length,
            inactivas: clientes.filter(
                c => (c.diasDesdeUltimoTurno ?? 0) >= 45 && !c.proximoTurno
            ).length,
            cumpleHoy: clientes.filter(c => c.esCumpleHoy).length,
            cumpleSemana: clientes.filter(c => c.esCumpleSemana).length,
            cumpleMes: clientes.filter(c => c.esCumpleMes).length,
            fidelidad12: clientes.filter(c => c.completados >= 11).length,
            conAusencias: clientes.filter(c => c.ausencias > 0).length,
            sinCelular: clientes.filter(c => !c.celularDisplay).length
        }
    }, [clientes])

    // Filtrado y Ordenamiento
    const filtradosYOrdenados = useMemo(() => {
        const q = busqueda.toLowerCase().trim()
        const filtradas = clientes.filter(c => {
            if (filtro === 'nuevas' && c.completados !== 1) return false
            if (
                filtro === 'frecuentes' &&
                c.etiqueta !== 'vip' &&
                c.etiqueta !== 'frecuente' &&
                c.completados < 2
            ) {
                return false
            }
            if (filtro === 'con_turno_futuro' && !c.proximoTurno) return false
            if (filtro === 'sin_turno_futuro' && !!c.proximoTurno) return false
            if (filtro === 'service' && !c.necesitaService) return false
            if (
                filtro === 'inactivas' &&
                ((c.diasDesdeUltimoTurno ?? 0) < 45 || !!c.proximoTurno)
            ) {
                return false
            }
            if (filtro === 'cumple_hoy' && !c.esCumpleHoy) return false
            if (filtro === 'cumple_mes' && !c.esCumpleMes) return false
            if (filtro === 'fidelidad_12' && c.completados < 11) return false
            if (filtro === 'con_ausencias' && c.ausencias <= 0) return false
            if (filtro === 'sin_celular' && !!c.celularDisplay) return false

            if (!q) return true
            return (
                c.nombre.toLowerCase().includes(q) ||
                c.celularDisplay.includes(q) ||
                (c.email && c.email.toLowerCase().includes(q)) ||
                (c.notas_tecnicas && c.notas_tecnicas.toLowerCase().includes(q))
            )
        })

        return filtradas.sort((a, b) => {
            if (orden === 'inversion') {
                return b.totalInvertido - a.totalInvertido
            }
            if (orden === 'servicios') {
                return b.completados - a.completados
            }
            if (orden === 'nombre') {
                return a.nombre.localeCompare(b.nombre)
            }
            // 'recientes': los más recientes primero (días desde último turno menor)
            const diasA = a.diasDesdeUltimoTurno ?? 9999
            const diasB = b.diasDesdeUltimoTurno ?? 9999
            if (diasA !== diasB) return diasA - diasB
            return b.completados - a.completados
        })
    }, [clientes, busqueda, filtro, orden])

    // Paginación
    const totalElementos = filtradosYOrdenados.length
    const totalPaginas = Math.max(1, Math.ceil(totalElementos / elementosPorPagina))
    const paginaSegura = Math.min(Math.max(1, paginaActual), totalPaginas)
    const indiceInicio = (paginaSegura - 1) * elementosPorPagina
    const indiceFin = Math.min(indiceInicio + elementosPorPagina, totalElementos)

    const clientasPaginadas = useMemo(() => {
        return filtradosYOrdenados.slice(indiceInicio, indiceFin)
    }, [filtradosYOrdenados, indiceInicio, indiceFin])

    const cambiarPagina = (nuevaPagina: number) => {
        setPaginaActual(nuevaPagina)
        const el = document.getElementById('seccion-clientas-grilla')
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }

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
            {/* 1. Tarjetas Superiores de Resumen de Cartera (KPIs con diseño editorial táctil) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                {/* Total Cartera */}
                <button
                    type="button"
                    onClick={() => setFiltro('todas')}
                    className={`rounded-3xl p-5 border text-left transition-all relative overflow-hidden group shadow-2xs hover:shadow-md ${
                        filtro === 'todas'
                            ? 'bg-white border-rose-400 ring-2 ring-rose-400/30'
                            : 'bg-white/95 border-stone-200/80 hover:border-rose-300'
                    }`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-rose-500" />
                            Total Cartera
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            {kpis.total - kpis.sinCelular} con WA
                        </span>
                    </div>
                    <p className="text-3xl font-black text-stone-900 tracking-tight">
                        {kpis.total}
                    </p>
                    <p className="text-[11px] text-stone-500 font-medium mt-1">
                        Clientas registradas en el salón
                    </p>
                </button>

                {/* Frecuentes / VIP */}
                <button
                    type="button"
                    onClick={() => setFiltro('frecuentes')}
                    className={`rounded-3xl p-5 border text-left transition-all relative overflow-hidden group shadow-2xs hover:shadow-md ${
                        filtro === 'frecuentes'
                            ? 'bg-white border-amber-400 ring-2 ring-amber-400/30'
                            : 'bg-white/95 border-stone-200/80 hover:border-amber-300'
                    }`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                            <Crown className="w-4 h-4 text-amber-500" />
                            Frecuentes / VIP
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                            {Math.round((kpis.frecuentes / (kpis.total || 1)) * 100)}% lealtad
                        </span>
                    </div>
                    <p className="text-3xl font-black text-stone-900 tracking-tight">
                        {kpis.frecuentes}
                    </p>
                    <p className="text-[11px] text-stone-500 font-medium mt-1">
                        Con 2 o más servicios realizados
                    </p>
                </button>

                {/* Para Service */}
                <button
                    type="button"
                    onClick={() => setFiltro('service')}
                    className={`rounded-3xl p-5 border text-left transition-all relative overflow-hidden group shadow-2xs hover:shadow-md ${
                        filtro === 'service'
                            ? 'bg-white border-indigo-400 ring-2 ring-indigo-400/30'
                            : 'bg-white/95 border-stone-200/80 hover:border-indigo-300'
                    }`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                            <BellRing className="w-4 h-4 text-indigo-500" />
                            Para Service (+18 d)
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
                            Retoque
                        </span>
                    </div>
                    <p className="text-3xl font-black text-stone-900 tracking-tight">
                        {kpis.paraService}
                    </p>
                    <p className="text-[11px] text-stone-500 font-medium mt-1">
                        Listas para retoque y mantenimiento
                    </p>
                </button>

                {/* Cumpleaños */}
                <button
                    type="button"
                    onClick={() =>
                        setFiltro(kpis.cumpleHoy > 0 ? 'cumple_hoy' : 'cumple_mes')
                    }
                    className={`rounded-3xl p-5 border text-left transition-all relative overflow-hidden group shadow-2xs hover:shadow-md ${
                        filtro === 'cumple_hoy' || filtro === 'cumple_mes'
                            ? 'bg-white border-pink-400 ring-2 ring-pink-400/30'
                            : 'bg-white/95 border-stone-200/80 hover:border-pink-300'
                    }`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                            <Cake className="w-4 h-4 text-pink-500" />
                            Cumpleaños
                        </span>
                        {kpis.cumpleHoy > 0 ? (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-2xs animate-pulse">
                                ¡1 Hoy!
                            </span>
                        ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200">
                                Este mes
                            </span>
                        )}
                    </div>
                    <p className="text-3xl font-black text-stone-900 tracking-tight">
                        {kpis.cumpleHoy > 0 ? kpis.cumpleHoy : kpis.cumpleMes}
                        <span className="text-xs font-semibold text-stone-400 ml-1.5">
                            {kpis.cumpleHoy > 0 ? 'hoy' : 'en el mes'}
                        </span>
                    </p>
                    <p className="text-[11px] text-stone-500 font-medium mt-1">
                        Festejos y beneficios de fidelización
                    </p>
                </button>
            </div>

            {/* 2. Barra de Filtros y Control Unificada (Diseño Ultra Limpio, Sin Sobrecarga) */}
            <div className="bg-white/95 rounded-3xl p-4 sm:p-5 border border-stone-200/90 shadow-2xs space-y-3.5">
                {/* Fila 1: Pestañas Principales + Dropdown de Filtros Avanzados */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* 4 Pestañas Principales en Segmented Control */}
                    <div className="bg-stone-100/90 p-1 rounded-2xl border border-stone-200/80 flex flex-wrap items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setFiltro('todas')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                filtro === 'todas'
                                    ? 'bg-white text-stone-900 shadow-xs'
                                    : 'text-stone-600 hover:text-stone-900'
                            }`}
                        >
                            <span>👥 Todas</span>
                            <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                                    filtro === 'todas'
                                        ? 'bg-stone-900 text-white'
                                        : 'bg-stone-200 text-stone-700'
                                }`}
                            >
                                {kpis.total}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setFiltro('frecuentes')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                filtro === 'frecuentes'
                                    ? 'bg-amber-500 text-white shadow-xs'
                                    : 'text-stone-600 hover:text-stone-900'
                            }`}
                        >
                            <span>⭐ VIP / Frecuentes</span>
                            <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                                    filtro === 'frecuentes'
                                        ? 'bg-white/20 text-white'
                                        : 'bg-stone-200 text-stone-700'
                                }`}
                            >
                                {kpis.frecuentes}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setFiltro('service')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                filtro === 'service'
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'text-stone-600 hover:text-stone-900'
                            }`}
                        >
                            <span>🔔 Para Service</span>
                            <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                                    filtro === 'service'
                                        ? 'bg-white/20 text-white'
                                        : 'bg-stone-200 text-stone-700'
                                }`}
                            >
                                {kpis.paraService}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setFiltro('cumple_mes')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                filtro === 'cumple_mes' || filtro === 'cumple_hoy'
                                    ? 'bg-pink-500 text-white shadow-xs'
                                    : 'text-stone-600 hover:text-stone-900'
                            }`}
                        >
                            <span>🎂 Cumpleaños</span>
                            <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                                    filtro === 'cumple_mes' || filtro === 'cumple_hoy'
                                        ? 'bg-white/20 text-white'
                                        : 'bg-stone-200 text-stone-700'
                                }`}
                            >
                                {kpis.cumpleMes}
                            </span>
                        </button>
                    </div>

                    {/* Selector Desplegable de Filtros Avanzados (Reemplaza los 12 botones apiñados) */}
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <select
                                value={
                                    [
                                        'nuevas',
                                        'con_turno_futuro',
                                        'sin_turno_futuro',
                                        'inactivas',
                                        'cumple_hoy',
                                        'fidelidad_12',
                                        'con_ausencias',
                                        'sin_celular'
                                    ].includes(filtro)
                                        ? filtro
                                        : ''
                                }
                                onChange={e => {
                                    const val = e.target.value as FiltroClientes
                                    if (val) setFiltro(val)
                                }}
                                className="bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-bold px-3.5 py-2 rounded-2xl focus:outline-none focus:border-rose-400 cursor-pointer transition appearance-none pr-8 shadow-2xs"
                            >
                                <option value="">⚡ Más Filtros...</option>
                                <option value="nuevas">🆕 Nuevas (1 servicio) ({kpis.nuevas})</option>
                                <option value="con_turno_futuro">
                                    📅 Con Turno Agendado ({kpis.conTurnoFuturo})
                                </option>
                                <option value="sin_turno_futuro">
                                    ⏳ Sin Próximo Turno ({kpis.sinTurnoFuturo})
                                </option>
                                <option value="inactivas">
                                    💤 Inactivas (+45 días) ({kpis.inactivas})
                                </option>
                                <option value="cumple_hoy">
                                    🎂 ¡Cumpleaños de Hoy! ({kpis.cumpleHoy})
                                </option>
                                <option value="fidelidad_12">
                                    🏆 12° Servicio / 10% OFF ({kpis.fidelidad12})
                                </option>
                                <option value="con_ausencias">
                                    ⚠️ Con Ausencias ({kpis.conAusencias})
                                </option>
                                <option value="sin_celular">
                                    📱 Fichas Sin Celular ({kpis.sinCelular})
                                </option>
                            </select>
                            <Filter className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        {filtro !== 'todas' && (
                            <button
                                type="button"
                                onClick={() => setFiltro('todas')}
                                className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 bg-rose-50 border border-rose-200 px-3 py-2 rounded-2xl transition shadow-2xs"
                                title="Ver todas las clientas"
                            >
                                <X className="w-3.5 h-3.5" />
                                <span>Limpiar</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Si hay un filtro específico activo que no sea de las pestañas principales, mostrar badge informativo */}
                {![
                    'todas',
                    'frecuentes',
                    'service',
                    'cumple_mes'
                ].includes(filtro) && (
                    <div className="flex items-center gap-2 pt-1 text-xs">
                        <span className="text-stone-400 font-medium">Filtro aplicado:</span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            {ETIQUETAS_FILTRO[filtro]} ({totalElementos} clientas)
                            <button
                                type="button"
                                onClick={() => setFiltro('todas')}
                                className="hover:text-rose-900 ml-1"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </span>
                    </div>
                )}

                {/* Fila 2: Buscador + Orden + Selector de Cantidad por Página + Botón Registrar */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-3 border-t border-stone-100">
                    {/* Input de Búsqueda */}
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                            placeholder="Buscar por nombre, WhatsApp o notas técnicas..."
                            className="w-full pl-10 pr-9 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-sm text-stone-800 focus:outline-none focus:border-rose-400 transition"
                        />
                        {busqueda && (
                            <button
                                type="button"
                                onClick={() => setBusqueda('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Selector de Orden */}
                        <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-2xl px-3 py-2 text-xs text-stone-700">
                            <ArrowUpDown className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <span className="text-[11px] font-bold text-stone-400 uppercase">
                                Orden:
                            </span>
                            <select
                                value={orden}
                                onChange={e => setOrden(e.target.value as OrdenClientes)}
                                className="bg-transparent font-bold text-stone-800 text-xs focus:outline-none cursor-pointer"
                            >
                                <option value="recientes">Más Recientes</option>
                                <option value="inversion">Mayor Inversión ($)</option>
                                <option value="servicios">Más Servicios</option>
                                <option value="nombre">Nombre (A - Z)</option>
                            </select>
                        </div>

                        {/* Selector de Cantidad de Tarjetas Visibles */}
                        <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-2xl px-3 py-2 text-xs text-stone-700">
                            <span className="text-[11px] font-bold text-stone-400 uppercase">
                                Ver:
                            </span>
                            <select
                                value={elementosPorPagina}
                                onChange={e => {
                                    setElementosPorPagina(Number(e.target.value))
                                    setPaginaActual(1)
                                }}
                                className="bg-transparent font-bold text-stone-800 text-xs focus:outline-none cursor-pointer"
                            >
                                <option value={5}>5 por pág.</option>
                                <option value={10}>10 por pág.</option>
                                <option value={15}>15 por pág.</option>
                                <option value={20}>20 por pág.</option>
                                <option value={30}>30 por pág.</option>
                                <option value={50}>50 por pág.</option>
                            </select>
                        </div>

                        {/* Botón Registrar Clienta */}
                        <button
                            type="button"
                            onClick={abrirNuevaClienta}
                            className="bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs shrink-0 transition"
                        >
                            <UserPlus className="w-4 h-4" />
                            <span>Registrar Clienta</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. Grilla de Tarjetas de Clientas con Diseño Editorial de Alto Impacto */}
            <div id="seccion-clientas-grilla" className="scroll-mt-4 space-y-4">
                {totalElementos > 0 && (
                    <div className="flex items-center justify-between text-xs text-stone-500 font-medium px-1">
                        <p>
                            Mostrando clientas{' '}
                            <span className="font-bold text-stone-800">
                                {indiceInicio + 1}
                            </span>{' '}
                            a{' '}
                            <span className="font-bold text-stone-800">
                                {indiceFin}
                            </span>{' '}
                            de{' '}
                            <span className="font-bold text-stone-800">
                                {totalElementos}
                            </span>
                        </p>
                        <p className="text-[11px] text-stone-400">
                            Página {paginaSegura} de {totalPaginas}
                        </p>
                    </div>
                )}

                {totalElementos === 0 ? (
                    <div className="bg-white/90 rounded-3xl p-10 text-center border border-stone-200 shadow-2xs">
                        <p className="text-stone-700 font-bold text-base mb-1">
                            No hay clientas que coincidan con los criterios seleccionados
                        </p>
                        <p className="text-stone-400 text-xs mb-4">
                            Probá cambiar o limpiar el filtro activo, o registrar una nueva clienta.
                        </p>
                        {filtro !== 'todas' && (
                            <button
                                type="button"
                                onClick={() => setFiltro('todas')}
                                className="bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs px-4 py-2 rounded-2xl hover:bg-rose-100 transition shadow-2xs"
                            >
                                Ver todas las clientas
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {clientasPaginadas.map((c, idx) => {
                            const badgeEtiqueta =
                                ETIQUETA_BADGE[c.etiqueta || 'nueva'] || ETIQUETA_BADGE.nueva
                            const progresoFidelidad =
                                c.completados > 0 && c.completados % 12 === 0
                                    ? 12
                                    : c.completados % 12

                            return (
                                <div
                                    key={`${c.key}-${idx}`}
                                    className="bg-white/95 rounded-3xl p-5 sm:p-6 border border-stone-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-4 relative overflow-hidden group"
                                >
                                    {/* Fondo decorativo sutil en hover */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-rose-50/50 to-transparent rounded-bl-full pointer-events-none -z-0" />

                                    <div className="space-y-4 relative z-10">
                                        {/* Encabezado: Avatar + Nombre + Badges */}
                                        <div className="flex items-start gap-3.5">
                                            {/* Avatar con Iniciales y Corona para VIP */}
                                            <div className="relative shrink-0">
                                                <div
                                                    className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${getAvatarGradient(
                                                        c.nombre
                                                    )} text-white font-black text-sm flex items-center justify-center shadow-xs`}
                                                >
                                                    {obtenerIniciales(c.nombre)}
                                                </div>
                                                {c.etiqueta === 'vip' && (
                                                    <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-stone-900 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-xs ring-2 ring-white font-bold">
                                                        👑
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                                                    <h3 className="font-extrabold text-base text-stone-900 truncate">
                                                        {c.nombre}
                                                    </h3>
                                                    <div className="flex items-center gap-1.5">
                                                        <span
                                                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badgeEtiqueta.cls}`}
                                                        >
                                                            {badgeEtiqueta.label}
                                                        </span>
                                                        {c.esCumpleHoy ? (
                                                            <span className="bg-gradient-to-r from-rose-500 to-amber-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-2xs animate-pulse">
                                                                🎂 ¡Cumple HOY!
                                                            </span>
                                                        ) : c.esCumpleMes ? (
                                                            <span className="bg-pink-50 text-pink-700 border border-pink-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                                                                🎂 Cumple{' '}
                                                                {c.fecha_nacimiento
                                                                    ? c.fecha_nacimiento
                                                                          .split('-')
                                                                          .slice(1)
                                                                          .reverse()
                                                                          .join('/')
                                                                    : 'este mes'}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
                                                    {c.celularDisplay ? (
                                                        <a
                                                            href={`https://wa.me/${celularParaWhatsapp(
                                                                c.celularDisplay
                                                            )}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="font-semibold text-stone-700 hover:text-emerald-600 transition flex items-center gap-1.5"
                                                        >
                                                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                                                            {c.celularDisplay}
                                                        </a>
                                                    ) : (
                                                        <span className="text-amber-600 font-semibold text-[11px] flex items-center gap-1">
                                                            <PhoneOff className="w-3 h-3" /> Sin
                                                            teléfono
                                                        </span>
                                                    )}

                                                    {c.fecha_nacimiento && (
                                                        <span className="text-stone-400 text-[11px]">
                                                            Nac:{' '}
                                                            {c.fecha_nacimiento
                                                                .split('-')
                                                                .reverse()
                                                                .join('/')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Franja de Métricas Rápidas en 3 Columnas Limpias */}
                                        <div className="grid grid-cols-3 gap-2 bg-stone-50/80 p-2.5 rounded-2xl border border-stone-200/60 text-center">
                                            <div>
                                                <span className="text-[10px] font-bold uppercase text-stone-400 block">
                                                    Servicios
                                                </span>
                                                <span className="text-xs font-black text-stone-800">
                                                    {c.completados}{' '}
                                                    {c.completados === 1 ? 'visita' : 'visitas'}
                                                </span>
                                            </div>
                                            <div className="border-x border-stone-200/60">
                                                <span className="text-[10px] font-bold uppercase text-stone-400 block">
                                                    Total Pagado
                                                </span>
                                                <span className="text-xs font-black text-emerald-700">
                                                    ${c.totalInvertido.toLocaleString('es-AR')}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase text-stone-400 block">
                                                    Último Turno
                                                </span>
                                                <span className="text-xs font-black text-stone-800">
                                                    {c.diasDesdeUltimoTurno === null
                                                        ? 'Sin visitas'
                                                        : c.diasDesdeUltimoTurno === 0
                                                        ? 'Hoy'
                                                        : `Hace ${c.diasDesdeUltimoTurno}d`}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Barra de Progreso del Programa de Fidelidad */}
                                        <div className="bg-gradient-to-r from-amber-50/60 to-rose-50/60 rounded-2xl p-3 border border-amber-200/50">
                                            <div className="flex items-center justify-between text-[11px] mb-1.5 font-bold">
                                                <span className="text-stone-700 flex items-center gap-1.5">
                                                    <Award className="w-3.5 h-3.5 text-amber-500" />
                                                    Programa Fidelidad
                                                </span>
                                                <span className="text-amber-900 font-black">
                                                    {progresoFidelidad}/12 turnos
                                                </span>
                                            </div>
                                            <div className="w-full bg-stone-200/80 h-2 rounded-full overflow-hidden">
                                                <div
                                                    className="bg-gradient-to-r from-amber-400 to-rose-500 h-full rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${Math.min(
                                                            100,
                                                            (progresoFidelidad / 12) * 100
                                                        )}%`
                                                    }}
                                                />
                                            </div>
                                            <div className="text-[10px] text-stone-500 mt-1.5 font-medium flex items-center justify-between">
                                                <span>
                                                    {12 - progresoFidelidad === 0
                                                        ? '🎉 ¡Turno listo para 10% OFF!'
                                                        : `Faltan ${12 - progresoFidelidad} turnos`}
                                                </span>
                                                <span className="text-amber-800 font-bold">
                                                    10% OFF en turno #12
                                                </span>
                                            </div>
                                        </div>

                                        {/* Alerta Contextual de Agenda o Retoque */}
                                        {c.proximoTurno ? (
                                            <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-2.5 text-xs text-emerald-950 flex items-center justify-between">
                                                <span className="flex items-center gap-2 font-medium">
                                                    <CalendarCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                                                    <span>
                                                        Próximo:{' '}
                                                        <strong>
                                                            {c.proximoTurno.fecha
                                                                .split('-')
                                                                .reverse()
                                                                .join('/')}
                                                        </strong>{' '}
                                                        a las{' '}
                                                        <strong>
                                                            {c.proximoTurno.horario} hs
                                                        </strong>
                                                    </span>
                                                </span>
                                                <span className="text-[10px] bg-emerald-200 text-emerald-900 font-black px-2 py-0.5 rounded-full uppercase">
                                                    Agendado
                                                </span>
                                            </div>
                                        ) : c.necesitaService ? (
                                            <div className="bg-indigo-50/80 border border-indigo-200/80 rounded-2xl p-2.5 text-xs text-indigo-950 flex items-center justify-between">
                                                <span className="flex items-center gap-2 font-medium">
                                                    <BellRing className="w-4 h-4 text-indigo-600 shrink-0" />
                                                    <span>
                                                        Service oportuno: pasaron{' '}
                                                        <strong>
                                                            {c.diasDesdeUltimoTurno} días
                                                        </strong>
                                                    </span>
                                                </span>
                                                <span className="text-[10px] bg-indigo-200 text-indigo-900 font-black px-2 py-0.5 rounded-full uppercase">
                                                    +18 días
                                                </span>
                                            </div>
                                        ) : null}

                                        {/* Notas Técnicas si existen */}
                                        {c.notas_tecnicas && (
                                            <div className="text-[11px] text-stone-600 bg-stone-50 p-2.5 rounded-2xl border border-stone-200/60 italic line-clamp-2">
                                                📝 "{c.notas_tecnicas}"
                                            </div>
                                        )}
                                    </div>

                                    {/* Barra de Acciones Inteligente y Compacta */}
                                    <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2 relative z-10">
                                        <div className="flex items-center gap-2 flex-1">
                                            {/* Acción Primaria Inteligente */}
                                            {c.esCumpleHoy && c.celularDisplay ? (
                                                <a
                                                    href={linkSaludoCumple(c)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-bold py-2.5 px-3 rounded-2xl flex items-center justify-center gap-1.5 shadow-2xs transition"
                                                >
                                                    <Cake className="w-3.5 h-3.5" />
                                                    <span>Saludar Hoy</span>
                                                </a>
                                            ) : c.necesitaService && c.celularDisplay ? (
                                                <a
                                                    href={linkRecordatorioService(c)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-3 rounded-2xl flex items-center justify-center gap-1.5 shadow-2xs transition"
                                                >
                                                    <BellRing className="w-3.5 h-3.5" />
                                                    <span>Recordar Service</span>
                                                </a>
                                            ) : c.celularDisplay ? (
                                                <a
                                                    href={`https://wa.me/${celularParaWhatsapp(
                                                        c.celularDisplay
                                                    )}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-3 rounded-2xl flex items-center justify-center gap-1.5 shadow-2xs transition"
                                                >
                                                    <Send className="w-3.5 h-3.5" />
                                                    <span>WhatsApp</span>
                                                </a>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => abrirEditarClienta(c)}
                                                    className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold py-2.5 px-3 rounded-2xl flex items-center justify-center gap-1.5 transition"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                    <span>Cargar Teléfono</span>
                                                </button>
                                            )}

                                            {/* Acción Secundaria: Dar Turno */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setClienteAgendar(c)
                                                    setTurnoServicio(
                                                        servicios[0]
                                                            ? `${servicios[0].nombre} ($${Number(
                                                                  servicios[0].precio
                                                              ).toLocaleString('es-AR')})`
                                                            : ''
                                                    )
                                                }}
                                                className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold py-2.5 px-3 rounded-2xl flex items-center justify-center gap-1.5 shadow-2xs transition"
                                            >
                                                <CalendarPlus className="w-3.5 h-3.5" />
                                                <span>Dar Turno</span>
                                            </button>
                                        </div>

                                        {/* Botones de Utilidad con Iconos y Tooltip */}
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setClienteHistorial(c)}
                                                className="p-2.5 rounded-2xl text-stone-500 hover:text-stone-900 hover:bg-stone-100 border border-stone-200/70 transition shadow-2xs"
                                                title={`Historial de turnos (${c.turnos.length})`}
                                            >
                                                <ClipboardList className="w-4 h-4" />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => abrirEditarClienta(c)}
                                                className="p-2.5 rounded-2xl text-stone-500 hover:text-rose-600 hover:bg-rose-50 border border-stone-200/70 transition shadow-2xs"
                                                title="Editar ficha técnica"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setGiftCardClient(c)}
                                                className="p-2.5 rounded-2xl text-stone-500 hover:text-pink-600 hover:bg-pink-50 border border-stone-200/70 transition shadow-2xs"
                                                title="Emitir Gift Card"
                                            >
                                                <Gift className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Paginación Inferior Estilizada */}
                {totalPaginas > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/95 rounded-3xl p-4 border border-stone-200/80 shadow-2xs">
                        <p className="text-xs text-stone-500 font-medium">
                            Página <span className="font-bold text-stone-800">{paginaSegura}</span> de{' '}
                            <span className="font-bold text-stone-800">{totalPaginas}</span> ({totalElementos} clientas)
                        </p>

                        <div className="flex items-center gap-1 sm:gap-1.5">
                            <button
                                type="button"
                                onClick={() => cambiarPagina(paginaSegura - 1)}
                                disabled={paginaSegura === 1}
                                className="px-3.5 py-1.5 rounded-2xl border border-stone-200 text-xs font-bold text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-100 transition flex items-center gap-1 shadow-2xs"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                <span>Anterior</span>
                            </button>

                            <div className="flex items-center gap-1">
                                {generarRangoPaginas(paginaSegura, totalPaginas).map(
                                    (pag, pIdx) => {
                                        if (pag === '...') {
                                            return (
                                                <span
                                                    key={`dots-${pIdx}`}
                                                    className="px-2 text-xs text-stone-400 font-bold"
                                                >
                                                    ...
                                                </span>
                                            )
                                        }
                                        const num = Number(pag)
                                        return (
                                            <button
                                                key={`page-${num}`}
                                                type="button"
                                                onClick={() => cambiarPagina(num)}
                                                className={`w-8 h-8 rounded-2xl text-xs font-bold transition flex items-center justify-center ${
                                                    paginaSegura === num
                                                        ? 'bg-rose-500 text-white shadow-xs'
                                                        : 'text-stone-700 hover:bg-stone-100 border border-stone-200/80'
                                                }`}
                                            >
                                                {num}
                                            </button>
                                        )
                                    }
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => cambiarPagina(paginaSegura + 1)}
                                disabled={paginaSegura === totalPaginas}
                                className="px-3.5 py-1.5 rounded-2xl border border-stone-200 text-xs font-bold text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-100 transition flex items-center gap-1 shadow-2xs"
                            >
                                <span>Siguiente</span>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

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
                                    Bloque Horario (1h 30m)
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

            {/* Modal de emisión de Gift Card para la clienta seleccionada */}
            <GiftCardModal
                isOpen={!!giftCardClient}
                onClose={() => setGiftCardClient(null)}
                isAdmin={true}
                defaultServicio="Servicio de Manicuría a Elección"
                clienteDestino={{
                    nombre: giftCardClient?.nombre,
                    celular: giftCardClient?.celularDisplay
                }}
            />
        </div>
    )
}
