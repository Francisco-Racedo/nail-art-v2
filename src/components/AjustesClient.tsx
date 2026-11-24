'use client'

import React, { useRef, useState, useEffect } from 'react'
import {
    Settings,
    Sparkles,
    LayoutTemplate,
    Layers,
    CheckCircle2
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
    SeccionPersonalizada
} from '@/lib/cms-types'

// Componentes modulares de Ajustes
import TabNegocio from '@/components/admin/ajustes/TabNegocio'
import TabServicios, { Servicio } from '@/components/admin/ajustes/TabServicios'
import TabCMSVisual from '@/components/admin/ajustes/TabCMSVisual'
import TabSeccionesCustom from '@/components/admin/ajustes/TabSeccionesCustom'
import { ConfirmBottomSheetModal } from '@/components/ui/BottomSheetModal'

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

    // 1. Estado de Ajustes de Negocio
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

    // 2. Estado de Catálogo de Servicios
    const [listaServicios, setListaServicios] = useState<Servicio[]>(servicios || [])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingService, setEditingService] = useState<Servicio | null>(null)
    const formRef = useRef<HTMLFormElement>(null)

    // 3. Estado de Personalización Visual CMS
    // IMPORTANTE: No sobrescribir `cms` ni los inputs del formulario en un useEffect([config])
    // ante refrescos en segundo plano del servidor, para que los textos que el administrador
    // está escribiendo nunca se borren ni se reinicien solos antes de guardar.
    const [cms, setCms] = useState<CMSContenido>(() =>
        mergeCMSContenido(config?.cms || DEFAULT_CMS_CONTENIDO)
    )
    const [guardandoCMS, setGuardandoCMS] = useState(false)
    const [subiendoArchivo, setSubiendoArchivo] = useState(false)
    const [seccionIdAEliminar, setSeccionIdAEliminar] = useState<string | null>(null)

    useEffect(() => {
        if (!isModalOpen && Array.isArray(servicios)) {
            setListaServicios(servicios)
        }
    }, [servicios, isModalOpen])

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

    const persistirCMS = async (
        nuevoCms: CMSContenido,
        mensajeExito = 'Página web actualizada en tiempo real'
    ) => {
        setCms(nuevoCms)
        setGuardandoCMS(true)
        const toastId = toast.loading('Publicando cambios en la página del cliente...')
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
            editingService ? 'Guardando cambios del servicio...' : 'Añadiendo nuevo servicio...'
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
                toast.success('Servicio actualizado con éxito', { id: toastId })
            } else {
                const res = await addServicio(formData)
                if (res?.servicio) {
                    setListaServicios(prev => [...prev, res.servicio as Servicio])
                }
                toast.success('Nuevo servicio agregado al catálogo', { id: toastId })
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
        setSeccionIdAEliminar(id)
    }

    const confirmarEliminarSeccion = () => {
        if (!seccionIdAEliminar) return
        const id = seccionIdAEliminar
        setSeccionIdAEliminar(null)
        const nuevoCms = {
            ...cms,
            secciones_personalizadas: cms.secciones_personalizadas.filter(s => s.id !== id)
        }
        persistirCMS(nuevoCms, 'Sección eliminada de la página')
    }

    return (
        <div className="w-full relative space-y-6">
            {/* Barra de Pestañas Principal de Ajustes */}
            <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-stone-200/90 p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => setTabActiva('general')}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                            tabActiva === 'general'
                                ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 text-white shadow-md shadow-rose-500/20'
                                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/80'
                        }`}
                    >
                        <Settings className="w-4 h-4" />
                        1. Negocio & Horarios
                    </button>

                    <button
                        type="button"
                        onClick={() => setTabActiva('servicios')}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                            tabActiva === 'servicios'
                                ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 text-white shadow-md shadow-rose-500/20'
                                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/80'
                        }`}
                    >
                        <Sparkles className="w-4 h-4" />
                        2. Servicios & Tarifas ({listaServicios.length})
                    </button>

                    <button
                        type="button"
                        onClick={() => setTabActiva('contenido')}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                            tabActiva === 'contenido'
                                ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 text-white shadow-md shadow-rose-500/20'
                                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/80'
                        }`}
                    >
                        <LayoutTemplate className="w-4 h-4" />
                        3. Textos & Diseño Web
                    </button>

                    <button
                        type="button"
                        onClick={() => setTabActiva('secciones')}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                            tabActiva === 'secciones'
                                ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 text-white shadow-md shadow-rose-500/20'
                                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/80'
                        }`}
                    >
                        <Layers className="w-4 h-4" />
                        4. Nuevas Secciones ({cms.secciones_personalizadas.length})
                    </button>
                </div>

                {ultimoGuardado && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Sincronizado en vivo ({ultimoGuardado})
                    </span>
                )}
            </div>

            {/* PESTAÑA 1: Negocio y Horarios */}
            {tabActiva === 'general' && (
                <TabNegocio
                    nombreNegocio={nombreNegocio}
                    setNombreNegocio={setNombreNegocio}
                    whatsappNumero={whatsappNumero}
                    setWhatsappNumero={setWhatsappNumero}
                    intervaloMinutos={intervaloMinutos}
                    setIntervaloMinutos={setIntervaloMinutos}
                    horaInicio={horaInicio}
                    setHoraInicio={setHoraInicio}
                    horaFin={horaFin}
                    setHoraFin={setHoraFin}
                    mesesVisibles={mesesVisibles}
                    setMesesVisibles={setMesesVisibles}
                    minutosAuto={minutosAuto}
                    setMinutosAuto={setMinutosAuto}
                    pagosHabilitados={pagosHabilitados}
                    setPagosHabilitados={setPagosHabilitados}
                    guardandoConfig={guardandoConfig}
                    handleSaveConfig={handleSaveConfig}
                />
            )}

            {/* PESTAÑA 2: Servicios y Tarifas */}
            {tabActiva === 'servicios' && (
                <TabServicios
                    servicios={listaServicios}
                    onSaveService={handleSaveService}
                    onDeleteService={handleDeleteService}
                    editingService={editingService}
                    setEditingService={setEditingService}
                    isModalOpen={isModalOpen}
                    setIsModalOpen={setIsModalOpen}
                    formRef={formRef}
                />
            )}

            {/* PESTAÑA 3: Personalización Visual CMS */}
            {tabActiva === 'contenido' && (
                <TabCMSVisual
                    cms={cms}
                    setCms={setCms}
                    subirArchivoMultimedia={subirArchivoMultimedia}
                    subiendoArchivo={subiendoArchivo}
                    guardandoCMS={guardandoCMS}
                    persistirCMS={persistirCMS}
                    nombreNegocio={nombreNegocio}
                />
            )}

            {/* PESTAÑA 4: Secciones Personalizadas */}
            {tabActiva === 'secciones' && (
                <TabSeccionesCustom
                    cms={cms}
                    setCms={setCms}
                    subirArchivoMultimedia={subirArchivoMultimedia}
                    subiendoArchivo={subiendoArchivo}
                    guardandoCMS={guardandoCMS}
                    persistirCMS={persistirCMS}
                    agregarSeccionPersonalizada={agregarSeccionPersonalizada}
                    actualizarSeccionPersonalizada={actualizarSeccionPersonalizada}
                    eliminarSeccionPersonalizada={eliminarSeccionPersonalizada}
                />
            )}

            <ConfirmBottomSheetModal
                isOpen={!!seccionIdAEliminar}
                onClose={() => setSeccionIdAEliminar(null)}
                onConfirm={confirmarEliminarSeccion}
                title="¿Eliminar esta sección de la web?"
                description="La sección personalizada se quitará inmediatamente de la página pública del salón."
                confirmLabel="Sí, Eliminar Sección"
                cancelLabel="Cancelar"
                variant="danger"
            />
        </div>
    )
}
