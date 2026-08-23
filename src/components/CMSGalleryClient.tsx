'use client'

import React, { useState } from 'react'
import { UploadCloud, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { createClient as createBrowserClient } from '@/lib/supabase/client'

interface CMSGalleryClientProps {
    initialPhotos: { name: string; url: string }[]
}

export default function CMSGalleryClient({ initialPhotos }: CMSGalleryClientProps) {
    const router = useRouter()
    const [uploading, setUploading] = useState(false)
    const supabase = createBrowserClient()

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        const toastId = toast.loading('Subiendo imagen a la nube...')

        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error('No auth')

            // Generar nombre unívoco para evitar pisar archivos
            const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`

            const { data, error } = await supabase.storage
                .from('carousel')
                .upload(fileName, file, { cacheControl: '3600', upsert: false })

            if (error) throw error

            toast.success('¡Imagen publicada con éxito!', { id: toastId })
            router.refresh() // Recargar Server Component instataneamente
        } catch (err: any) {
            toast.error(err.message || 'Error al subir', { id: toastId })
        } finally {
            setUploading(false)
        }
    }

    const handleDelete = async (fileName: string) => {
        const toastId = toast.loading('Quitando del carrusel...')
        try {
            const { error } = await supabase.storage.from('carousel').remove([fileName])
            if (error) throw error

            toast.success('Eliminada correctamente', { id: toastId })
            router.refresh()
        } catch (err: any) {
            toast.error('No se pudo borrar', { id: toastId })
        }
    }

    return (
        <div className="w-full">
            {/* Upload Box */}
            <div className="bg-zinc-900/40 backdrop-blur-md rounded-[2rem] border border-zinc-800 p-6 md:p-8 mb-8">
                <label className="cursor-pointer group flex flex-col items-center justify-center p-8 border-2 border-dashed border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 rounded-[1.5rem] transition duration-200">
                    <UploadCloud className="w-10 h-10 text-amber-500 mb-2 transform group-hover:-translate-y-1 transition" />
                    <span className="font-bold text-amber-500 text-center">Toca para Subir Trabajo Nuevo</span>
                    <span className="text-xs text-zinc-500 mt-1 font-medium">{uploading ? 'Procesando...' : 'Optimizado para la web'}</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
                </label>
            </div>

            <h3 className="font-bold text-lg text-white mb-4 px-2">Imágenes Activas</h3>

            {/* Grid Fotos */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-2">
                {initialPhotos.length === 0 ? (
                    <p className="text-zinc-500 text-sm col-span-2">Aún no hay fotos públicas.</p>
                ) : (
                    initialPhotos.map((foto, idx) => (
                        <div key={idx} className="relative rounded-[1.5rem] overflow-hidden shadow-lg bg-zinc-900 border border-zinc-800 group focus-within:ring-2 ring-amber-500" style={{ aspectRatio: '1/1' }}>
                            <img src={foto.url} alt="Nail Art" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                            <button
                                onClick={() => handleDelete(foto.name)}
                                className="absolute top-2 right-2 bg-red-950/80 backdrop-blur-md p-2 rounded-full text-red-400 shadow-md border border-red-900/50 hover:bg-red-900 hover:text-white transition transform scale-100 active:scale-95">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
