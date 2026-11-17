'use client'

import React, { useRef, useState, useEffect } from 'react'
import {
    Settings,
    Plus,
    Trash2,
    Edit2,
    CheckCircle2,
    LayoutTemplate,
    Sparkles,
    Eye,
    EyeOff,
    Upload,
    Film,
    Image as ImageIcon,
    Layers
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import {
    updateConfig,
    addServicio,
    deleteServicio,
    editServicio,
    guardarCMSContenido
} from '@/app/admin/dashboard/ajustes/actions'
import { notificarCambioEnTiempoReal } from '@/app/providers'
import {
    CMSContenido,
    DEFAULT_CMS_CONTENIDO,
    mergeCMSContenido,
    SeccionPersonalizada,
    IconoAnimadoCMS,
    AnimacionPremiumCMS,
    EstiloFondoCMS
} from '@/lib/cms-types'

interface Config {
    intervalo_minutos: number
    hora_inicio: string
    hora_fin: string
    nombre_negocio?: string
    whatsapp_numero?: string
    pagos_habilitados?: boolean
    minutos_autoconfirmacion?: number
    meses_visibles_cliente?: number
    cms?: CMSContenido
}

interface Servicio {
    id: number
    nombre: string
    categoria: string
    precio: number
    icono: string
    destacado: number
    subtitulo?: string
    descripcion?: string
}

const OPCIONES_ICONOS: { value: IconoAnimadoCMS; label: string }[] = [
    { value: 'sparkles', label: '✨ Destellos (Sparkles)' },
    { value: 'crown', label: '👑 Corona Luxury (Crown)' },
    { value: 'gem', label: '💎 Diamante (Gem)' },
    { value: 'heart', label: '💖 Corazón (Heart)' },
    { value: 'star', label: '⭐ Estrella (Star)' },
    { value: 'flame', label: '🔥 Tendencia (Flame)' },
    { value: 'award', label: '🏅 Premio / Calidad (Award)' },
    { value: 'gift', label: '🎁 Regalo / Promo (Gift)' },
    { value: 'shield', label: '🛡️ Bioseguridad (Shield)' },
    { value: 'clock', label: '⏰ Reloj / Puntualidad (Clock)' }
]

const OPCIONES_ANIMACION: { value: AnimacionPremiumCMS; label: string }[] = [
    { value: 'fade_up', label: 'Aparición Editorial Suave (Fade Up)' },
    { value: 'zoom_luxury', label: 'Zoom de Revista (Scale In)' },
    { value: 'float_suave', label: 'Flotación Continua en Vivo' },
    { value: 'resplandor_dorado', label: 'Desenfoque a Foco + Halo Oro Rosa' }
]

const OPCIONES_ESTILO: { value: EstiloFondoCMS; label: string }[] = [
    { value: 'perla_editorial', label: 'Perla & Seda Editorial (Claro)' },
    { value: 'espresso_luxury', label: 'Espresso & Champagne (Oscuro VIP)' },
    { value: 'rose_gold_glow', label: 'Resplandor Oro Rosa (Cálido)' },
    { value: 'cristal_minimal', label: 'Cristal Minimalista (Blanco Puro)' }
]

export default function AjustesClient({
    config,
    servicios
}: {
    config: Config
    servicios: Servicio[]
}) {
    const router = useRouter()
    const queryClient = useQueryClient()

    const [tabActiva, setTabActiva] = useState<
        'general' | 'servicios' | 'contenido' | 'secciones'
    >('general')

    // 1. Estado de Ajustes Generales
    const [nombreNegocio, setNombreNegocio] = useState(
        config?.nombre_negocio || 'Pintaditas Nails'
    )
    const [whatsappNumero, setWhatsappNumero] = useState(
        config?.whatsapp_numero || '5493813013850'
    )
    const [intervaloMinutos, setIntervaloMinutos] = useState<number>(
        Number(config?.intervalo_minutos) || 90
    )
    const [horaInicio, setHoraInicio] = useState(config?.hora_inicio || '08:30')
    const [horaFin, setHoraFin] = useState(config?.hora_fin || '20:00')
    const [mesesVisibles, setMesesVisibles] = useState<number>(
        Number(config?.meses_visibles_cliente) || 3
    )
    const [minutosAuto, setMinutosAuto] = useState<number>(
        config?.minutos_autoconfirmacion ?? 10
    )
    const [pagosHabilitados, setPagosHabilitados] = useState<boolean>(
        !!config?.pagos_habilitados
    )
    const [guardandoConfig, setGuardandoConfig] = useState(false)
    const [ultimoGuardado, setUltimoGuardado] = useState<string | null>(null)

    // 2. Estado de Servicios
    const [listaServicios, setListaServicios] = useState<Servicio[]>(servicios || [])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingService, setEditingService] = useState<Servicio | null>(null)
    const formRef = useRef<HTMLFormElement>(null)

    // 3. Estado del CMS Visual (todas las secciones y textos de la web del cliente)
    const [cms, setCms] = useState<CMSContenido>(() =>
        mergeCMSContenido(config?.cms || DEFAULT_CMS_CONTENIDO)
    )
    const [guardandoCMS, setGuardandoCMS] = useState(false)
    const [subiendoArchivo, setSubiendoArchivo] = useState(false)

    useEffect(() => {
        setNombreNegocio(config?.nombre_negocio || 'Pintaditas Nails')
        setWhatsappNumero(config?.whatsapp_numero || '5493813013850')
        setIntervaloMinutos(Number(config?.intervalo_minutos) || 90)
        setHoraInicio(config?.hora_inicio || '08:30')
        setHoraFin(config?.hora_fin || '20:00')
        setMesesVisibles(Number(config?.meses_visibles_cliente) || 3)
        setMinutosAuto(config?.minutos_autoconfirmacion ?? 10)
        setPagosHabilitados(!!config?.pagos_habilitados)
        if (config?.cms) {
            setCms(mergeCMSContenido(config.cms))
        }
    }, [config])

    useEffect(() => {
        setListaServicios(servicios || [])
    }, [servicios])

    const marcarSincronizado = async () => {
        const ahora = new Date().toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })
        setUltimoGuardado(ahora)
        await queryClient.invalidateQueries()
        notificarCambioEnTiempoReal('all')
        router.refresh()
    }

    const handleSaveConfig = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        const wp = whatsappNumero.trim()
        if (!/^\d{10,15}$/.test(wp)) {
            toast.error('WhatsApp inválido. Ingresá entre 10 y 15 dígitos sin + ni espacios.')
            return
        }

        if (!nombreNegocio || nombreNegocio.trim().length < 2) {
            toast.error('El nombre del negocio debe tener al menos 2 caracteres.')
            return
        }

        if (horaInicio >= horaFin) {
            toast.error('La Hora de Fin debe ser posterior a la Hora de Inicio.')
            return
        }

        if (isNaN(intervaloMinutos) || intervaloMinutos < 15) {
            toast.error('El intervalo debe ser de al menos 15 minutos.')
            return
        }

        const fd = new FormData()
        fd.set('nombre_negocio', nombreNegocio.trim())
        fd.set('whatsapp_numero', wp)
        fd.set('intervalo_minutos', String(intervaloMinutos))
        fd.set('hora_inicio', horaInicio)
        fd.set('hora_fin', horaFin)
        fd.set('meses_visibles_cliente', String(mesesVisibles))
        fd.set('minutos_autoconfirmacion', String(minutosAuto))
        if (pagosHabilitados) {
            fd.set('pagos_habilitados', 'on')
        }

        setGuardandoConfig(true)
        const toastId = toast.loading('Guardando ajustes en tiempo real...')
        try {
            const res = await updateConfig(fd)
            if (res?.config) {
                setNombreNegocio(res.config.nombre_negocio)
                setWhatsappNumero(res.config.whatsapp_numero)
                setIntervaloMinutos(res.config.intervalo_minutos)
                setHoraInicio(res.config.hora_inicio)
                setHoraFin(res.config.hora_fin)
                setMesesVisibles(res.config.meses_visibles_cliente)
                setMinutosAuto(res.config.minutos_autoconfirmacion)
                setPagosHabilitados(res.config.pagos_habilitados)
            }
            await marcarSincronizado()
            toast.success(
                `¡Ajustes guardados! Nombre activo: "${nombreNegocio.trim()}"`,
                { id: toastId }
            )
        } catch (err: any) {
            toast.error(err.message || 'Error al guardar los ajustes', { id: toastId })
        } finally {
            setGuardandoConfig(false)
        }
    }

    const persistirCMS = async (nuevoCms: CMSContenido, mensajeExito = 'Contenido de la página actualizado en tiempo real') => {
        setCms(nuevoCms)
        setGuardandoCMS(true)
        const toastId = toast.loading('Aplicando cambios en la página del cliente...')
        try {
            const res = await guardarCMSContenido(nuevoCms)
            if (res?.cms) {
                setCms(res.cms)
            }
            await marcarSincronizado()
            toast.success(mensajeExito, { id: toastId })
        } catch (err: any) {
            toast.error(err.message || 'No se pudo guardar el contenido', { id: toastId })
        } finally {
            setGuardandoCMS(false)
        }
    }

    const subirArchivoMultimedia = async (
        file: File,
        onUrlReady: (url: string) => void
    ) => {
        setSubiendoArchivo(true)
        const toastId = toast.loading('Subiendo archivo multimedia...')
        try {
            const fd = new FormData()
            fd.set('file', file)
            const res = await fetch('/api/admin/upload', {
                method: 'POST',
                body: fd
            })
            const data = await res.json()
            if (!res.ok || !data.url) {
                throw new Error(data.error || 'Error al subir archivo')
            }
            onUrlReady(data.url)
            toast.success('Archivo subido correctamente. Recordá tocar Guardar Cambios.', {
                id: toastId
            })
        } catch (err: any) {
            toast.error(err.message || 'No se pudo subir el archivo', { id: toastId })
        } finally {
            setSubiendoArchivo(false)
        }
    }

    const handleSaveService = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const nServicio = (formData.get('nombre') as string)?.trim()
        const precioServicio = Number(formData.get('precio'))
        const categoria = formData.get('categoria') as string

        if (!nServicio || nServicio.length < 3) {
            toast.error('Nombre inválido (mínimo 3 caracteres)')
            return
        }
        if (!categoria) {
            toast.error('Categoría requerida')
            return
        }
        if (isNaN(precioServicio) || precioServicio <= 0) {
            toast.error('El precio debe ser mayor a $0')
            return
        }

        const toastId = toast.loading(
            editingService ? 'Guardando edición...' : 'Añadiendo servicio...'
        )
        try {
            if (editingService) {
                const res = await editServicio(editingService.id, formData)
                if (res?.servicio) {
                    setListaServicios(prev =>
                        prev.map(item =>
                            item.id === editingService.id ? (res.servicio as Servicio) : item
                        )
                    )
                }
                toast.success('Servicio actualizado en tiempo real', { id: toastId })
            } else {
                const res = await addServicio(formData)
                if (res?.servicio) {
                    setListaServicios(prev => [...prev, res.servicio as Servicio])
                }
                toast.success('Nuevo servicio añadido en tiempo real', { id: toastId })
            }
            setIsModalOpen(false)
            setEditingService(null)
            formRef.current?.reset()
            await marcarSincronizado()
        } catch (err: any) {
            toast.error(err.message || 'Error guardando el servicio', { id: toastId })
        }
    }

    const handleDeleteService = async (id: number) => {
        const toastId = toast.loading('Eliminando servicio...')
        try {
            await deleteServicio(id)
            setListaServicios(prev => prev.filter(item => item.id !== id))
            await marcarSincronizado()
            toast.success('Servicio eliminado de la lista', { id: toastId })
        } catch {
            toast.error('No se pudo eliminar el servicio', { id: toastId })
        }
    }

    const agregarSeccionPersonalizada = () => {
        const nueva: SeccionPersonalizada = {
            id: `sec_${Date.now()}`,
            visible: true,
            posicion: 'antes_servicios',
            estilo_fondo: 'perla_editorial',
            animacion: 'fade_up',
            icono_animado: 'sparkles',
            badge: 'Novedad Exclusiva',
            titulo: 'Nueva Experiencia',
            titulo_resaltado: 'Especial para Vos',
            descripcion:
                'Describí acá tu promoción, lanzamiento, video demostrativo o aviso especial para tus clientas.',
            media_tipo: 'ninguno',
            media_url: '',
            boton_texto: 'Reservar Ahora',
            boton_link: '#reserva',
            items: [
                {
                    id: `it_${Date.now()}_1`,
                    icono: '💅',
                    titulo: 'Beneficio Destacado',
                    descripcion: 'Detalle del beneficio o característica.'
                }
            ]
        }
        const nuevoCms = {
            ...cms,
            secciones_personalizadas: [...cms.secciones_personalizadas, nueva]
        }
        persistirCMS(nuevoCms, 'Nueva sección creada y publicada en la página')
    }

    const actualizarSeccionPersonalizada = (
        id: string,
        cambios: Partial<SeccionPersonalizada>
    ) => {
        setCms(prev => ({
            ...prev,
            secciones_personalizadas: prev.secciones_personalizadas.map(s =>
                s.id === id ? { ...s, ...cambios } : s
            )
        }))
    }

    const eliminarSeccionPersonalizada = (id: string) => {
        const nuevoCms = {
            ...cms,
            secciones_personalizadas: cms.secciones_personalizadas.filter(s => s.id !== id)
        }
        persistirCMS(nuevoCms, 'Sección eliminada de la página')
    }

    const inputCls =
        'w-full bg-indigo-950/50 border border-indigo-500/30 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-inner'
    const labelCls =
        'block text-xs font-bold text-indigo-200 mb-1.5 uppercase tracking-wide'

    return (
        <div className="w-full relative space-y-6">
            {/* Barra de Pestañas del Centro de Control */}
            <div className="bg-[#050b14]/90 backdrop-blur-xl rounded-2xl border border-indigo-500/25 p-2 flex flex-wrap items-center justify-between gap-2 shadow-lg">
                <div className="flex flex-wrap gap-1.5">
                    <button
                        type="button"
                        onClick={() => setTabActiva('general')}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                            tabActiva === 'general'
                                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md'
                                : 'text-indigo-200 hover:bg-indigo-950/60'
                        }`}
                    >
                        <Settings className="w-4 h-4" />
                        1. Negocio y Horarios
                    </button>
                    <button
                        type="button"
                        onClick={() => setTabActiva('servicios')}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                            tabActiva === 'servicios'
                                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md'
                                : 'text-indigo-200 hover:bg-indigo-950/60'
                        }`}
                    >
                        <Sparkles className="w-4 h-4" />
                        2. Servicios y Tarifas ({listaServicios.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setTabActiva('contenido')}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                            tabActiva === 'contenido'
                                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md'
                                : 'text-indigo-200 hover:bg-indigo-950/60'
                        }`}
                    >
                        <LayoutTemplate className="w-4 h-4" />
                        3. Editar Textos y Secciones de la Web
                    </button>
                    <button
                        type="button"
                        onClick={() => setTabActiva('secciones')}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                            tabActiva === 'secciones'
                                ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md'
                                : 'text-indigo-200 hover:bg-indigo-950/60'
                        }`}
                    >
                        <Layers className="w-4 h-4" />
                        4. Crear Nuevas Secciones ({cms.secciones_personalizadas.length})
                    </button>
                </div>

                {ultimoGuardado && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1.5 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        En vivo ({ultimoGuardado})
                    </span>
                )}
            </div>

            {/* =====================================================================
                PESTAÑA 1: NEGOCIO Y HORARIOS
               ===================================================================== */}
            {tabActiva === 'general' && (
                <div className="bg-[#050b14]/85 backdrop-blur-[40px] rounded-[2rem] border border-indigo-500/20 p-6 md:p-8 relative overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.4)]">
                    <h2 className="text-xl md:text-2xl font-bold text-white mb-6 flex items-center gap-2">
                        <Settings className="w-6 h-6 text-cyan-400" /> Ajustes Globales del Negocio
                    </h2>

                    <form
                        onSubmit={handleSaveConfig}
                        className="space-y-4 relative z-10 w-full max-w-xl"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className={labelCls}>Nombre del Negocio</label>
                                <input
                                    type="text"
                                    name="nombre_negocio"
                                    value={nombreNegocio}
                                    onChange={e => setNombreNegocio(e.target.value)}
                                    maxLength={80}
                                    className={inputCls}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className={labelCls}>
                                    Número WhatsApp (solo dígitos, sin +)
                                </label>
                                <input
                                    type="text"
                                    name="whatsapp_numero"
                                    value={whatsappNumero}
                                    onChange={e =>
                                        setWhatsappNumero(e.target.value.replace(/\D/g, ''))
                                    }
                                    placeholder="5493812345678"
                                    className={inputCls}
                                />
                            </div>
                        </div>

                        <div className="border-t border-indigo-500/15 my-4" />

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className={labelCls}>Intervalo (minutos)</label>
                                <input
                                    type="number"
                                    name="intervalo_minutos"
                                    value={intervaloMinutos}
                                    onChange={e => setIntervaloMinutos(Number(e.target.value))}
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Hora Inicio</label>
                                <input
                                    type="time"
                                    name="hora_inicio"
                                    value={horaInicio}
                                    onChange={e => setHoraInicio(e.target.value)}
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Hora Fin</label>
                                <input
                                    type="time"
                                    name="hora_fin"
                                    value={horaFin}
                                    onChange={e => setHoraFin(e.target.value)}
                                    className={inputCls}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>
                                    Meses visibles (Calendario Cliente)
                                </label>
                                <select
                                    name="meses_visibles_cliente"
                                    value={mesesVisibles}
                                    onChange={e => setMesesVisibles(Number(e.target.value))}
                                    className={inputCls}
                                >
                                    <option value={1}>1 mes (solo mes actual)</option>
                                    <option value={2}>2 meses</option>
                                    <option value={3}>3 meses</option>
                                    <option value={4}>4 meses</option>
                                    <option value={6}>6 meses</option>
                                    <option value={12}>12 meses (año completo)</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Auto-confirmación (minutos)</label>
                                <input
                                    type="number"
                                    name="minutos_autoconfirmacion"
                                    min={0}
                                    max={120}
                                    value={minutosAuto}
                                    onChange={e => setMinutosAuto(Number(e.target.value))}
                                    className={inputCls}
                                />
                            </div>
                        </div>

                        <label className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/20 cursor-pointer">
                            <div>
                                <span className="block text-sm font-bold text-indigo-200">
                                    Cobro de Seña 50% (Mercado Pago / Transferencia)
                                </span>
                                <span className="block text-xs text-indigo-300/70">
                                    Suspendido por defecto. Activarlo vuelve a mostrar el cobro al
                                    reservar.
                                </span>
                            </div>
                            <input
                                type="checkbox"
                                name="pagos_habilitados"
                                checked={pagosHabilitados}
                                onChange={e => setPagosHabilitados(e.target.checked)}
                                className="w-5 h-5 accent-cyan-400 rounded"
                            />
                        </label>

                        <button
                            type="submit"
                            disabled={guardandoConfig}
                            className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-bold py-3.5 rounded-xl hover:from-indigo-500 hover:to-cyan-500 transition shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50"
                        >
                            {guardandoConfig ? 'Guardando cambios...' : 'Guardar Configuración'}
                        </button>
                    </form>
                </div>
            )}

            {/* =====================================================================
                PESTAÑA 2: SERVICIOS Y TARIFAS
               ===================================================================== */}
            {tabActiva === 'servicios' && (
                <div className="bg-[#050b14]/85 backdrop-blur-[40px] rounded-[2rem] border border-indigo-500/20 p-6 md:p-8 relative overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.4)]">
                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                            Servicios y Tarifas ({listaServicios.length})
                        </h2>
                        <button
                            type="button"
                            onClick={() => {
                                setEditingService(null)
                                setIsModalOpen(true)
                            }}
                            className="bg-cyan-500 hover:bg-cyan-400 text-[#050b14] px-4 py-2 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)] transition flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> Añadir Servicio
                        </button>
                    </div>

                    <div className="overflow-x-auto relative z-10">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-indigo-300 text-xs font-bold uppercase bg-indigo-950/40">
                                    <th className="p-3 rounded-tl-xl tracking-wider">Nombre</th>
                                    <th className="p-3 tracking-wider">Categoría</th>
                                    <th className="p-3 tracking-wider">Precio</th>
                                    <th className="p-3 text-right rounded-tr-xl">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {listaServicios.map(s => (
                                    <tr
                                        key={s.id}
                                        className="border-b border-indigo-500/10 last:border-0 hover:bg-indigo-900/20 transition"
                                    >
                                        <td className="p-3 font-semibold text-slate-100">
                                            {s.icono && (
                                                <span className="mr-2 opacity-80">{s.icono}</span>
                                            )}
                                            {s.nombre}
                                            {s.destacado === 1 && (
                                                <span className="text-[10px] bg-fuchsia-500/20 text-fuchsia-400 px-2 py-0.5 rounded-full ml-2 border border-fuchsia-500/30 uppercase tracking-widest">
                                                    Favorito
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 text-indigo-300 font-medium">
                                            {s.categoria}
                                        </td>
                                        <td className="p-3 font-bold text-cyan-400">
                                            ${Number(s.precio).toLocaleString('es-AR')}
                                        </td>
                                        <td className="p-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingService(s)
                                                    setIsModalOpen(true)
                                                }}
                                                className="text-cyan-400 hover:bg-cyan-950/60 p-2 rounded-lg transition"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteService(s.id)}
                                                className="text-red-400 hover:bg-red-950/60 p-2 rounded-lg transition ml-1"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* =====================================================================
                PESTAÑA 3: EDITAR TEXTOS, IMÁGENES Y VISIBILIDAD DE CADA SECCIÓN
               ===================================================================== */}
            {tabActiva === 'contenido' && (
                <div className="space-y-6">
                    {/* A. Barra de Navegación y Botón Flotante */}
                    <div className="bg-[#050b14]/85 rounded-[2rem] border border-indigo-500/20 p-6 md:p-8 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-500/20 pb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                🧭 Barra de Navegación y Botón Flotante
                            </h3>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setCms(p => ({
                                            ...p,
                                            navbar: { ...p.navbar, visible: !p.navbar.visible }
                                        }))
                                    }
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                                        cms.navbar.visible
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                    }`}
                                >
                                    {cms.navbar.visible ? (
                                        <>
                                            <Eye className="w-3.5 h-3.5" /> Barra Visible
                                        </>
                                    ) : (
                                        <>
                                            <EyeOff className="w-3.5 h-3.5" /> Barra Oculta
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setCms(p => ({
                                            ...p,
                                            navbar: {
                                                ...p.navbar,
                                                mostrar_floating_cta: !p.navbar.mostrar_floating_cta
                                            }
                                        }))
                                    }
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                                        cms.navbar.mostrar_floating_cta
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                    }`}
                                >
                                    {cms.navbar.mostrar_floating_cta
                                        ? 'Botón Flotante Visible'
                                        : 'Botón Flotante Oculto'}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Texto Botón Superior</label>
                                <input
                                    type="text"
                                    value={cms.navbar.texto_boton}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            navbar: { ...p.navbar, texto_boton: e.target.value }
                                        }))
                                    }
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Texto Botón Flotante Inferior</label>
                                <input
                                    type="text"
                                    value={cms.navbar.texto_floating_cta}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            navbar: {
                                                ...p.navbar,
                                                texto_floating_cta: e.target.value
                                            }
                                        }))
                                    }
                                    className={inputCls}
                                />
                            </div>
                        </div>
                    </div>

                    {/* B. Portada Principal (Hero) */}
                    <div className="bg-[#050b14]/85 rounded-[2rem] border border-indigo-500/20 p-6 md:p-8 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-500/20 pb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                ✨ Portada Principal (Hero Section)
                            </h3>
                            <button
                                type="button"
                                onClick={() =>
                                    setCms(p => ({
                                        ...p,
                                        hero: { ...p.hero, visible: !p.hero.visible }
                                    }))
                                }
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                                    cms.hero.visible
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                }`}
                            >
                                {cms.hero.visible ? (
                                    <>
                                        <Eye className="w-3.5 h-3.5" /> Sección Visible
                                    </>
                                ) : (
                                    <>
                                        <EyeOff className="w-3.5 h-3.5" /> Sección Oculta
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="sm:col-span-2">
                                <label className={labelCls}>Insignia Superior (Badge)</label>
                                <input
                                    type="text"
                                    value={cms.hero.badge}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            hero: { ...p.hero, badge: e.target.value }
                                        }))
                                    }
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Icono Animado de Insignia</label>
                                <select
                                    value={cms.hero.icono_badge}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            hero: {
                                                ...p.hero,
                                                icono_badge: e.target.value as IconoAnimadoCMS
                                            }
                                        }))
                                    }
                                    className={inputCls}
                                >
                                    {OPCIONES_ICONOS.map(op => (
                                        <option key={op.value} value={op.value}>
                                            {op.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className={labelCls}>Título (Parte 1)</label>
                                <input
                                    type="text"
                                    value={cms.hero.titulo_parte1}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            hero: { ...p.hero, titulo_parte1: e.target.value }
                                        }))
                                    }
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>
                                    Texto Resaltado (Cursiva Oro Rosa)
                                </label>
                                <input
                                    type="text"
                                    value={cms.hero.titulo_resaltado}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            hero: { ...p.hero, titulo_resaltado: e.target.value }
                                        }))
                                    }
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Título (Parte Final)</label>
                                <input
                                    type="text"
                                    value={cms.hero.titulo_parte2}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            hero: { ...p.hero, titulo_parte2: e.target.value }
                                        }))
                                    }
                                    className={inputCls}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className={labelCls}>Cita (Inicio)</label>
                                <input
                                    type="text"
                                    value={cms.hero.cita_texto}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            hero: { ...p.hero, cita_texto: e.target.value }
                                        }))
                                    }
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Frase Subrayada Destacada</label>
                                <input
                                    type="text"
                                    value={cms.hero.cita_destacado}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            hero: { ...p.hero, cita_destacado: e.target.value }
                                        }))
                                    }
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Cita (Final)</label>
                                <input
                                    type="text"
                                    value={cms.hero.cita_final}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            hero: { ...p.hero, cita_final: e.target.value }
                                        }))
                                    }
                                    className={inputCls}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Botón Principal</label>
                                <input
                                    type="text"
                                    value={cms.hero.boton_primario}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            hero: { ...p.hero, boton_primario: e.target.value }
                                        }))
                                    }
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Botón Secundario</label>
                                <input
                                    type="text"
                                    value={cms.hero.boton_secundario}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            hero: { ...p.hero, boton_secundario: e.target.value }
                                        }))
                                    }
                                    className={inputCls}
                                />
                            </div>
                        </div>

                        {/* Imagen o Video Principal de Portada */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                            <div>
                                <label className={labelCls}>Tipo de Multimedia Principal</label>
                                <select
                                    value={cms.hero.media_principal_tipo}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            hero: {
                                                ...p.hero,
                                                media_principal_tipo: e.target.value as
                                                    | 'imagen'
                                                    | 'video'
                                            }
                                        }))
                                    }
                                    className={inputCls}
                                >
                                    <option value="imagen">🖼️ Imagen en Arco</option>
                                    <option value="video">🎬 Video en Arco (MP4/WebM)</option>
                                </select>
                            </div>
                            <div className="sm:col-span-2">
                                <label className={labelCls}>
                                    URL de Imagen/Video Principal (o subir archivo)
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={cms.hero.imagen_principal}
                                        onChange={e =>
                                            setCms(p => ({
                                                ...p,
                                                hero: {
                                                    ...p.hero,
                                                    imagen_principal: e.target.value
                                                }
                                            }))
                                        }
                                        className={inputCls}
                                    />
                                    <label className="bg-cyan-600 hover:bg-cyan-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0">
                                        <Upload className="w-4 h-4" />
                                        Subir
                                        <input
                                            type="file"
                                            accept="image/*,video/*"
                                            className="hidden"
                                            disabled={subiendoArchivo}
                                            onChange={e => {
                                                const f = e.target.files?.[0]
                                                if (f) {
                                                    subirArchivoMultimedia(f, url =>
                                                        setCms(p => ({
                                                            ...p,
                                                            hero: {
                                                                ...p.hero,
                                                                imagen_principal: url
                                                            }
                                                        }))
                                                    )
                                                }
                                            }}
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className={labelCls}>Icono Tarjeta Flotante</label>
                                <input
                                    type="text"
                                    value={cms.hero.badge_flotante_icono}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            hero: {
                                                ...p.hero,
                                                badge_flotante_icono: e.target.value
                                            }
                                        }))
                                    }
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Título Tarjeta Flotante</label>
                                <input
                                    type="text"
                                    value={cms.hero.badge_flotante_titulo}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            hero: {
                                                ...p.hero,
                                                badge_flotante_titulo: e.target.value
                                            }
                                        }))
                                    }
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Subtítulo Tarjeta Flotante</label>
                                <input
                                    type="text"
                                    value={cms.hero.badge_flotante_subtitulo}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            hero: {
                                                ...p.hero,
                                                badge_flotante_subtitulo: e.target.value
                                            }
                                        }))
                                    }
                                    className={inputCls}
                                />
                            </div>
                        </div>
                    </div>

                    {/* C. Galería Lookbook y Sección Tarifas / Promos / Cumpleaños */}
                    <div className="bg-[#050b14]/85 rounded-[2rem] border border-indigo-500/20 p-6 md:p-8 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-500/20 pb-4">
                            <h3 className="text-lg font-bold text-white">
                                💎 Sección Tarifario, Promos del Mes y Cumpleaños
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setCms(p => ({
                                            ...p,
                                            galeria: {
                                                ...p.galeria,
                                                visible: !p.galeria.visible
                                            }
                                        }))
                                    }
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                                        cms.galeria.visible
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                    }`}
                                >
                                    {cms.galeria.visible ? 'Lookbook Visible' : 'Lookbook Oculto'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setCms(p => ({
                                            ...p,
                                            servicios: {
                                                ...p.servicios,
                                                visible: !p.servicios.visible
                                            }
                                        }))
                                    }
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                                        cms.servicios.visible
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                    }`}
                                >
                                    {cms.servicios.visible
                                        ? 'Tarifario Visible'
                                        : 'Tarifario Oculto'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setCms(p => ({
                                            ...p,
                                            servicios: {
                                                ...p.servicios,
                                                mostrar_promos: !p.servicios.mostrar_promos
                                            }
                                        }))
                                    }
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                                        cms.servicios.mostrar_promos
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                    }`}
                                >
                                    {cms.servicios.mostrar_promos
                                        ? 'Promos Visible'
                                        : 'Promos Oculto'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setCms(p => ({
                                            ...p,
                                            servicios: {
                                                ...p.servicios,
                                                mostrar_cumple: !p.servicios.mostrar_cumple
                                            }
                                        }))
                                    }
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                                        cms.servicios.mostrar_cumple
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                    }`}
                                >
                                    {cms.servicios.mostrar_cumple
                                        ? 'Tarjeta Cumpleaños Visible'
                                        : 'Tarjeta Cumpleaños Oculta'}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className={labelCls}>Título Tarifario</label>
                                <input
                                    type="text"
                                    value={cms.servicios.titulo}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            servicios: { ...p.servicios, titulo: e.target.value }
                                        }))
                                    }
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Resaltado Tarifario (Oro Rosa)</label>
                                <input
                                    type="text"
                                    value={cms.servicios.titulo_resaltado}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            servicios: {
                                                ...p.servicios,
                                                titulo_resaltado: e.target.value
                                            }
                                        }))
                                    }
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Subtítulo Tarifario</label>
                                <input
                                    type="text"
                                    value={cms.servicios.subtitulo}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            servicios: {
                                                ...p.servicios,
                                                subtitulo: e.target.value
                                            }
                                        }))
                                    }
                                    className={inputCls}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Título Tarjeta Cumpleaños</label>
                                <input
                                    type="text"
                                    value={cms.servicios.titulo_cumple_resaltado}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            servicios: {
                                                ...p.servicios,
                                                titulo_cumple_resaltado: e.target.value
                                            }
                                        }))
                                    }
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Descripción Tarjeta Cumpleaños</label>
                                <input
                                    type="text"
                                    value={cms.servicios.texto_cumple}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            servicios: {
                                                ...p.servicios,
                                                texto_cumple: e.target.value
                                            }
                                        }))
                                    }
                                    className={inputCls}
                                />
                            </div>
                        </div>
                    </div>

                    {/* D. Agenda y Pie de Página */}
                    <div className="bg-[#050b14]/85 rounded-[2rem] border border-indigo-500/20 p-6 md:p-8 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-500/20 pb-4">
                            <h3 className="text-lg font-bold text-white">
                                📅 Sección Agenda de Turnos y Pie de Página
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setCms(p => ({
                                            ...p,
                                            reserva: {
                                                ...p.reserva,
                                                visible: !p.reserva.visible
                                            }
                                        }))
                                    }
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                                        cms.reserva.visible
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                    }`}
                                >
                                    {cms.reserva.visible ? 'Agenda Visible' : 'Agenda Oculta'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setCms(p => ({
                                            ...p,
                                            footer: { ...p.footer, visible: !p.footer.visible }
                                        }))
                                    }
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                                        cms.footer.visible
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                    }`}
                                >
                                    {cms.footer.visible ? 'Footer Visible' : 'Footer Oculto'}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Título Sección Agenda</label>
                                <input
                                    type="text"
                                    value={cms.reserva.titulo}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            reserva: { ...p.reserva, titulo: e.target.value }
                                        }))
                                    }
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Subtítulo Agenda</label>
                                <input
                                    type="text"
                                    value={cms.reserva.subtitulo}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            reserva: { ...p.reserva, subtitulo: e.target.value }
                                        }))
                                    }
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Ubicación (Pie de Página)</label>
                                <input
                                    type="text"
                                    value={cms.footer.ubicacion}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            footer: { ...p.footer, ubicacion: e.target.value }
                                        }))
                                    }
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Texto Derechos Reservados</label>
                                <input
                                    type="text"
                                    value={cms.footer.derechos}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            footer: { ...p.footer, derechos: e.target.value }
                                        }))
                                    }
                                    className={inputCls}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        disabled={guardandoCMS}
                        onClick={() => persistirCMS(cms)}
                        className="w-full bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold py-4 rounded-2xl shadow-xl transition disabled:opacity-50"
                    >
                        {guardandoCMS
                            ? 'Publicando cambios en tiempo real...'
                            : '💾 Guardar y Publicar Todo el Contenido en Tiempo Real'}
                    </button>
                </div>
            )}

            {/* =====================================================================
                PESTAÑA 4: CREADOR DE NUEVAS SECCIONES (IMÁGENES, VIDEOS, ANIMACIONES)
               ===================================================================== */}
            {tabActiva === 'secciones' && (
                <div className="space-y-6">
                    <div className="bg-[#050b14]/85 rounded-[2rem] border border-indigo-500/20 p-6 md:p-8 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl md:text-2xl font-bold text-white mb-1 flex items-center gap-2">
                                <Layers className="w-6 h-6 text-rose-400" /> Constructor de
                                Secciones Personalizadas
                            </h2>
                            <p className="text-xs sm:text-sm text-indigo-200/80">
                                Creá nuevas secciones con textos resaltados, imágenes, videos,
                                iconos animados y animaciones de revista en cualquier parte de la
                                página.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={agregarSeccionPersonalizada}
                            className="bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold px-5 py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> Crear Nueva Sección
                        </button>
                    </div>

                    {cms.secciones_personalizadas.length === 0 ? (
                        <div className="bg-[#050b14]/70 rounded-[2rem] border border-indigo-500/20 p-12 text-center text-indigo-200/70">
                            <p className="text-base font-bold text-white mb-2">
                                Aún no creaste secciones personalizadas adicionales
                            </p>
                            <p className="text-xs max-w-md mx-auto mb-5">
                                Tocá &ldquo;Crear Nueva Sección&rdquo; para agregar un bloque con
                                imágenes, videos, consejos de cuidado de uñas, promociones o avisos
                                especiales.
                            </p>
                        </div>
                    ) : (
                        cms.secciones_personalizadas.map((sec, idx) => (
                            <div
                                key={sec.id}
                                className="bg-[#050b14]/90 rounded-[2rem] border border-indigo-500/30 p-6 md:p-8 space-y-4 shadow-xl"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-500/20 pb-4">
                                    <span className="text-base font-bold text-white">
                                        Sección #{idx + 1}: {sec.titulo} {sec.titulo_resaltado}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                actualizarSeccionPersonalizada(sec.id, {
                                                    visible: !sec.visible
                                                })
                                            }
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                                                sec.visible
                                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                            }`}
                                        >
                                            {sec.visible ? (
                                                <>
                                                    <Eye className="w-3.5 h-3.5" /> Visible
                                                </>
                                            ) : (
                                                <>
                                                    <EyeOff className="w-3.5 h-3.5" /> Oculta
                                                </>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => eliminarSeccionPersonalizada(sec.id)}
                                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/40 flex items-center gap-1"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> Eliminar
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                    <div>
                                        <label className={labelCls}>Ubicación en la Página</label>
                                        <select
                                            value={sec.posicion}
                                            onChange={e =>
                                                actualizarSeccionPersonalizada(sec.id, {
                                                    posicion: e.target.value as any
                                                })
                                            }
                                            className={inputCls}
                                        >
                                            <option value="antes_servicios">
                                                Arriba del Tarifario
                                            </option>
                                            <option value="despues_servicios">
                                                Debajo del Tarifario
                                            </option>
                                            <option value="despues_reserva">
                                                Debajo de la Agenda
                                            </option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Estilo Visual</label>
                                        <select
                                            value={sec.estilo_fondo}
                                            onChange={e =>
                                                actualizarSeccionPersonalizada(sec.id, {
                                                    estilo_fondo: e.target.value as EstiloFondoCMS
                                                })
                                            }
                                            className={inputCls}
                                        >
                                            {OPCIONES_ESTILO.map(op => (
                                                <option key={op.value} value={op.value}>
                                                    {op.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Animación Premium</label>
                                        <select
                                            value={sec.animacion}
                                            onChange={e =>
                                                actualizarSeccionPersonalizada(sec.id, {
                                                    animacion: e.target.value as AnimacionPremiumCMS
                                                })
                                            }
                                            className={inputCls}
                                        >
                                            {OPCIONES_ANIMACION.map(op => (
                                                <option key={op.value} value={op.value}>
                                                    {op.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Icono Animado</label>
                                        <select
                                            value={sec.icono_animado}
                                            onChange={e =>
                                                actualizarSeccionPersonalizada(sec.id, {
                                                    icono_animado: e.target.value as IconoAnimadoCMS
                                                })
                                            }
                                            className={inputCls}
                                        >
                                            {OPCIONES_ICONOS.map(op => (
                                                <option key={op.value} value={op.value}>
                                                    {op.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className={labelCls}>Insignia Superior</label>
                                        <input
                                            type="text"
                                            value={sec.badge}
                                            onChange={e =>
                                                actualizarSeccionPersonalizada(sec.id, {
                                                    badge: e.target.value
                                                })
                                            }
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Título Principal</label>
                                        <input
                                            type="text"
                                            value={sec.titulo}
                                            onChange={e =>
                                                actualizarSeccionPersonalizada(sec.id, {
                                                    titulo: e.target.value
                                                })
                                            }
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>
                                            Texto Resaltado (Oro Rosa)
                                        </label>
                                        <input
                                            type="text"
                                            value={sec.titulo_resaltado}
                                            onChange={e =>
                                                actualizarSeccionPersonalizada(sec.id, {
                                                    titulo_resaltado: e.target.value
                                                })
                                            }
                                            className={inputCls}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className={labelCls}>Descripción / Contenido</label>
                                    <textarea
                                        rows={3}
                                        value={sec.descripcion}
                                        onChange={e =>
                                            actualizarSeccionPersonalizada(sec.id, {
                                                descripcion: e.target.value
                                            })
                                        }
                                        className={inputCls}
                                    />
                                </div>

                                {/* Imagen o Video de la sección */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className={labelCls}>Imagen o Video</label>
                                        <select
                                            value={sec.media_tipo}
                                            onChange={e =>
                                                actualizarSeccionPersonalizada(sec.id, {
                                                    media_tipo: e.target.value as any
                                                })
                                            }
                                            className={inputCls}
                                        >
                                            <option value="ninguno">Solo Texto y Tarjetas</option>
                                            <option value="imagen">🖼️ Con Imagen</option>
                                            <option value="video">🎬 Con Video (MP4/WebM)</option>
                                        </select>
                                    </div>
                                    {sec.media_tipo !== 'ninguno' && (
                                        <div className="sm:col-span-2">
                                            <label className={labelCls}>
                                                URL de {sec.media_tipo} (o subir desde tu PC/celular)
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={sec.media_url}
                                                    onChange={e =>
                                                        actualizarSeccionPersonalizada(sec.id, {
                                                            media_url: e.target.value
                                                        })
                                                    }
                                                    placeholder="https://... o subí un archivo"
                                                    className={inputCls}
                                                />
                                                <label className="bg-cyan-600 hover:bg-cyan-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0">
                                                    {sec.media_tipo === 'video' ? (
                                                        <Film className="w-4 h-4" />
                                                    ) : (
                                                        <ImageIcon className="w-4 h-4" />
                                                    )}
                                                    Subir
                                                    <input
                                                        type="file"
                                                        accept={
                                                            sec.media_tipo === 'video'
                                                                ? 'video/*'
                                                                : 'image/*'
                                                        }
                                                        className="hidden"
                                                        disabled={subiendoArchivo}
                                                        onChange={e => {
                                                            const f = e.target.files?.[0]
                                                            if (f) {
                                                                subirArchivoMultimedia(f, url =>
                                                                    actualizarSeccionPersonalizada(
                                                                        sec.id,
                                                                        { media_url: url }
                                                                    )
                                                                )
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>
                                            Texto del Botón (opcional)
                                        </label>
                                        <input
                                            type="text"
                                            value={sec.boton_texto || ''}
                                            onChange={e =>
                                                actualizarSeccionPersonalizada(sec.id, {
                                                    boton_texto: e.target.value
                                                })
                                            }
                                            placeholder="Ej: Reservar esta promo"
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Enlace del Botón</label>
                                        <input
                                            type="text"
                                            value={sec.boton_link || '#reserva'}
                                            onChange={e =>
                                                actualizarSeccionPersonalizada(sec.id, {
                                                    boton_link: e.target.value
                                                })
                                            }
                                            placeholder="#reserva o https://wa.me/..."
                                            className={inputCls}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}

                    {cms.secciones_personalizadas.length > 0 && (
                        <button
                            type="button"
                            disabled={guardandoCMS}
                            onClick={() =>
                                persistirCMS(
                                    cms,
                                    'Secciones personalizadas actualizadas en tiempo real'
                                )
                            }
                            className="w-full bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold py-4 rounded-2xl shadow-xl transition disabled:opacity-50"
                        >
                            {guardandoCMS
                                ? 'Guardando secciones...'
                                : '💾 Guardar Cambios en Secciones Personalizadas'}
                        </button>
                    )}
                </div>
            )}

            {/* Modal para Añadir / Editar Servicio */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-end md:items-center justify-center animate-in fade-in duration-200">
                    <div
                        className="absolute inset-0 bg-indigo-950/20"
                        onClick={() => {
                            setIsModalOpen(false)
                            setEditingService(null)
                            formRef.current?.reset()
                        }}
                    />
                    <div className="bg-[#050b14] border border-indigo-500/30 rounded-t-3xl md:rounded-[2rem] w-full max-w-lg shadow-2xl p-6 pb-28 md:p-8 relative max-h-[85dvh] md:max-h-[90vh] overflow-y-auto">
                        <h3 className="text-2xl font-bold mb-6 text-white tracking-tight flex items-center gap-3">
                            {editingService ? (
                                <Edit2 className="text-cyan-400" />
                            ) : (
                                <Plus className="text-cyan-400" />
                            )}
                            {editingService ? 'Editar Servicio' : 'Nuevo Servicio'}
                        </h3>
                        <form ref={formRef} onSubmit={handleSaveService} className="space-y-4">
                            <div>
                                <label className={labelCls}>Categoría</label>
                                <select
                                    name="categoria"
                                    defaultValue={
                                        editingService?.categoria || 'Servicios Base (Lisas)'
                                    }
                                    className={inputCls}
                                >
                                    <option value="Servicios Base (Lisas)">
                                        Servicios Base (Lisas)
                                    </option>
                                    <option value="Con 2 Decos Simples">
                                        Con 2 Decos Simples
                                    </option>
                                    <option value="Adicionales & Nail Art">
                                        Adicionales &amp; Nail Art
                                    </option>
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Nombre del Servicio *</label>
                                <input
                                    type="text"
                                    name="nombre"
                                    defaultValue={editingService?.nombre || ''}
                                    placeholder="Ej: Semi con Deco básica"
                                    required
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Subtítulo Corto</label>
                                <input
                                    type="text"
                                    name="subtitulo"
                                    defaultValue={editingService?.subtitulo || ''}
                                    placeholder="Ej: Uñas esculpidas en gel"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Descripción</label>
                                <textarea
                                    name="descripcion"
                                    defaultValue={editingService?.descripcion || ''}
                                    rows={2}
                                    className={inputCls}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Precio * (Sin $)</label>
                                    <input
                                        type="number"
                                        name="precio"
                                        defaultValue={editingService?.precio || ''}
                                        placeholder="12000"
                                        required
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Emoji / Icono</label>
                                    <input
                                        type="text"
                                        name="icono"
                                        defaultValue={editingService?.icono || ''}
                                        placeholder="💅"
                                        className={inputCls}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-3 mt-4 p-3.5 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20">
                                <input
                                    type="checkbox"
                                    name="destacado"
                                    id="destacado"
                                    defaultChecked={editingService?.destacado === 1}
                                    className="w-5 h-5 accent-fuchsia-500 rounded"
                                />
                                <label
                                    htmlFor="destacado"
                                    className="font-semibold text-sm text-fuchsia-200"
                                >
                                    Resaltar con insignia &ldquo;Favorito&rdquo;
                                </label>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsModalOpen(false)
                                        setEditingService(null)
                                        formRef.current?.reset()
                                    }}
                                    className="flex-1 bg-indigo-950 text-indigo-200 border border-indigo-500/30 font-bold py-3 rounded-xl hover:bg-indigo-900 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-bold py-3 rounded-xl hover:from-cyan-500 hover:to-indigo-500 transition shadow-md"
                                >
                                    {editingService ? 'Actualizar' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
