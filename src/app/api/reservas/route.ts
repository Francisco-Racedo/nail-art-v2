import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// FASE 4: Esquema Zod de validación en el servidor
const ReservaSchema = z.object({
    nombre: z.string().min(2, 'El nombre es requerido'),
    servicio: z.string().min(1, 'El servicio es requerido'),
    fecha: z.string().refine((f) => {
        const partes = f.split('-')
        const d = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]))
        return d.getDay() !== 0
    }, { message: 'Los domingos no trabajamos' }),
    horario: z.string().regex(/^\d{2}:\d{2}$/, 'Horario inválido'),
})

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const parsed = ReservaSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0].message },
                { status: 400 }
            )
        }

        const { nombre, servicio, fecha, horario } = parsed.data
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('reservas')
            .insert([{ nombre, servicio, fecha, horario }])
            .select('id')
            .single()

        if (error) throw error
        return NextResponse.json({ id: data.id, success: true })
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al guardar la reserva'
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}

export async function GET() {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('reservas')
            .select('*')
            .order('fecha', { ascending: true })

        if (error) throw error
        return NextResponse.json(data ?? [])
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error'
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
