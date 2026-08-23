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
        const urls = (data ?? [])
            .filter(f => f.name !== '.emptyFolderPlaceholder')
            .map(f => `${supabaseUrl}/storage/v1/object/public/carousel/${f.name}`)

        return NextResponse.json(urls)
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error desconocido'
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
