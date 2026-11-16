import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabase = await createClient()
        // Obtener archivos de almacenamiento
        const { data, error } = await supabase.storage.from('carousel').list('', {
            limit: 100,
            sortBy: { column: 'created_at', order: 'asc' }
        })

        if (error) throw error

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

        // Filtrar únicamente archivos de video y ordenar de forma ascendente (el más viejo primero, los nuevos al final)
        const reels = (data ?? [])
            .filter(f => f.name !== '.emptyFolderPlaceholder')
            .filter(f => /\.(mp4|webm|mov|m4v|ogg)$/i.test(f.name))
            .sort((a, b) => {
                // Orden cronológico: fecha de creación o timestamp en el nombre
                const tsA = parseInt(a.name.split('_')[0], 10) || (a.created_at ? new Date(a.created_at).getTime() : 0)
                const tsB = parseInt(b.name.split('_')[0], 10) || (b.created_at ? new Date(b.created_at).getTime() : 0)
                return tsA - tsB
            })
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
