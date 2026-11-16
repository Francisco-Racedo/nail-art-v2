import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
    parseReservaMeta,
    serializeReservaMeta,
    getEstadoEfectivo,
    getHoyArgentina,
    getFinMesesSiguientesArgentina,
    esTurnoActivoEnGrilla,
    calcularDesgloseReserva,
    obtenerLabelsAdicionales
} from '@/lib/utils'
import {
    getConfigCompleta,
    autoConfirmarPendientesVencidos,
    calcularDisponibilidadParaFecha,
    obtenerDisponibilidadRango
} from '@/lib/reservas-server'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

async function buscarReservaPorCodigo(codigo: string) {
    const supabase = createServiceClient()
    const { data: todas, error } = await supabase
        .from('reservas')
        .select('*')
        .order('id', { ascending: false })
        .limit(300)

    if (error || !todas) return null

    for (const r of todas) {
        const meta = parseReservaMeta(r.mp_preference_id, r.id)
        if (meta.codigo === codigo || `T${r.id}` === codigo) {
            return { reserva: r, meta }
        }
    }
    return null
}

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ codigo: string }> }
) {
    try {
        const { codigo } = await params
        const cfg = await getConfigCompleta()
        await autoConfirmarPendientesVencidos(cfg.minutos_autoconfirmacion)

        const found = await buscarReservaPorCodigo(codigo)
        if (!found) {
            return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 })
        }

        const { reserva, meta } = found
        const estadoEfectivo = getEstadoEfectivo(reserva)
        const desglose = calcularDesgloseReserva(reserva)
        const labelsAdicionales = obtenerLabelsAdicionales(desglose.adicionalesIds)

        // Generar hasta 3 sugerencias inteligentes de horario libre cercanas a la fecha del turno
        const hoyArg = getHoyArgentina()
        const maxArg = getFinMesesSiguientesArgentina(cfg.meses_visibles_cliente)
        const baseFecha = reserva.fecha >= hoyArg ? reserva.fecha : hoyArg
        const { dias } = await obtenerDisponibilidadRango(hoyArg, maxArg)

        const sugerencias: { fecha: string; horario: string; mismoHorario: boolean }[] = []
        const horaPreferida = (reserva.horario || '10:00').substring(0, 5)

        // Prioridad 1: mismo horario en días cercanos posteriores
        for (const [f, info] of Object.entries(dias)) {
            if (f < baseFecha || info.cerrado) continue
            if (f === reserva.fecha && estadoEfectivo !== 'reprogramar') continue
            const ocupadoSet = new Set(info.ocupados.map(o => o.horario.substring(0, 5)))
            if (info.horariosBase.includes(horaPreferida) && !ocupadoSet.has(horaPreferida)) {
                sugerencias.push({ fecha: f, horario: horaPreferida, mismoHorario: true })
                if (sugerencias.length >= 2) break
            }
        }

        // Prioridad 2: otros horarios libres cercanos si faltan hasta completar 3
        for (const [f, info] of Object.entries(dias)) {
            if (sugerencias.length >= 3) break
            if (f < baseFecha || info.cerrado) continue
            const ocupadoSet = new Set(info.ocupados.map(o => o.horario.substring(0, 5)))
            for (const h of info.horariosBase) {
                if (f === reserva.fecha && h === horaPreferida) continue
                if (!ocupadoSet.has(h) && !sugerencias.some(s => s.fecha === f && s.horario === h)) {
                    sugerencias.push({ fecha: f, horario: h, mismoHorario: h === horaPreferida })
                    if (sugerencias.length >= 3) break
                }
            }
        }

        return NextResponse.json({
            turno: {
                id: reserva.id,
                codigo: meta.codigo,
                nombre: reserva.nombre,
                servicio: reserva.servicio,
                adicionales: labelsAdicionales,
                montoAdicionales: desglose.montoAdicionales,
                totalFinal: desglose.totalFinal,
                descuentoPct: desglose.descuentoPct,
                fecha: reserva.fecha,
                horario: (reserva.horario || '').substring(0, 5),
                estado: estadoEfectivo,
                reprogramado: !!reserva.reprogramado,
                createdAt: meta.createdAt,
                confirmadoEn: meta.confirmadoEn,
                confirmadoPor: meta.confirmadoPor,
                motivoReprogramacion: meta.motivoReprogramacion,
                fechaOriginal: meta.fechaOriginal,
                horarioOriginal: meta.horarioOriginal,
                sugerencias,
                minutosConfirmacion: cfg.minutos_autoconfirmacion,
                nombreNegocio: cfg.nombre_negocio,
                whatsappNumero: cfg.whatsapp_numero
            }
        })
    } catch {
        return NextResponse.json({ error: 'Error al consultar el turno' }, { status: 500 })
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ codigo: string }> }
) {
    try {
        const { codigo } = await params
        const body = await request.json()
        const accion = body?.accion as 'reprogramar' | 'cancelar'

        const cfg = await getConfigCompleta()
        const found = await buscarReservaPorCodigo(codigo)
        if (!found) {
            return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 })
        }

        const { reserva, meta } = found
        const supabase = createServiceClient()
        const nowIso = new Date().toISOString()

        if (accion === 'cancelar') {
            // Al cancelar, liberamos el bloque en la base de datos para que otro cliente pueda reservarlo
            const { error } = await supabase
                .from('reservas')
                .delete()
                .eq('id', reserva.id)

            if (error) throw error
            return NextResponse.json({ success: true, estado: 'cancelado' })
        }

        if (accion === 'reprogramar') {
            const nuevaFecha = String(body?.nuevaFecha || '').substring(0, 10)
            const nuevoHorario = String(body?.nuevoHorario || '').substring(0, 5)

            const hoyArg = getHoyArgentina()
            const maxArg = getFinMesesSiguientesArgentina(cfg.meses_visibles_cliente)

            if (!/^\d{4}-\d{2}-\d{2}$/.test(nuevaFecha) || nuevaFecha < hoyArg || nuevaFecha > maxArg) {
                return NextResponse.json(
                    { error: 'La fecha seleccionada está fuera del rango permitido.' },
                    { status: 400 }
                )
            }

            const { data: reservasDia } = await supabase
                .from('reservas')
                .select('id, horario, estado, mp_preference_id')
                .eq('fecha', nuevaFecha)
                .neq('id', reserva.id)

            const disp = calcularDisponibilidadParaFecha(nuevaFecha, cfg, reservasDia ?? [])
            if (disp.cerrado) {
                return NextResponse.json(
                    { error: `El día seleccionado no atiende (${disp.motivo || 'Cerrado'}).` },
                    { status: 400 }
                )
            }

            if (!disp.horariosBase.includes(nuevoHorario)) {
                return NextResponse.json(
                    { error: 'El horario elegido no es válido.' },
                    { status: 400 }
                )
            }

            if (disp.ocupados.some(o => o.horario.substring(0, 5) === nuevoHorario)) {
                return NextResponse.json(
                    { error: 'Ese horario acaba de ser ocupado. Por favor elegí otro.' },
                    { status: 409 }
                )
            }

            // Re-verificar colisión directa
            const { data: colision } = await supabase
                .from('reservas')
                .select('id, estado, mp_preference_id')
                .eq('fecha', nuevaFecha)
                .in('horario', [nuevoHorario, `${nuevoHorario}:00`])
                .neq('id', reserva.id)

            if ((colision || []).some(r => esTurnoActivoEnGrilla(r))) {
                return NextResponse.json(
                    { error: 'Ese horario acaba de ser tomado por otro cliente.' },
                    { status: 409 }
                )
            }

            const veniaDeImprevisto = meta.subEstado === 'reprogramar'
            const nuevoEstadoDB = veniaDeImprevisto ? 'confirmado' : reserva.estado

            const nuevoMeta = {
                ...meta,
                subEstado: undefined,
                fechaOriginal: meta.fechaOriginal || reserva.fecha,
                horarioOriginal: meta.horarioOriginal || (reserva.horario || '').substring(0, 5),
                ...(veniaDeImprevisto
                    ? { confirmadoEn: meta.confirmadoEn || nowIso, confirmadoPor: 'cliente' as const }
                    : {}),
                historial: [
                    ...(meta.historial || []),
                    {
                        fecha: nowIso,
                        accion: 'reprogramado_cliente',
                        actor: 'cliente' as const,
                        detalle: `Movido de ${reserva.fecha} ${(reserva.horario || '').substring(0, 5)} a ${nuevaFecha} ${nuevoHorario}`
                    }
                ]
            }

            const { error } = await supabase
                .from('reservas')
                .update({
                    fecha: nuevaFecha,
                    horario: nuevoHorario,
                    estado: nuevoEstadoDB,
                    reprogramado: true,
                    mp_preference_id: serializeReservaMeta(nuevoMeta)
                })
                .eq('id', reserva.id)

            if (error) throw error

            return NextResponse.json({
                success: true,
                fecha: nuevaFecha,
                horario: nuevoHorario,
                estado: nuevoEstadoDB
            })
        }

        return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 })
    } catch {
        return NextResponse.json({ error: 'No se pudo procesar el cambio' }, { status: 500 })
    }
}
