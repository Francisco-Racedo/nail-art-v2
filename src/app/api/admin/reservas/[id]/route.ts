import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdminUser } from '@/lib/auth-admin'
import { notificarCambioServidor } from '@/lib/realtime-server'
import { z } from 'zod'
import {
    parseReservaMeta,
    serializeReservaMeta,
    SubEstadoReserva,
    esTurnoActivoEnGrilla,
    normalizarCelular,
    getEstadoEfectivo,
    validarTransicionEstado
} from '@/lib/utils'
import { obtenerFichasCRM, guardarKvConfig } from '@/lib/reservas-server'

const UpdateReservaSchema = z.object({
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
    nombre: z.string().min(2).max(80).optional(),
    celular: z.string().max(30).optional().nullable(),
    email: z.string().max(120).optional().nullable(),
    fecha_nacimiento: z.string().max(20).optional().nullable(),
    servicio: z.string().min(2).max(240).optional(),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    horario: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    metodo_pago: z.string().max(40).optional().nullable(),
    estado_pago: z.string().max(40).optional().nullable(),
    notificacion_enviada: z.boolean().optional(),
    descuento_aplicado: z.number().min(0).max(100).optional(),
    descuento_motivo: z.string().max(80).optional(),
    ocupa_bloque_siguiente: z.boolean().optional(),
    motivo_reprogramacion: z.string().max(160).optional(),
    dias_recordatorio_service: z.number().min(5).max(90).optional(),
    notas_turno: z.string().max(600).optional(),
    precio_personalizado: z.number().min(0).max(1000000).optional().nullable(),
    adicionales: z.array(z.string()).optional()
})

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { authorized } = await requireAdminUser()
    if (!authorized) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    try {
        const { id: paramId } = await params
        const id = parseInt(paramId, 10)
        if (isNaN(id) || id <= 0) {
            return NextResponse.json({ error: 'ID de reserva inválido' }, { status: 400 })
        }

        const supabaseAdmin = createServiceClient()
        const { error } = await supabaseAdmin.from('reservas').delete().eq('id', id)

        if (error) throw error

        notificarCambioServidor('reserva_eliminada', { id }).catch(() => {})

        revalidatePath('/', 'layout')
        return NextResponse.json({ success: true, message: 'Turno liberado.' })
    } catch {
        return NextResponse.json({ error: 'Error al liberar turno' }, { status: 500 })
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { authorized } = await requireAdminUser()
    if (!authorized) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    try {
        const { id: paramId } = await params
        const id = parseInt(paramId, 10)
        if (isNaN(id) || id <= 0) {
            return NextResponse.json({ error: 'ID de reserva inválido' }, { status: 400 })
        }

        const body = await request.json()
        const parsed = UpdateReservaSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || 'Datos inválidos' },
                { status: 400 }
            )
        }

        const supabaseAdmin = createServiceClient()
        const { data: actual } = await supabaseAdmin
            .from('reservas')
            .select('*')
            .eq('id', id)
            .single()

        if (!actual) {
            return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
        }

        const d = parsed.data
        const meta = parseReservaMeta(actual.mp_preference_id, actual.id)
        const nowIso = new Date().toISOString()
        const updatePayload: Record<string, unknown> = {}
        const cambiosDetalle: string[] = []

        // Si se cambia fecha u horario, verificar que no esté ocupado por otro turno activo
        const targetFecha = d.fecha || actual.fecha
        const targetHora = d.horario || (actual.horario || '').substring(0, 5)

        if (
            (d.fecha && d.fecha !== actual.fecha) ||
            (d.horario && d.horario !== (actual.horario || '').substring(0, 5))
        ) {
            const { data: colisiones } = await supabaseAdmin
                .from('reservas')
                .select('id, estado, mp_preference_id, nombre')
                .eq('fecha', targetFecha)
                .in('horario', [targetHora, `${targetHora}:00`])
                .neq('id', id)

            const ocupadoPorOtro = (colisiones || []).find(r => esTurnoActivoEnGrilla(r))
            if (ocupadoPorOtro) {
                return NextResponse.json(
                    {
                        error: `El horario ${targetHora} hs del ${targetFecha.split('-').reverse().join('/')} ya está ocupado por ${ocupadoPorOtro.nombre}.`
                    },
                    { status: 409 }
                )
            }

            meta.fechaOriginal = meta.fechaOriginal || actual.fecha
            meta.horarioOriginal =
                meta.horarioOriginal || (actual.horario || '').substring(0, 5)
            updatePayload.fecha = targetFecha
            updatePayload.horario = targetHora
            updatePayload.reprogramado = true
            if (meta.subEstado === 'reprogramar') {
                meta.subEstado = undefined
            }
            cambiosDetalle.push(
                `Reprogramado a ${targetFecha.split('-').reverse().join('/')} ${targetHora} hs`
            )
        }

        if (d.nombre !== undefined && d.nombre.trim() !== actual.nombre) {
            updatePayload.nombre = d.nombre.trim()
            cambiosDetalle.push(`Cliente: ${d.nombre.trim()}`)
        }
        if (d.celular !== undefined) {
            updatePayload.celular = (d.celular || '').trim() || null
        }
        if (d.email !== undefined) {
            updatePayload.email = (d.email || '').trim() || null
        }
        if (d.fecha_nacimiento !== undefined) {
            updatePayload.fecha_nacimiento = (d.fecha_nacimiento || '').trim() || null
        }
        if (d.servicio !== undefined && d.servicio !== actual.servicio) {
            updatePayload.servicio = d.servicio
            cambiosDetalle.push(`Servicio cambiado a: ${d.servicio}`)
        }
        if (d.metodo_pago !== undefined) {
            updatePayload.metodo_pago = d.metodo_pago
        }
        if (d.estado_pago !== undefined) {
            updatePayload.estado_pago = d.estado_pago
        }

        if (d.estado !== undefined) {
            const estadoActual = getEstadoEfectivo(actual)
            const nuevoEstado = d.estado as SubEstadoReserva

            if (estadoActual !== nuevoEstado) {
                const validacion = validarTransicionEstado(estadoActual, nuevoEstado)
                if (!validacion.permitida) {
                    return NextResponse.json(
                        { error: validacion.motivo || 'Transición de estado no permitida.' },
                        { status: 400 }
                    )
                }
            }

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
                    if (d.motivo_reprogramacion) {
                        meta.motivoReprogramacion = d.motivo_reprogramacion
                    }
                    updatePayload.reprogramado = true
                }
            }
            cambiosDetalle.push(`Estado → ${nuevoEstado}`)
        }

        if (d.notificacion_enviada !== undefined) {
            updatePayload.notificacion_enviada = d.notificacion_enviada
        }
        if (d.descuento_aplicado !== undefined) {
            updatePayload.descuento_aplicado = d.descuento_aplicado
        }
        if (d.descuento_motivo !== undefined) {
            meta.descuentoMotivo = d.descuento_motivo
        }
        if (d.ocupa_bloque_siguiente !== undefined) {
            meta.ocupaBloqueSiguiente = d.ocupa_bloque_siguiente
        }
        if (d.dias_recordatorio_service !== undefined) {
            meta.diasRecordatorioService = d.dias_recordatorio_service
            cambiosDetalle.push(
                `Recordatorio de service configurado a ${d.dias_recordatorio_service} días`
            )
        }
        if (d.notas_turno !== undefined) {
            meta.notasTurno = d.notas_turno
        }
        if (d.precio_personalizado !== undefined) {
            meta.precioPersonalizado =
                d.precio_personalizado === null ? undefined : d.precio_personalizado
        }
        if (d.adicionales !== undefined) {
            meta.adicionalesSeleccionados = d.adicionales
        }

        if (cambiosDetalle.length > 0) {
            meta.historial = [
                ...(meta.historial || []),
                {
                    fecha: nowIso,
                    accion: d.estado ? `estado_${d.estado}` : 'edicion_turno',
                    actor: 'dueno',
                    detalle: d.motivo_reprogramacion || cambiosDetalle.join(' • ')
                }
            ]
        }

        updatePayload.mp_preference_id = serializeReservaMeta(meta)

        const { error } = await supabaseAdmin
            .from('reservas')
            .update(updatePayload)
            .eq('id', id)

        if (error) throw error

        notificarCambioServidor('reserva_actualizada', { id, estado: d.estado }).catch(() => {})

        // Sincronizar también con la ficha CRM del cliente si se actualizó recordatorio, notas o datos de contacto
        if (
            d.dias_recordatorio_service !== undefined ||
            d.notas_turno !== undefined ||
            d.nombre !== undefined ||
            d.celular !== undefined ||
            d.fecha_nacimiento !== undefined
        ) {
            try {
                const fichas = await obtenerFichasCRM()
                const celFinal =
                    d.celular !== undefined ? d.celular || '' : actual.celular || ''
                const nomFinal = (
                    d.nombre !== undefined ? d.nombre : actual.nombre || 'Clienta'
                ).trim()
                const norm = normalizarCelular(celFinal)
                const crmKey =
                    norm && norm !== '3813013850'
                        ? norm
                        : norm === '3813013850'
                          ? `${norm}_${nomFinal.toLowerCase()}`
                          : `nombre:${nomFinal.toLowerCase()}`

                const prevCrm = fichas[crmKey] || {
                    key: crmKey,
                    nombre: nomFinal,
                    celular: celFinal
                }

                fichas[crmKey] = {
                    ...prevCrm,
                    key: crmKey,
                    nombre: nomFinal,
                    celular: celFinal || prevCrm.celular,
                    email:
                        d.email !== undefined
                            ? d.email || undefined
                            : actual.email || prevCrm.email,
                    fecha_nacimiento:
                        d.fecha_nacimiento !== undefined
                            ? d.fecha_nacimiento || undefined
                            : actual.fecha_nacimiento || prevCrm.fecha_nacimiento,
                    ...(d.dias_recordatorio_service !== undefined
                        ? { dias_recordatorio_service: d.dias_recordatorio_service }
                        : {}),
                    ...(d.notas_turno !== undefined && d.notas_turno.trim()
                        ? { notas_tecnicas: d.notas_turno.trim() }
                        : {})
                }

                await guardarKvConfig([
                    { clave: 'clientes_crm', valor: JSON.stringify(fichas) }
                ])
            } catch (crmErr) {
                console.error('Error sincronizando CRM desde reserva:', crmErr)
            }
        }

        revalidatePath('/', 'layout')
        revalidatePath('/admin/dashboard')
        revalidatePath('/admin/dashboard/clientes')

        return NextResponse.json({
            success: true,
            estado: d.estado || actual.estado,
            codigo: meta.codigo,
            mp_preference_id: updatePayload.mp_preference_id
        })
    } catch (e: unknown) {
        console.error('PATCH Reserva Error:', e)
        return NextResponse.json({ error: 'Error al actualizar reserva' }, { status: 500 })
    }
}
