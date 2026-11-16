import { NextResponse } from 'next/server'
import { obtenerDisponibilidadRango, getConfigCompleta } from '@/lib/reservas-server'
import { getHoyArgentina, getFinMesesSiguientesArgentina } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const cfg = await getConfigCompleta()
        const desde = searchParams.get('desde') || getHoyArgentina()
        const hasta =
            searchParams.get('hasta') ||
            getFinMesesSiguientesArgentina(cfg.meses_visibles_cliente)

        if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
            return NextResponse.json({ error: 'Rango de fechas inválido' }, { status: 400 })
        }

        const result = await obtenerDisponibilidadRango(desde, hasta)
        return NextResponse.json(result, {
            headers: {
                'Cache-Control': 'no-store, max-age=0'
            }
        })
    } catch {
        return NextResponse.json({ error: 'No se pudo obtener la disponibilidad' }, { status: 500 })
    }
}
