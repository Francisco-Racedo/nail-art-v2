import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const EstadoSchema = z.object({
    estado: z.enum(['pendiente', 'confirmado', 'completado'], {
        errorMap: () => ({ message: 'Estado inválido' })
    })
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

        const { error } = await supabase
            .from('reservas')
            .update({ estado: parsed.data.estado })
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true, estado: parsed.data.estado })
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Error interno'
        console.error('PATCH Reserva Error:', e)
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
