'use client'

import React, { useState } from 'react'
import {
    UploadCloud,
    Trash2,
    Play,
    Pause,
    Volume2,
    VolumeX,
    Eye,
    X,
    Sparkles,
    Film,
    Image as ImageIcon,
    CheckCircle2,
    Scissors
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import { processVideoForUpload } from '@/lib/video-processor'

export interface MediaItem {
    name: string
    url: string
    isVideo: boolean
    created_at?: string
    size?: number
}

interface CMSGalleryClientProps {
    initialItems?: MediaItem[]
    initialPhotos?: { name: string; url: string }[]
}

export default function CMSGalleryClient({
    initialItems,
    initialPhotos
}: CMSGalleryClientProps) {
    const router = useRouter()
    const [uploading, setUploading] = useState(false)
    const [progressStatus, setProgressStatus] = useState<string>('')
    const [filter, setFilter] = useState<'todos' | 'fotos' | 'videos'>('todos')
    const [previewMedia, setPreviewMedia] = useState<MediaItem | null>(null)
    const [previewPlaying, setPreviewPlaying] = useState(true)
    const [previewMuted, setPreviewMuted] = useState(false)

    const supabase = createBrowserClient()

    // Normalizar items para compatibilidad
    const items: MediaItem[] =
        initialItems ||
        (initialPhotos || []).map(p => ({
            name: p.name,
            url: p.url,
            isVideo: /\.(mp4|webm|mov|m4v|ogg)$/i.test(p.name)
        }))

    const photos = items.filter(i => !i.isVideo)
    const videos = items.filter(i => i.isVideo)

    const filteredItems =
        filter === 'fotos' ? photos : filter === 'videos' ? videos : items

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files
        if (!fileList || fileList.length === 0) return

        const files = Array.from(fileList)
        setUploading(true)
        const toastId = toast.loading(`Iniciando subida de ${files.length} archivo(s)...`)

        try {
            const {
                data: { session }
            } = await supabase.auth.getSession()
            if (!session) throw new Error('Sesión no válida. Por favor, reingresá al panel.')

            let successCount = 0

            for (let i = 0; i < files.length; i++) {
                const originalFile = files[i]
                const isVideo = originalFile.type.startsWith('video/')

                setProgressStatus(
                    `Procesando ${i + 1}/${files.length}: ${originalFile.name}...`
                )

                // Si es video, procesar recorte inteligente si supera duración o peso permitido
                let fileToUpload: File | Blob = originalFile
                let fileName = `${Date.now()}_${originalFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`

                if (isVideo) {
                    setProgressStatus(`Analizando video ${originalFile.name}...`)
                    const result = await processVideoForUpload(
                        originalFile,
                        msg => setProgressStatus(msg),
                        12 // Límite de 12 segundos para reels
                    )
                    fileToUpload = result.file
                    fileName = `${Date.now()}_${result.fileName.replace(/[^a-zA-Z0-9.\-_]/g, '')}`

                    if (result.wasTrimmed) {
                        toast.info(
                            `El video "${originalFile.name}" superaba el tamaño. Fue recortado automáticamente a ${result.finalDuration}s sin cancelarse.`,
                            { duration: 5000 }
                        )
                    }
                }

                setProgressStatus(`Subiendo archivo ${i + 1} de ${files.length}...`)

                // Subir a Supabase Storage bucket 'carousel'
                const { error } = await supabase.storage
                    .from('carousel')
                    .upload(fileName, fileToUpload, {
                        cacheControl: '3600',
                        upsert: true,
                        contentType: originalFile.type || 'application/octet-stream'
                    })

                if (error) {
                    console.error('Error subiendo archivo:', error)
                    toast.error(`Error al subir ${originalFile.name}: ${error.message}`)
                } else {
                    successCount++
                }
            }

            if (successCount > 0) {
                toast.success(`¡${successCount} archivo(s) publicado(s) con éxito!`, {
                    id: toastId
                })
                router.refresh()
            } else {
                toast.dismiss(toastId)
            }
        } catch (err: any) {
            toast.error(err.message || 'Error general en la subida', { id: toastId })
        } finally {
            setUploading(false)
            setProgressStatus('')
            // Reset input
            e.target.value = ''
        }
    }

    const handleDelete = async (fileName: string) => {
        if (!confirm('¿Estás segura de eliminar este archivo de la galería/reels?')) return

        const toastId = toast.loading('Eliminando archivo...')
        try {
            const { error } = await supabase.storage
                .from('carousel')
                .remove([fileName])

            if (error) throw error

            toast.success('Eliminado correctamente', { id: toastId })
            if (previewMedia?.name === fileName) {
                setPreviewMedia(null)
            }
            router.refresh()
        } catch (err: any) {
            toast.error('No se pudo borrar: ' + (err.message || 'Error desconocido'), {
                id: toastId
            })
        }
    }

    return (
        <div className="w-full">
            {/* Zona de Subida Moderna con diseño claro */}
            <div className="bg-white/95 backdrop-blur-md rounded-[2.5rem] border border-rose-200/80 shadow-[0_15px_40px_-15px_rgba(244,63,94,0.12)] p-6 md:p-8 mb-8 transition-all">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div>
                        <h3 className="font-bold text-stone-900 text-lg flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-rose-500" />
                            Subir Nuevos Trabajos al Sitio
                        </h3>
                        <p className="text-stone-500 text-xs sm:text-sm">
                            Podés subir fotos para el carrusel o videos estilo Reel en formato vertical.
                        </p>
                    </div>
                    <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
                        ✨ Soporta Fotos y Videos
                    </span>
                </div>

                <label className="cursor-pointer group relative flex flex-col items-center justify-center p-8 sm:p-10 border-2 border-dashed border-rose-300 hover:border-rose-500 bg-gradient-to-b from-rose-50/40 via-white to-amber-50/30 hover:from-rose-50/80 hover:to-rose-100/50 rounded-[2rem] transition-all duration-300 shadow-inner">
                    <div className="w-16 h-16 rounded-full bg-white shadow-md border border-rose-100 flex items-center justify-center text-rose-500 mb-3 group-hover:scale-110 group-hover:bg-rose-500 group-hover:text-white transition duration-300">
                        <UploadCloud className="w-8 h-8" />
                    </div>

                    <span className="font-extrabold text-stone-800 text-base sm:text-lg text-center group-hover:text-rose-600 transition">
                        {uploading
                            ? 'Procesando y Subiendo...'
                            : 'Toca o arrastrá para subir fotos o videos'}
                    </span>

                    <span className="text-xs text-stone-500 mt-1.5 font-medium text-center max-w-md">
                        {uploading ? (
                            <span className="text-rose-600 font-semibold animate-pulse">
                                {progressStatus || 'Optimizando archivo para la web...'}
                            </span>
                        ) : (
                            'JPG, PNG, WEBP (Carrusel) • MP4, WEBM (Reels). Si un video excede el límite permitido, el sistema lo recortará automáticamente a 12s sin cancelarlo.'
                        )}
                    </span>

                    {/* Badge de auto-recorte */}
                    <div className="mt-4 flex items-center gap-2 text-[11px] font-semibold text-rose-800 bg-rose-100/80 border border-rose-200 px-3.5 py-1 rounded-full shadow-sm">
                        <Scissors className="w-3.5 h-3.5 text-rose-600" />
                        <span>Ajuste y recorte inteligente automático incluido</span>
                    </div>

                    <input
                        type="file"
                        className="hidden"
                        accept="image/*,video/mp4,video/webm,video/quicktime"
                        multiple
                        onChange={handleUpload}
                        disabled={uploading}
                    />
                </label>
            </div>

            {/* Barra de Filtros y Estadísticas */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 px-1">
                <div className="flex items-center gap-2 bg-stone-100/80 p-1.5 rounded-2xl border border-stone-200/80 w-fit">
                    <button
                        type="button"
                        onClick={() => setFilter('todos')}
                        className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                            filter === 'todos'
                                ? 'bg-white text-stone-900 shadow-sm'
                                : 'text-stone-500 hover:text-stone-800'
                        }`}
                    >
                        Todos ({items.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilter('fotos')}
                        className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all ${
                            filter === 'fotos'
                                ? 'bg-white text-stone-900 shadow-sm'
                                : 'text-stone-500 hover:text-stone-800'
                        }`}
                    >
                        <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
                        Fotos ({photos.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilter('videos')}
                        className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all ${
                            filter === 'videos'
                                ? 'bg-white text-purple-700 shadow-sm'
                                : 'text-stone-500 hover:text-stone-800'
                        }`}
                    >
                        <Film className="w-3.5 h-3.5 text-purple-600" />
                        Reels ({videos.length})
                    </button>
                </div>

                <p className="text-xs text-stone-500 font-medium">
                    Mostrando <strong>{filteredItems.length}</strong> archivo(s) publicado(s)
                </p>
            </div>

            {/* Grilla de Medios Activos */}
            {filteredItems.length === 0 ? (
                <div className="bg-white/80 rounded-[2rem] border border-rose-100 p-12 text-center shadow-sm">
                    <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-400 mx-auto flex items-center justify-center mb-3">
                        <ImageIcon className="w-7 h-7" />
                    </div>
                    <p className="text-stone-700 font-bold text-base">
                        No hay archivos en esta categoría.
                    </p>
                    <p className="text-stone-400 text-xs mt-1">
                        Subí fotos o videos desde el recuadro superior para lucirlos en tu página web.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {filteredItems.map((item, idx) => (
                        <div
                            key={item.name || idx}
                            className="group relative rounded-[1.75rem] overflow-hidden bg-white border border-rose-100 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col"
                            style={{ aspectRatio: item.isVideo ? '9/14' : '1/1' }}
                        >
                            {/* Visualizador de imagen o video */}
                            {item.isVideo ? (
                                <div className="relative w-full h-full bg-black">
                                    <video
                                        src={item.url}
                                        className="w-full h-full object-cover"
                                        playsInline
                                        muted
                                        loop
                                        preload="metadata"
                                    />
                                    {/* Badge de video */}
                                    <div className="absolute top-2.5 left-2.5 z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-900/80 backdrop-blur-md text-white text-[10px] font-extrabold uppercase tracking-wider border border-purple-400/40 shadow-sm">
                                        <Film className="w-3 h-3 text-purple-300" /> REEL
                                    </div>

                                    {/* Botón central de reproducir preview */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPreviewMedia(item)
                                            setPreviewPlaying(true)
                                        }}
                                        className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-white/90 hover:bg-white text-stone-900 shadow-xl flex items-center justify-center transform group-hover:scale-110 transition duration-300"
                                        title="Reproducir Reel"
                                    >
                                        <Play className="w-5 h-5 ml-0.5 fill-current text-rose-600" />
                                    </button>
                                </div>
                            ) : (
                                <div className="relative w-full h-full bg-stone-100 cursor-pointer overflow-hidden" onClick={() => setPreviewMedia(item)}>
                                    <img
                                        src={item.url}
                                        alt="Nail Art"
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        loading="lazy"
                                    />
                                    {/* Badge foto */}
                                    <div className="absolute top-2.5 left-2.5 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-900/60 backdrop-blur-md text-white text-[10px] font-bold">
                                        <ImageIcon className="w-2.5 h-2.5 text-amber-300" /> Foto
                                    </div>
                                    <div className="absolute inset-0 bg-stone-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="p-2 rounded-full bg-white/90 text-stone-800 shadow-md">
                                            <Eye className="w-4 h-4" />
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Botón Eliminar */}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleDelete(item.name)
                                }}
                                className="absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-full bg-red-600/90 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-transform transform scale-95 hover:scale-105 active:scale-90"
                                title="Eliminar archivo"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Vista Previa / Reproductor de Reel */}
            {previewMedia && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setPreviewMedia(null)}
                >
                    <div
                        className="relative bg-stone-950 rounded-[2.5rem] overflow-hidden max-w-md w-full border border-white/20 shadow-2xl flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Cabecera del modal */}
                        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                            {previewMedia.isVideo && (
                                <button
                                    type="button"
                                    onClick={() => setPreviewMuted(!previewMuted)}
                                    className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/90 transition shadow-lg border border-white/20"
                                    title={previewMuted ? 'Activar sonido' : 'Silenciar'}
                                >
                                    {previewMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setPreviewMedia(null)}
                                className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/90 transition shadow-lg border border-white/20"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Contenido Visual */}
                        <div className="w-full flex items-center justify-center bg-black min-h-[420px] max-h-[75vh]">
                            {previewMedia.isVideo ? (
                                <video
                                    src={previewMedia.url}
                                    className="w-full h-full max-h-[75vh] object-contain"
                                    controls
                                    autoPlay
                                    playsInline
                                    loop
                                    muted={previewMuted}
                                />
                            ) : (
                                <img
                                    src={previewMedia.url}
                                    alt="Vista Previa"
                                    className="w-full h-full max-h-[75vh] object-contain"
                                />
                            )}
                        </div>

                        {/* Pie del modal */}
                        <div className="p-5 bg-gradient-to-t from-stone-950 via-stone-900 to-stone-900/90 text-white flex items-center justify-between border-t border-white/10">
                            <div>
                                <p className="text-xs uppercase tracking-wider text-rose-400 font-bold">
                                    {previewMedia.isVideo ? '🎬 Reel en Movimiento' : '📸 Foto de Galería'}
                                </p>
                                <p className="text-sm font-semibold truncate max-w-[220px] text-stone-200">
                                    {previewMedia.name}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleDelete(previewMedia.name)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold transition shadow-sm"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
