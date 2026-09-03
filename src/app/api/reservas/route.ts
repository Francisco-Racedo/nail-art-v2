import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const ReservaSchema = z.object({
    nombre: z.string().min(2, 'El nombre es requerido'),
    celular: z.string().min(8, 'Debe tener al menos 8 números'),
    email: z.string().optional().or(z.literal('')),
    fecha_nacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha requerida (YYYY-MM-DD)'),
    servicio: z.string().min(1, 'El servicio es requerido'),
    fecha: z.string().refine((f) => {
        const partes = f.split('-')
        return partes.length === 3 && partes[0].length === 4
    }, 'Fecha inválida'),
    horario: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Horario inválido'),
    metodo_pago: z.enum(['mp', 'transferencia'])
})

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const parsed = ReservaSchema.safeParse(body)
        if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

        const { nombre, servicio, fecha, horario, celular, email, fecha_nacimiento, metodo_pago } = parsed.data

        const supabase = await createClient()

        // 🚨 SEGURIDAD: Extraer precio REAL desde la DB para evitar Spoofing malicioso
        const nombreServicioPuro = servicio.split('(')[0].trim()

        const { data: dbServicio, error: dbError } = await supabase
            .from('servicios')
            .select('precio')
            .eq('nombre', nombreServicioPuro)
            .single()

        if (dbError || !dbServicio) {
            return NextResponse.json({ error: 'Servicio no válido o precio no encontrado.' }, { status: 400 })
        }

        // Regla de negocio: la seña equivale al 50% del precio del servicio
        const montoSena = Math.round(dbServicio.precio * 0.5)

        let mp_preference_id = null
        let initPoint = null

        const token = process.env.MP_ACCESS_TOKEN || ''
        if (!token) return NextResponse.json({ error: 'Falta Token de Mercado Pago' }, { status: 500 })

        const mpPayload = {
            items: [{
                title: `Seña Turno: ${servicio.split('(')[0].trim()}`,
                quantity: 1,
                unit_price: montoSena,
                currency_id: 'ARS'
            }],
            back_urls: {
                success: `${request.headers.get('origin') || 'http://localhost:3000'}/reserva/estado`,
                pending: `${request.headers.get('origin') || 'http://localhost:3000'}/reserva/estado`,
                failure: `${request.headers.get('origin') || 'http://localhost:3000'}/reserva/estado`
            },
            auto_return: 'approved'
        }
        const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(mpPayload)
        })
        if (mpRes.ok) {
            const mpData = await mpRes.json()
            mp_preference_id = mpData.id
            initPoint = mpData.init_point
        } else {
            return NextResponse.json({ error: "No se pudo generar link MP" }, { status: 500 })
        }

        const payload = {
            nombre, servicio, fecha, horario, celular, fecha_nacimiento,
            metodo_pago, monto_sena: montoSena,
            ...(mp_preference_id && { mp_preference_id }),
            estado_pago: 'pendiente',
            ...(email && { email })
        }

        const { error } = await supabase.from('reservas').insert([payload])
        if (error) throw error

        return NextResponse.json({ success: true, initPoint, montoSena })
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Error interno'
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date')

    const supabase = await createClient()

    if (dateStr) {
        // ACCESO PÚBLICO: Sólo retorna disponibilidad de la grilla horaria
        const { data, error } = await supabase
            .from('reservas')
            .select('horario, estado')
            .eq('fecha', dateStr)

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ ocupados: data })
    }

    // 🚨 SEGURIDAD ZERO-TRUST: Si intentan volcar todo el historial, verificamos autenticación primero
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ACCESO RESTRINGIDO (ADMIN)
    const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .order('fecha', { ascending: true })
        .order('horario', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ reservas: data })
}
