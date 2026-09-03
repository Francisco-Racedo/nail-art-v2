import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ fecha: string }> }
) {
    try {
        const { fecha } = await params
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('reservas')
            .select('horario, estado')
            .eq('fecha', fecha)

        if (error) throw error
        const ocupados = (data ?? []).map((r: { horario: string, estado: string }) => ({ horario: r.horario, estado: r.estado || 'pendiente' }))
        return NextResponse.json({ ocupados })
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error'
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
