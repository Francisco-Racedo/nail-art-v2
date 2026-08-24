import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('servicios')
            .select('*')
            .order('categoria')

        if (error) throw error
        return NextResponse.json(data ?? [], {
            // O-05: Los servicios son datos casi estáticos — se revalidan on-demand
            // desde ajustes/actions.ts con revalidatePath('/') al guardar cambios.
            headers: {
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
            },
        })
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error desconocido'
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
