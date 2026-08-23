import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ fecha: string }> }
) {
    try {
        const { fecha } = await params
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('reservas')
            .select('horario')
            .eq('fecha', fecha)

        if (error) throw error
        const ocupados = (data ?? []).map((r: { horario: string }) => r.horario)
        return NextResponse.json({ ocupados })
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error'
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
