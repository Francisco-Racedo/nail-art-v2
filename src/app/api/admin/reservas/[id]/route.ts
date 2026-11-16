import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'
import { parseReservaMeta, serializeReservaMeta, SubEstadoReserva } from '@/lib/utils'

const EstadoSchema = z
    .object({
        estado: z
            .enum([
                'pendiente',
                'confirmado',
                'completado',
                'reprogramar',
                'cancelado',
                'ausente'
            ])
            .optional(),
        notificacion_enviada: z.boolean().optional(),
        descuento_aplicado: z.number().min(0).max(100).optional(),
        descuento_motivo: z.string().max(80).optional(),
        ocupa_bloque_siguiente: z.boolean().optional(),
        motivo_reprogramacion: z.string().max(160).optional()
    })
    .refine(
        data =>
            data.estado !== undefined ||
            data.notificacion_enviada !== undefined ||
            data.descuento_aplicado !== undefined ||
            data.ocupa_bloque_siguiente !== undefined,
        {
            message: 'Debe proveer datos a actualizar'
        }
    )

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createServerClient()

    const {
        data: { user }
    } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    try {
        const { id: paramId } = await params
        const id = parseInt(paramId, 10)
        if (isNaN(id) || id <= 0) {
            return NextResponse.json({ error: 'ID de reserva inválido' }, { status: 400 })
        }

        const { error } = await supabase.from('reservas').delete().eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true, message: 'Turno liberado.' })
    } catch {
        return NextResponse.json({ error: 'Error al liberar turno' }, { status: 500 })
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createServerClient()

    const {
        data: { user }
    } = await supabase.auth.getUser()
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

        const supabaseAdmin = createServiceClient()
        const { data: actual } = await supabaseAdmin
            .from('reservas')
            .select('id, estado, mp_preference_id, fecha, horario')
            .eq('id', id)
            .single()

        if (!actual) {
            return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
        }

        const meta = parseReservaMeta(actual.mp_preference_id, actual.id)
        const nowIso = new Date().toISOString()
        const updatePayload: Record<string, unknown> = {}

        if (parsed.data.estado !== undefined) {
            const nuevoEstado = parsed.data.estado as SubEstadoReserva
            if (
                nuevoEstado === 'pendiente' ||
                nuevoEstado === 'confirmado' ||
                nuevoEstado === 'completado'
            ) {
                updatePayload.estado = nuevoEstado
                meta.subEstado = undefined
                if (nuevoEstado === 'confirmado') {
                    meta.confirmadoEn = nowIso
                    meta.confirmadoPor = 'dueno'
                }
                if (nuevoEstado === 'completado') {
                    updatePayload.estado_pago = 'pagado_total'
                }
            } else {
                const hLimpio = (actual.horario || '').substring(0, 5)
                meta.subEstado = nuevoEstado
                meta.horarioOriginal = meta.horarioOriginal || hLimpio
                if (nuevoEstado === 'reprogramar') {
                    meta.fechaOriginal = meta.fechaOriginal || actual.fecha
                    if (parsed.data.motivo_reprogramacion) {
                        meta.motivoReprogramacion = parsed.data.motivo_reprogramacion
                    }
                    updatePayload.reprogramado = true
                }
            }

            meta.historial = [
                ...(meta.historial || []),
                {
                    fecha: nowIso,
                    accion: `estado_${nuevoEstado}`,
                    actor: 'dueno',
                    detalle: parsed.data.motivo_reprogramacion || `Cambio a ${nuevoEstado}`
                }
            ]
        }

        if (parsed.data.notificacion_enviada !== undefined) {
            updatePayload.notificacion_enviada = parsed.data.notificacion_enviada
        }
        if (parsed.data.descuento_aplicado !== undefined) {
            updatePayload.descuento_aplicado = parsed.data.descuento_aplicado
        }
        if (parsed.data.descuento_motivo !== undefined) {
            meta.descuentoMotivo = parsed.data.descuento_motivo
        }
        if (parsed.data.ocupa_bloque_siguiente !== undefined) {
            meta.ocupaBloqueSiguiente = parsed.data.ocupa_bloque_siguiente
        }

        updatePayload.mp_preference_id = serializeReservaMeta(meta)

        const { error } = await supabaseAdmin
            .from('reservas')
            .update(updatePayload)
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({
            success: true,
            estado: parsed.data.estado,
            codigo: meta.codigo
        })
    } catch (e: unknown) {
        console.error('PATCH Reserva Error:', e)
        return NextResponse.json({ error: 'Error al actualizar reserva' }, { status: 500 })
    }
}
