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
        const { data, error } = await supabase
            .from('config')
            .select('*')
            .limit(1)
            .single()

        if (error) {
            return NextResponse.json({ ...DEFAULT_CONFIG, _debugError: error })
        }

        return NextResponse.json(data ?? DEFAULT_CONFIG)
    } catch (e: any) {
        return NextResponse.json({ ...DEFAULT_CONFIG, _catchError: e.message })
    }
}

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
