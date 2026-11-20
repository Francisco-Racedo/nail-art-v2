'use client'

import React, { useState, useMemo } from 'react'
import {
    Sparkles,
    Plus,
    Trash2,
    Edit2,
    Search,
    ChevronDown,
    X,
    Eye,
    DollarSign
} from 'lucide-react'
import BottomSheetModal, { ConfirmBottomSheetModal } from '@/components/ui/BottomSheetModal'

export interface Servicio {
    id: number
    nombre: string
    categoria: string
    precio: number
    icono: string
    destacado: number
    subtitulo?: string
    descripcion?: string
}

interface TabServiciosProps {
    servicios: Servicio[]
    onSaveService: (e: React.FormEvent<HTMLFormElement>) => Promise<void>
    onDeleteService: (id: number) => Promise<void>
    editingService: Servicio | null
    setEditingService: (s: Servicio | null) => void
    isModalOpen: boolean
    setIsModalOpen: (open: boolean) => void
    formRef: React.RefObject<HTMLFormElement | null>
}

const CATEGORIAS = [
    'Todas',
    'Servicios Base (Lisas)',
    'Con 2 Decos Simples',
    'Adicionales & Nail Art'
]

export default function TabServicios({
    servicios,
    onSaveService,
    onDeleteService,
    editingService,
    setEditingService,
    isModalOpen,
    setIsModalOpen,
    formRef
}: TabServiciosProps) {
    const [categoriaActiva, setCategoriaActiva] = useState('Todas')
    const [busqueda, setBusqueda] = useState('')
    const [serviceToDelete, setServiceToDelete] = useState<Servicio | null>(null)
    const [deleting, setDeleting] = useState(false)

    // Estado temporal para el Live Preview dentro del Modal
    const [previewNombre, setPreviewNombre] = useState('')
    const [previewSubtitulo, setPreviewSubtitulo] = useState('')
    const [previewPrecio, setPreviewPrecio] = useState<number | string>('')
    const [previewCategoria, setPreviewCategoria] = useState('')
    const [previewDescripcion, setPreviewDescripcion] = useState('')
    const [previewDestacado, setPreviewDestacado] = useState(false)
    const [previewIcono, setPreviewIcono] = useState('💅')
    const [previewExpanded, setPreviewExpanded] = useState(false)

    // Al abrir el modal para editar, inicializamos el preview con los datos del servicio
    const openAddModal = () => {
        setEditingService(null)
        setPreviewNombre('Kapping Gel con Francesitas')
        setPreviewSubtitulo('Refuerzo de uña natural con deco delicada')
        setPreviewPrecio('24000')
        setPreviewCategoria('Con 2 Decos Simples')
        setPreviewDescripcion(
            'Incluye nivelación de uña natural, esmaltado semipermanente y francesitas en 2 uñas.'
        )
        setPreviewDestacado(true)
        setPreviewIcono('💅')
        setIsModalOpen(true)
    }

    const openEditModal = (s: Servicio) => {
        setEditingService(s)
        setPreviewNombre(s.nombre)
        setPreviewSubtitulo(s.subtitulo || '')
        setPreviewPrecio(s.precio)
        setPreviewCategoria(s.categoria)
        setPreviewDescripcion(s.descripcion || '')
        setPreviewDestacado(s.destacado === 1)
        setPreviewIcono(s.icono || '💅')
        setIsModalOpen(true)
    }

    const serviciosFiltrados = useMemo(() => {
        return servicios.filter(s => {
            const matchesCat = categoriaActiva === 'Todas' || s.categoria === categoriaActiva
            const matchesSearch =
                s.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                (s.subtitulo && s.subtitulo.toLowerCase().includes(busqueda.toLowerCase())) ||
                s.categoria.toLowerCase().includes(busqueda.toLowerCase())
            return matchesCat && matchesSearch
        })
    }, [servicios, categoriaActiva, busqueda])

    const handleConfirmDelete = async () => {
        if (!serviceToDelete) return
        setDeleting(true)
        try {
            await onDeleteService(serviceToDelete.id)
        } finally {
            setDeleting(false)
            setServiceToDelete(null)
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header del Catálogo con Buscador y Filtros */}
            <div className="bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-stone-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-black text-stone-900">
                                    Catálogo de Servicios & Tarifario
                                </h3>
                                <span className="bg-stone-100 text-stone-700 font-bold text-xs px-2.5 py-0.5 rounded-full border border-stone-200">
                                    {servicios.length} activos
                                </span>
                            </div>
                            <p className="text-xs text-stone-500">
                                Administrá los tratamientos visibles en la lista de precios y en la reserva del cliente.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={openAddModal}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 shadow-md shadow-rose-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo Servicio
                    </button>
                </div>

                {/* Filtros por Categoría y Buscador */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {CATEGORIAS.map(cat => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setCategoriaActiva(cat)}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                                    categoriaActiva === cat
                                        ? 'bg-rose-500 text-white shadow-xs'
                                        : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200/80'
                                }`}
                            >
                                {cat}
                                {cat !== 'Todas' && (
                                    <span className="ml-1.5 opacity-70">
                                        ({servicios.filter(s => s.categoria === cat).length})
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="relative min-w-[240px]">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                            type="text"
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                            placeholder="Buscar por nombre o categoría..."
                            className="w-full pl-9 pr-3.5 py-2 bg-stone-50 border border-stone-200/90 rounded-xl text-xs text-stone-800 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                        />
                        {busqueda && (
                            <button
                                type="button"
                                onClick={() => setBusqueda('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Listado de Servicios Estilizado */}
            <div className="bg-white border border-stone-200/90 rounded-3xl overflow-hidden shadow-xs">
                {serviciosFiltrados.length === 0 ? (
                    <div className="p-12 text-center">
                        <Sparkles className="w-8 h-8 text-stone-300 mx-auto mb-3" />
                        <p className="text-sm font-bold text-stone-700">No se encontraron servicios</p>
                        <p className="text-xs text-stone-400 mt-1">
                            Probá cambiando el filtro o agregando un nuevo servicio al catálogo.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-stone-100">
                        {serviciosFiltrados.map(s => (
                            <div
                                key={s.id}
                                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50/80 transition-colors"
                            >
                                <div className="flex items-start sm:items-center gap-3.5">
                                    <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200/70 flex items-center justify-center text-lg shrink-0">
                                        {s.icono || '💅'}
                                    </div>
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-bold text-sm sm:text-base text-stone-900">
                                                {s.nombre}
                                            </span>
                                            {s.destacado === 1 && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-xs">
                                                    <Sparkles className="w-2.5 h-2.5" /> Favorito
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                            <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                                                {s.categoria}
                                            </span>
                                            {s.subtitulo && (
                                                <span className="text-xs text-stone-500">
                                                    • {s.subtitulo}
                                                </span>
                                            )}
                                        </div>
                                        {s.descripcion && (
                                            <p className="text-xs text-stone-400 mt-1 max-w-xl line-clamp-1">
                                                {s.descripcion}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-13 sm:pl-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100">
                                    <div className="text-right">
                                        <span className="font-editorial font-bold text-rose-700 text-xl sm:text-2xl tracking-tight bg-rose-50/90 border border-rose-200/70 px-3 py-1 rounded-xl">
                                            ${Number(s.precio).toLocaleString('es-AR')}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => openEditModal(s)}
                                            className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition cursor-pointer"
                                            title="Editar Servicio"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setServiceToDelete(s)}
                                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition cursor-pointer"
                                            title="Eliminar Servicio"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Slide-Up Luxury para Añadir / Editar Servicio con LIVE CARD PREVIEW */}
            <BottomSheetModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    setEditingService(null)
                }}
                maxWidthClass="max-w-2xl"
                headerClassName="bg-gradient-to-r from-rose-50/70 via-pink-50/40 to-white"
                icon={
                    <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                        {editingService ? (
                            <Edit2 className="w-5 h-5" />
                        ) : (
                            <Plus className="w-5 h-5" />
                        )}
                    </div>
                }
                title={editingService ? 'Editar Servicio' : 'Nuevo Servicio'}
                subtitle="Completá los detalles y observá el aspecto final en la vista previa."
                footer={
                    <div className="flex items-center justify-end gap-2.5 w-full">
                        <button
                            type="button"
                            onClick={() => {
                                setIsModalOpen(false)
                                setEditingService(null)
                            }}
                            className="flex-1 sm:flex-initial px-5 py-3 rounded-xl text-xs sm:text-sm font-bold text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 transition cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            form="form-servicio-catalogo"
                            className="flex-1 sm:flex-initial px-6 py-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider text-white bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 shadow-md shadow-rose-500/20 transition cursor-pointer"
                        >
                            {editingService ? 'Guardar Cambios' : 'Añadir al Catálogo'}
                        </button>
                    </div>
                }
            >
                <div className="space-y-5">
                    {/* LIVE CARD PREVIEW — Aspecto real tal como lo verá el cliente */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF6F2] border border-rose-200/80 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-rose-700">
                                <Eye className="w-3.5 h-3.5 shrink-0" />
                                Vista Previa en Vivo (Lista de Precios del Cliente)
                            </span>
                            <span className="text-[10px] text-stone-500 font-medium text-right">
                                Toca la tarjeta para probar el acordeón
                            </span>
                        </div>

                        {/* Tarjeta idéntica a ListaDePrecios */}
                        <div
                            onClick={() => setPreviewExpanded(v => !v)}
                            className="bg-white/95 rounded-2xl border border-rose-200/80 cursor-pointer flex overflow-hidden shadow-sm hover:border-rose-300 transition-all"
                        >
                            <div className="w-1.5 bg-gradient-to-b from-rose-400 via-pink-400 to-amber-300 shrink-0" />
                            <div className="p-4 sm:p-5 flex-1">
                                <div className="flex justify-between items-start gap-3">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-lg mr-1">
                                                {previewIcono || '💅'}
                                            </span>
                                            <p className="font-editorial font-bold text-[#231C19] text-lg sm:text-2xl tracking-tight">
                                                {previewNombre || 'Nombre del Servicio'}
                                            </p>
                                            {previewDestacado && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 text-white text-[10px] font-bold uppercase tracking-widest shadow-xs">
                                                    <Sparkles className="w-2.5 h-2.5" /> Favorito
                                                </span>
                                            )}
                                        </div>
                                        {previewSubtitulo && (
                                            <p className="text-stone-500 font-medium text-xs mt-1 tracking-wide">
                                                {previewSubtitulo}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="font-editorial font-bold text-rose-700 text-lg sm:text-2xl tracking-tight bg-rose-50/90 border border-rose-200/70 px-3 py-1 rounded-xl">
                                            ${Number(previewPrecio || 0).toLocaleString('es-AR')}
                                        </span>
                                        {previewDescripcion && (
                                            <ChevronDown
                                                className={`w-4 h-4 text-stone-400 transition-transform ${
                                                    previewExpanded
                                                        ? 'rotate-180 text-rose-500'
                                                        : ''
                                                }`}
                                            />
                                        )}
                                    </div>
                                </div>

                                {previewDescripcion && previewExpanded && (
                                    <p className="mt-3 pt-2.5 border-t border-rose-200/50 text-xs text-stone-600 leading-relaxed">
                                        {previewDescripcion}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Formulario de Alta / Modificación */}
                    <form
                        id="form-servicio-catalogo"
                        ref={formRef}
                        onSubmit={onSaveService}
                        className="space-y-4"
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                                    Categoría *
                                </label>
                                <select
                                    name="categoria"
                                    value={previewCategoria}
                                    onChange={e => setPreviewCategoria(e.target.value)}
                                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
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
                                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                                    Emoji / Icono
                                </label>
                                <input
                                    type="text"
                                    name="icono"
                                    value={previewIcono}
                                    onChange={e => setPreviewIcono(e.target.value)}
                                    placeholder="💅"
                                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                                Nombre del Servicio *
                            </label>
                            <input
                                type="text"
                                name="nombre"
                                value={previewNombre}
                                onChange={e => setPreviewNombre(e.target.value)}
                                placeholder="Ej: Kapping Gel con 2 Decos Simples"
                                required
                                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                                    Subtítulo Corto
                                </label>
                                <input
                                    type="text"
                                    name="subtitulo"
                                    value={previewSubtitulo}
                                    onChange={e => setPreviewSubtitulo(e.target.value)}
                                    placeholder="Ej: Incluye nivelación y francesitas"
                                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                                    Precio (ARS sin $) *
                                </label>
                                <div className="relative">
                                    <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                                    <input
                                        type="number"
                                        name="precio"
                                        value={previewPrecio}
                                        onChange={e => setPreviewPrecio(e.target.value)}
                                        placeholder="24000"
                                        required
                                        min="0"
                                        className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                                Descripción Detallada (desplegable para clientas)
                            </label>
                            <textarea
                                name="descripcion"
                                value={previewDescripcion}
                                onChange={e => setPreviewDescripcion(e.target.value)}
                                rows={2}
                                placeholder="Explicá qué incluye, tipo de técnica, esmaltado o recomendaciones..."
                                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs font-medium text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                            />
                        </div>

                        <label className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 cursor-pointer">
                            <input
                                type="checkbox"
                                name="destacado"
                                checked={previewDestacado}
                                onChange={e => setPreviewDestacado(e.target.checked)}
                                className="w-4 h-4 accent-amber-500 rounded"
                            />
                            <div>
                                <span className="block text-xs font-bold text-stone-900">
                                    Destacar como &ldquo;Favorito&rdquo;
                                </span>
                                <span className="block text-[11px] text-stone-500">
                                    Agrega una insignia dorada y resalta el tratamiento en la lista de precios.
                                </span>
                            </div>
                        </label>
                    </form>
                </div>
            </BottomSheetModal>

            {/* Modal Slide-Up de Confirmación para Eliminar Servicio (Reemplaza al confirm nativo del navegador) */}
            <ConfirmBottomSheetModal
                isOpen={!!serviceToDelete}
                onClose={() => !deleting && setServiceToDelete(null)}
                onConfirm={handleConfirmDelete}
                loading={deleting}
                title={`¿Eliminar "${serviceToDelete?.nombre || 'este servicio'}"?`}
                description="Este tratamiento se quitará de la lista de precios pública y del formulario de reservas. ¿Confirmás eliminarlo del catálogo?"
                confirmLabel="Sí, Eliminar Servicio"
                cancelLabel="Cancelar"
                variant="danger"
            />
        </div>
    )
}
