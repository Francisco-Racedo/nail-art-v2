import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const EstadoSchema = z.object({
    estado: z.enum(['pendiente', 'confirmado', 'completado']).optional(),
    notificacion_enviada: z.boolean().optional(),
    descuento_aplicado: z.number().min(0).max(100).optional()
}).refine(data => data.estado !== undefined || data.notificacion_enviada !== undefined || data.descuento_aplicado !== undefined, {
    message: 'Debe proveer datos a actualizar'
})

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createServerClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    try {
        const { id: paramId } = await params
        const id = parseInt(paramId, 10)
        if (isNaN(id) || id <= 0) {
            return NextResponse.json({ error: 'ID de reserva inválido' }, { status: 400 })
        }

        const { error } = await supabase
            .from('reservas')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true, message: 'Turno liberado.' })
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Error interno'
        console.error('DELETE Reserva Error:', e)
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}

// M-01: Nuevo handler PATCH para actualizar el estado de una reserva
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createServerClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    try {
        const { id: paramId } = await params
        const id = parseInt(paramId, 10)
        if (isNaN(id) || id <= 0) {
            return NextResponse.json({ error: 'ID de reserva inválido' }, { status: 400 })
        }

        const body = await request.json()
        const parsed = EstadoSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
        }

        const updatePayload: Record<string, unknown> = {}
        if (parsed.data.estado !== undefined) {
            updatePayload.estado = parsed.data.estado
            // Al completar un turno, el pago se registra como total en local
            if (parsed.data.estado === 'completado') {
                updatePayload.estado_pago = 'pagado_total'
            }
        }
        if (parsed.data.notificacion_enviada !== undefined) updatePayload.notificacion_enviada = parsed.data.notificacion_enviada
        if (parsed.data.descuento_aplicado !== undefined) updatePayload.descuento_aplicado = parsed.data.descuento_aplicado

        const { error } = await supabase
            .from('reservas')
            .update(updatePayload)
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true, estado: parsed.data.estado })
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Error interno'
        console.error('PATCH Reserva Error:', e)
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
