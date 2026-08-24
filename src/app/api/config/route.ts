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

        // C-02: En caso de error, retornar config por defecto de forma silenciosa.
        // NO filtrar detalles internos de la BD al cliente anónimo.
        if (error) {
            return NextResponse.json(DEFAULT_CONFIG)
        }

        return NextResponse.json(data ?? DEFAULT_CONFIG)
    } catch {
        // Silencioso en producción — el cliente recibe defaults seguros
        return NextResponse.json(DEFAULT_CONFIG)
    }
}

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
