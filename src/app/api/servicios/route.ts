import { createClient } from '@/lib/supabase/client'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        // Usamos el cliente anónimo (browser client) en lugar del server cookie client.
        // Para endpoints públicos de solo lectura, la anon key con la policy RLS
        // "Público puede leer servicios" es suficiente y no requiere contexto de sesión.
        const supabase = createClient()
        const { data, error } = await supabase
            .from('servicios')
            .select('*')
            .order('categoria')

        if (error) throw error
        return NextResponse.json(data ?? [])
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error desconocido'
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
