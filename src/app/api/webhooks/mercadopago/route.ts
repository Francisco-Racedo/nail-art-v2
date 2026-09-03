/**
 * WEBHOOK IPN – MercadoPago
 *
 * Flujo:
 *  1. MP envía una notificación POST con { type: "payment", data: { id } }
 *  2. Verificamos el pago directamente contra la API de MP con nuestro access token.
 *  3. Si el estado es 'approved', buscamos la reserva por el `mp_preference_id`
 *     (que MP devuelve como `preference_id` en el objeto del pago).
 *  4. Mutamos `estado_pago = 'pagado_sena'` en Supabase silenciosamente.
 *
 * Documentación: https://www.mercadopago.com.ar/developers/es/docs/notifications/webhooks/webhooks
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// Supabase con service role para escrituras silenciosas sin sesión de usuario
// Si no tenés este helper, podés reemplazarlo por createClient con SERVICE_ROLE_KEY

export async function POST(request: Request) {
    try {
        const body = await request.json()

        // MP puede enviar diferentes tipos de notificaciones; solo nos interesan los pagos
        if (body.type !== 'payment') {
            return NextResponse.json({ received: true }, { status: 200 })
        }

        const paymentId: string = body?.data?.id
        if (!paymentId) {
            return NextResponse.json({ error: 'ID de pago ausente' }, { status: 400 })
        }

        const token = process.env.MP_ACCESS_TOKEN
        if (!token) {
            console.error('[Webhook MP] MP_ACCESS_TOKEN no configurado.')
            return NextResponse.json({ error: 'Config incompleta' }, { status: 500 })
        }

        // --- Paso 2: Verificar estado del pago en la API de MercadoPago ---
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
            // No cachar: siempre obtener el estado más reciente
            cache: 'no-store'
        })

        if (!mpRes.ok) {
            console.error('[Webhook MP] Error al consultar pago:', paymentId)
            return NextResponse.json({ error: 'No se pudo verificar el pago en MP' }, { status: 502 })
        }

        const payment = await mpRes.json()

        // Solo procesamos pagos aprobados
        if (payment.status !== 'approved') {
            console.log(`[Webhook MP] Pago ${paymentId} con estado '${payment.status}', ignorado.`)
            return NextResponse.json({ received: true, status: payment.status }, { status: 200 })
        }

        // --- Paso 3: Buscar la reserva por preference_id ---
        // MP expone el preference_id en el objeto del pago
        const preferenceId: string | null = payment.preference_id ?? null
        if (!preferenceId) {
            console.error('[Webhook MP] Pago aprobado pero sin preference_id:', payment)
            return NextResponse.json({ error: 'preference_id ausente en el pago' }, { status: 422 })
        }

        const supabase = await createServiceClient()

        const { data: reserva, error: findError } = await supabase
            .from('reservas')
            .select('id, estado_pago')
            .eq('mp_preference_id', preferenceId)
            .single()

        if (findError || !reserva) {
            console.error('[Webhook MP] Reserva no encontrada para preference_id:', preferenceId)
            // Devolvemos 200 para que MP no reintente indefinidamente
            return NextResponse.json({ received: true, note: 'Reserva no encontrada' }, { status: 200 })
        }

        // Idempotencia: evitar doble actualización si MP reenvía la notificación
        if (reserva.estado_pago === 'pagado_sena') {
            return NextResponse.json({ received: true, note: 'Ya procesado' }, { status: 200 })
        }

        // --- Paso 4: Mutar estado_pago silenciosamente ---
        const { error: updateError } = await supabase
            .from('reservas')
            .update({ estado_pago: 'pagado_sena' })
            .eq('id', reserva.id)

        if (updateError) {
            console.error('[Webhook MP] Error al actualizar reserva:', updateError.message)
            return NextResponse.json({ error: 'Error al actualizar reserva' }, { status: 500 })
        }

        console.log(`[Webhook MP] ✅ Seña acreditada para reserva ID: ${reserva.id}`)
        return NextResponse.json({ received: true, reserva_id: reserva.id }, { status: 200 })

    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Error inesperado'
        console.error('[Webhook MP] Excepción:', msg)
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}

// MercadoPago también realiza un GET para verificar que el endpoint existe
export async function GET() {
    return NextResponse.json({ status: 'Webhook MP activo ✅' }, { status: 200 })
}
