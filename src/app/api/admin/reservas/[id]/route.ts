import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createServerClient()

    // Auth Validation (Security Layer)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    try {
        const { id: paramId } = await params
        const id = Number(paramId)
        if (!id) throw new Error('ID inválido')

        const { error } = await supabase
            .from('reservas')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true, message: 'Turno liberado.' })
    } catch (e: any) {
        console.error('DELETE Reserva Error:', e)
        return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 })
    }
}
