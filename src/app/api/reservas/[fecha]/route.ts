import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
    getConfigCompleta,
    autoConfirmarPendientesVencidos,
    calcularDisponibilidadParaFecha
} from '@/lib/reservas-server'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ fecha: string }> }
) {
    try {
        const { fecha } = await params
        const cfg = await getConfigCompleta()
        await autoConfirmarPendientesVencidos(cfg.minutos_autoconfirmacion)

        const supabase = createServiceClient()
        const { data, error } = await supabase
            .from('reservas')
            .select('id, horario, estado, mp_preference_id')
            .eq('fecha', fecha)

        if (error) throw error

        const disp = calcularDisponibilidadParaFecha(fecha, cfg, data ?? [])
        return NextResponse.json({
            ocupados: disp.ocupados,
            cerrado: disp.cerrado,
            motivo: disp.motivo,
            horariosBase: disp.horariosBase,
            semaforo: disp.semaforo
        })
    } catch {
        return NextResponse.json({ error: 'Error al consultar disponibilidad' }, { status: 500 })
    }
}
