import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = createServiceClient()
        const { data, error } = await supabase.storage.from('carousel').list('', {
            limit: 100,
            sortBy: { column: 'created_at', order: 'desc' }
        })

        if (error) throw error

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        // Filter out placeholder, CMS-only files (Hero / custom sections), and video files so only gallery images go to the photo carousel
        const urls = (data ?? [])
            .filter(f => f.name !== '.emptyFolderPlaceholder')
            .filter(f => !f.name.startsWith('cms-'))
            .filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f.name))
            .map(f => `${supabaseUrl}/storage/v1/object/public/carousel/${f.name}`)

        return NextResponse.json(urls)
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error desconocido'
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
