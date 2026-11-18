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
    Check
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
                            filtro === 'cumple_hoy' ? 'cumple_mes' : 'cumple_hoy'
                        )
                    }
                    className={`bg-white/95 rounded-2xl p-4 border text-left transition shadow-sm ${
                        filtro === 'cumple_hoy' || filtro === 'cumple_mes'
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
                        {kpis.cumpleHoy > 0 ? (
                            <>
                                {kpis.cumpleHoy}{' '}
                                <span className="text-xs font-bold text-rose-600">
                                    ¡HOY! ({kpis.cumpleMes} en el mes)
                                </span>
                            </>
                        ) : (
                            <>
                                {kpis.cumpleSemana}{' '}
                                <span className="text-xs font-bold text-pink-600">
                                    esta sem. ({kpis.cumpleMes} en el mes)
                                </span>
                            </>
                        )}
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

            {/* 2. Barra de Control: Búsqueda + Ordenamiento + Cantidad de Tarjetas + Botón Registrar */}
            <div className="bg-white/95 rounded-2xl p-4 sm:p-5 border border-stone-200/90 shadow-2xs space-y-3">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                    {/* Input de Búsqueda */}
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                            placeholder="Buscar por nombre, WhatsApp o notas técnicas..."
                            className="w-full pl-10 pr-9 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-800 focus:outline-none focus:border-rose-400 transition"
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

                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Selector de Ordenamiento */}
                        <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-700">
                            <ArrowUpDown className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <span className="text-[11px] font-bold text-stone-400 uppercase">Orden:</span>
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

                        {/* Selector de Cantidad de Tarjetas Visibles (5, 10, 15, 20, 30, 50) */}
                        <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-700">
                            <span className="text-[11px] font-bold text-stone-400 uppercase">Ver:</span>
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
                            className="bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs shrink-0 transition"
                        >
                            <UserPlus className="w-4 h-4" />
                            <span>Registrar Clienta</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. Barra de Filtros Segmentada con Ubicación Propia */}
            <div className="bg-white/95 rounded-2xl p-4 sm:p-5 border border-stone-200/90 shadow-2xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Filter className="w-4 h-4 text-rose-500" />
                            Filtros de Cartera
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            {totalElementos} clientas
                        </span>
                    </div>

                    {filtro !== 'todas' && (
                        <button
                            type="button"
                            onClick={() => setFiltro('todas')}
                            className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition"
                        >
                            <X className="w-3.5 h-3.5" />
                            Limpiar filtros (ver todas)
                        </button>
                    )}
                </div>

                {/* Pastillas de filtro estilizadas y categorizadas */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    {/* Todas */}
                    <button
                        type="button"
                        onClick={() => setFiltro('todas')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                            filtro === 'todas'
                                ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                                : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                        }`}
                    >
                        <span>👥</span>
                        <span>Todas</span>
                        <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                                filtro === 'todas'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-stone-200/70 text-stone-700'
                            }`}
                        >
                            {kpis.total}
                        </span>
                    </button>

                    {/* Nuevas */}
                    <button
                        type="button"
                        onClick={() => setFiltro('nuevas')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                            filtro === 'nuevas'
                                ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                                : 'bg-sky-50/70 text-sky-800 border-sky-200 hover:bg-sky-100'
                        }`}
                    >
                        <span>🆕</span>
                        <span>Nuevas (1 servicio)</span>
                        <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                                filtro === 'nuevas'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-sky-200/80 text-sky-900'
                            }`}
                        >
                            {kpis.nuevas}
                        </span>
                    </button>

                    {/* Frecuentes / VIP */}
                    <button
                        type="button"
                        onClick={() => setFiltro('frecuentes')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                            filtro === 'frecuentes'
                                ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                                : 'bg-amber-50/70 text-amber-900 border-amber-200 hover:bg-amber-100'
                        }`}
                    >
                        <span>⭐</span>
                        <span>Frecuentes / VIP</span>
                        <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                                filtro === 'frecuentes'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-amber-200/80 text-amber-900'
                            }`}
                        >
                            {kpis.frecuentes}
                        </span>
                    </button>

                    {/* Con Turno Futuro */}
                    <button
                        type="button"
                        onClick={() => setFiltro('con_turno_futuro')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                            filtro === 'con_turno_futuro'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : 'bg-emerald-50/70 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        }`}
                    >
                        <span>📅</span>
                        <span>Con Turno Futuro</span>
                        <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                                filtro === 'con_turno_futuro'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-emerald-200/80 text-emerald-900'
                            }`}
                        >
                            {kpis.conTurnoFuturo}
                        </span>
                    </button>

                    {/* Sin Próximo Turno */}
                    <button
                        type="button"
                        onClick={() => setFiltro('sin_turno_futuro')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                            filtro === 'sin_turno_futuro'
                                ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                                : 'bg-orange-50/70 text-orange-900 border-orange-200 hover:bg-orange-100'
                        }`}
                    >
                        <span>⏳</span>
                        <span>Sin Próximo Turno</span>
                        <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                                filtro === 'sin_turno_futuro'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-orange-200/80 text-orange-900'
                            }`}
                        >
                            {kpis.sinTurnoFuturo}
                        </span>
                    </button>

                    {/* Para Service +18d */}
                    <button
                        type="button"
                        onClick={() => setFiltro('service')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                            filtro === 'service'
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-indigo-50/70 text-indigo-900 border-indigo-200 hover:bg-indigo-100'
                        }`}
                    >
                        <span>🔔</span>
                        <span>Para Service (+18 d)</span>
                        <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                                filtro === 'service'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-indigo-200/80 text-indigo-900'
                            }`}
                        >
                            {kpis.paraService}
                        </span>
                    </button>

                    {/* Inactivas +45d */}
                    <button
                        type="button"
                        onClick={() => setFiltro('inactivas')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                            filtro === 'inactivas'
                                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                                : 'bg-purple-50/70 text-purple-900 border-purple-200 hover:bg-purple-100'
                        }`}
                    >
                        <span>💤</span>
                        <span>Inactivas (+45 d)</span>
                        <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                                filtro === 'inactivas'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-purple-200/80 text-purple-900'
                            }`}
                        >
                            {kpis.inactivas}
                        </span>
                    </button>

                    {/* ¡Cumple Hoy! */}
                    <button
                        type="button"
                        onClick={() => setFiltro('cumple_hoy')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                            filtro === 'cumple_hoy'
                                ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                                : 'bg-rose-50/70 text-rose-900 border-rose-200 hover:bg-rose-100'
                        }`}
                    >
                        <span>🎂</span>
                        <span>¡Cumple Hoy!</span>
                        <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                                filtro === 'cumple_hoy'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-rose-200/80 text-rose-900'
                            }`}
                        >
                            {kpis.cumpleHoy}
                        </span>
                    </button>

                    {/* Cumple este Mes */}
                    <button
                        type="button"
                        onClick={() => setFiltro('cumple_mes')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                            filtro === 'cumple_mes'
                                ? 'bg-pink-500 text-white border-pink-500 shadow-xs'
                                : 'bg-pink-50/70 text-pink-900 border-pink-200 hover:bg-pink-100'
                        }`}
                    >
                        <span>🎉</span>
                        <span>Cumple este Mes</span>
                        <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                                filtro === 'cumple_mes'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-pink-200/80 text-pink-900'
                            }`}
                        >
                            {kpis.cumpleMes}
                        </span>
                    </button>

                    {/* 12° Servicio / 10% OFF */}
                    <button
                        type="button"
                        onClick={() => setFiltro('fidelidad_12')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                            filtro === 'fidelidad_12'
                                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                : 'bg-amber-50/70 text-amber-900 border-amber-200 hover:bg-amber-100'
                        }`}
                    >
                        <span>🏆</span>
                        <span>12° Serv. / 10% OFF</span>
                        <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                                filtro === 'fidelidad_12'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-amber-200/80 text-amber-900'
                            }`}
                        >
                            {kpis.fidelidad12}
                        </span>
                    </button>

                    {/* Con Ausencias */}
                    <button
                        type="button"
                        onClick={() => setFiltro('con_ausencias')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                            filtro === 'con_ausencias'
                                ? 'bg-red-600 text-white border-red-600 shadow-xs'
                                : 'bg-red-50/70 text-red-900 border-red-200 hover:bg-red-100'
                        }`}
                    >
                        <span>⚠️</span>
                        <span>Con Ausencias</span>
                        <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                                filtro === 'con_ausencias'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-red-200/80 text-red-900'
                            }`}
                        >
                            {kpis.conAusencias}
                        </span>
                    </button>

                    {/* Sin Celular */}
                    <button
                        type="button"
                        onClick={() => setFiltro('sin_celular')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                            filtro === 'sin_celular'
                                ? 'bg-stone-700 text-white border-stone-700 shadow-xs'
                                : 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200'
                        }`}
                    >
                        <span>📱</span>
                        <span>Sin Celular</span>
                        <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                                filtro === 'sin_celular'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-stone-200 text-stone-700'
                            }`}
                        >
                            {kpis.sinCelular}
                        </span>
                    </button>
                </div>
            </div>

            {/* 4. Grilla de Tarjetas de Clientas con Paginación */}
            <div id="seccion-clientas-grilla" className="scroll-mt-4 space-y-4">
                {totalElementos > 0 && (
                    <div className="flex items-center justify-between text-xs text-stone-500 font-medium px-1">
                        <p>
                            Mostrando clientas <span className="font-bold text-stone-800">{indiceInicio + 1}</span> a{' '}
                            <span className="font-bold text-stone-800">{indiceFin}</span> de{' '}
                            <span className="font-bold text-stone-800">{totalElementos}</span>
                        </p>
                        <p className="text-[11px] text-stone-400">
                            Página {paginaSegura} de {totalPaginas}
                        </p>
                    </div>
                )}

                {totalElementos === 0 ? (
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
                        {clientasPaginadas.map((c, idx) => {
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
                                        {c.completados >= 11 && (
                                            <span className="bg-gradient-to-r from-amber-400 to-orange-400 text-stone-900 border border-amber-500 px-2.5 py-1 rounded-lg font-black flex items-center gap-1 shadow-sm">
                                                🏆 {c.completados === 11 ? '¡12° Servicio: 10% OFF!' : '10% OFF Fidelidad'}
                                            </span>
                                        )}
                                    </div>

                                    {/* Contador de progreso hacia el 12° servicio */}
                                    <div className="flex items-center justify-between text-[11px] text-amber-950 bg-amber-50/80 border border-amber-200/80 rounded-xl px-3 py-1.5 mb-2.5">
                                        <span className="flex items-center gap-1 font-bold">
                                            🎯 Progreso Fidelidad:
                                        </span>
                                        <span className="font-black text-rose-700">
                                            {c.completados % 12}/12 servicios
                                        </span>
                                        <span className="text-stone-500 text-[10px]">
                                            (10% OFF en turno #12)
                                        </span>
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
                                            {(c.esCumpleHoy || c.esCumpleSemana || c.esCumpleMes) && (
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

                                            <button
                                                type="button"
                                                onClick={() => setGiftCardClient(c)}
                                                className="bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                                                title="Emitir Gift Card para esta clienta"
                                            >
                                                <Gift className="w-3.5 h-3.5 text-pink-600" /> Gift Card
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Paginación Inferior */}
            {totalPaginas > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/95 rounded-2xl p-4 border border-stone-200/80 shadow-2xs">
                    <p className="text-xs text-stone-500 font-medium">
                        Página <span className="font-bold text-stone-800">{paginaSegura}</span> de{' '}
                        <span className="font-bold text-stone-800">{totalPaginas}</span> ({totalElementos} clientas)
                    </p>

                    <div className="flex items-center gap-1 sm:gap-1.5">
                        <button
                            type="button"
                            onClick={() => cambiarPagina(paginaSegura - 1)}
                            disabled={paginaSegura === 1}
                            className="px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-100 transition flex items-center gap-1"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            <span>Anterior</span>
                        </button>

                        <div className="flex items-center gap-1">
                            {generarRangoPaginas(paginaSegura, totalPaginas).map((pag, pIdx) => {
                                if (pag === '...') {
                                    return (
                                        <span key={`dots-${pIdx}`} className="px-2 text-xs text-stone-400 font-bold">
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
                                        className={`w-8 h-8 rounded-xl text-xs font-bold transition flex items-center justify-center ${
                                            paginaSegura === num
                                                ? 'bg-rose-500 text-white shadow-xs'
                                                : 'text-stone-700 hover:bg-stone-100 border border-stone-200/80'
                                        }`}
                                    >
                                        {num}
                                    </button>
                                )
                            })}
                        </div>

                        <button
                            type="button"
                            onClick={() => cambiarPagina(paginaSegura + 1)}
                            disabled={paginaSegura === totalPaginas}
                            className="px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-100 transition flex items-center gap-1"
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
