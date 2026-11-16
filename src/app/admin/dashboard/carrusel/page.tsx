import { createClient as createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CMSGalleryClient from '@/components/CMSGalleryClient'

export const dynamic = 'force-dynamic'

export default async function CMSCarouselPage() {
    const supabase = await createServerClient()

    // Auth
    const {
        data: { user }
    } = await supabase.auth.getUser()
    if (!user) redirect('/admin/login')

    // Fetch files from bucket
    const { data, error } = await supabase.storage.from('carousel').list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
    })

    if (error) {
        console.error('Error fetching CMS files:', error)
    }

    // Map to public URLs
    const { data: publicUrls } = supabase.storage.from('carousel').getPublicUrl('')
    const baseUrl = publicUrls.publicUrl

    const validItems = (data || [])
        .filter(f => f.name !== '.emptyFolderPlaceholder')
        .map(f => {
            const isVideo = /\.(mp4|webm|mov|m4v|ogg)$/i.test(f.name)
            return {
                name: f.name,
                url: baseUrl + '/' + f.name,
                isVideo,
                created_at: f.created_at || '',
                size: f.metadata?.size || 0
            }
        })

    const totalPhotos = validItems.filter(i => !i.isVideo).length
    const totalVideos = validItems.filter(i => i.isVideo).length

    return (
        <div className="w-full animate-in fade-in duration-500 pb-16">
            {/* Header editorial con colores legibles */}
            <div className="mb-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100/90 border border-rose-200 text-rose-700 text-xs font-bold uppercase tracking-widest mb-2 shadow-sm">
                    ✨ Galería & Reels en Movimiento
                </div>
                <h2 className="text-3xl font-black text-stone-900 tracking-tight">
                    Módulo de Galería y Videos
                </h2>
                <p className="text-stone-600 text-sm mt-1 max-w-2xl font-normal">
                    Gestioná las fotos que rotan en el carrusel de la página de inicio y los videos tipo Reel para lucir tus trabajos en movimiento.
                </p>

                {/* Badges de conteo rápido */}
                <div className="flex flex-wrap gap-2.5 mt-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 bg-white/80 border border-rose-100 px-3 py-1 rounded-full shadow-sm">
                        📸 <strong>{totalPhotos}</strong> fotos activas
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-700 bg-purple-50/80 border border-purple-200 px-3 py-1 rounded-full shadow-sm">
                        🎬 <strong>{totalVideos}</strong> reels / videos
                    </span>
                </div>
            </div>

            <CMSGalleryClient initialItems={validItems} />
        </div>
    )
}
