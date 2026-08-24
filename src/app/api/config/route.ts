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

        // C-02: En caso de error, retornar config por defecto de forma silenciosa.
        if (error) {
            return NextResponse.json(DEFAULT_CONFIG)
        }

        return NextResponse.json(data ?? DEFAULT_CONFIG)
    } catch {
        return NextResponse.json(DEFAULT_CONFIG)
    }
}
