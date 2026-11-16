import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function GET() {
    try {
        const supabase = createServiceClient()
        const { data, error } = await supabase
            .from('servicios')
            .select('*')
            .order('id', { ascending: true })

        if (error) throw error
        return NextResponse.json(data ?? [], {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                Pragma: 'no-cache'
            }
        })
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error desconocido'
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
