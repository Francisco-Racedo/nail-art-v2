import { createClient as createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CMSGalleryClient from '@/components/CMSGalleryClient'

export const dynamic = 'force-dynamic'

export default async function CMSCarouselPage() {
    const supabase = await createServerClient()

    // Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/admin/login')

    // Fetch images from bucket
    const { data, error } = await supabase.storage.from('carousel').list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
    })

    if (error) {
        console.error('Error fetching CMS files:', error)
    }

    // Map to public URLs (just like we did for the public site)
    const { data: publicUrls } = supabase.storage.from('carousel').getPublicUrl('')
    const baseUrl = publicUrls.publicUrl

    const validPhotos = (data || [])
        .filter(f => f.name !== '.emptyFolderPlaceholder')
        .map(f => ({
            name: f.name,
            url: baseUrl + '/' + f.name
        }))

    return (
        <div className="w-full animate-in fade-in duration-500">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-1">Módulo Carrusel</h2>
                <p className="text-zinc-400 text-sm">Las fotos cargadas aquí rotarán en la Landing Page pública.</p>
            </div>

            <CMSGalleryClient initialPhotos={validPhotos} />
        </div>
    )

}
