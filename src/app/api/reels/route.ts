import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase.storage.from('carousel').list('', {
            limit: 50,
            sortBy: { column: 'created_at', order: 'desc' }
        })

        if (error) throw error

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        // Filter only video files (mp4, webm, mov, m4v, ogg)
        const reels = (data ?? [])
            .filter(f => f.name !== '.emptyFolderPlaceholder')
            .filter(f => /\.(mp4|webm|mov|m4v|ogg)$/i.test(f.name))
            .map(f => ({
                name: f.name,
                url: `${supabaseUrl}/storage/v1/object/public/carousel/${f.name}`,
                created_at: f.created_at,
                size: f.metadata?.size || 0
            }))

        return NextResponse.json(reels)
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error desconocido'
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
