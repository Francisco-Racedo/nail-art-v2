import { createClient } from '@/lib/supabase/client'
import { NextResponse } from 'next/server'

const DEFAULT_CONFIG = {
    hora_inicio: '10:00',
    hora_fin: '20:00',
    intervalo_minutos: '90',
    nombre_negocio: 'Fran & Romy Nails',
    whatsapp_numero: '5493813013850',
}

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function GET() {
    try {
        // Usamos el cliente anónimo (browser client) para endpoints públicos.
        // La policy RLS "Público puede leer config" permite SELECT al rol anon.
        const supabase = createClient()
        const { data, error } = await supabase
            .from('config')
            .select('*')
            .limit(1)
            .single()

        return NextResponse.json(data ?? DEFAULT_CONFIG, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            }
        })
    } catch {
        return NextResponse.json(DEFAULT_CONFIG)
    }
}
