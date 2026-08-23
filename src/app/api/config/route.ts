import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const DEFAULT_CONFIG = {
    hora_inicio: '10:00',
    hora_fin: '20:00',
    intervalo_minutos: '90'
}

export async function GET() {
    try {
        const supabase = await createClient()
        const { data } = await supabase
            .from('config')
            .select('*')
            .limit(1)
            .single()
        return NextResponse.json(data ?? DEFAULT_CONFIG)
    } catch {
        return NextResponse.json(DEFAULT_CONFIG)
    }
}
export const dynamic = 'force-dynamic'
