import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const preference_id = searchParams.get('preference_id')

    if (!preference_id) {
        return NextResponse.json({ error: 'preference_id es requerido' }, { status: 400 })
    }

    try {
        const supabase = await createClient()

        // Buscamos la reserva por preferencia
        const { data, error } = await supabase
            .from('reservas')
            .select('nombre, servicio, fecha, horario, monto_sena, metodo_pago')
            .eq('mp_preference_id', preference_id)
            .single()

        if (error || !data) {
            return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
        }

        return NextResponse.json({ reserva: data })
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Error interno'
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
