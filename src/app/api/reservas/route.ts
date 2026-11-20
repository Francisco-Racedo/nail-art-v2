import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdminUser, extractClientIp } from '@/lib/auth-admin'
import { notificarCambioServidor } from '@/lib/realtime-server'
import { z } from 'zod'
import {
    getHoyArgentina,
    getFinMesesSiguientesArgentina,
    normalizarCelular,
    generarCodigoPublico,
    serializeReservaMeta,
    parseReservaMeta,
    esTurnoActivoEnGrilla,
    getEstadoEfectivo,
    ADICIONALES_CATALOGO,
    calcularTotalAdicionales,
    obtenerLabelsAdicionales
} from '@/lib/utils'
import {
    getConfigCompleta,
    autoConfirmarPendientesVencidos,
    calcularDisponibilidadParaFecha
} from '@/lib/reservas-server'
import { crearPreferenciaMercadoPago } from '@/lib/payments/mercadopago'

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
    const now = Date.now()
    const windowMs = 10 * 60 * 1000 // 10 min
    const maxReqs = 15
    const entry = rateLimitMap.get(ip)
    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs })
        return true
    }
    if (entry.count >= maxReqs) return false
    entry.count += 1
    return true
}

const ReservaSchema = z.object({
    nombre: z.string().min(2, 'El nombre es requerido').max(60),
    celular: z.string().min(8, 'El número de WhatsApp debe tener al menos 8 dígitos').max(20),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    fecha_nacimiento: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de nacimiento inválida')
        .optional()
        .or(z.literal('')),
    servicio: z.string().min(1, 'El servicio es requerido'),
    adicionales: z.array(z.string()).optional(),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)'),
    horario: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Horario inválido'),
    metodo_pago: z.enum(['mp', 'transferencia', 'local']).optional().default('local')
})

export async function POST(request: Request) {
    try {
        const ip = extractClientIp(request)

        if (ip !== 'local' && ip !== '127.0.0.1' && !checkRateLimit(ip)) {
            return NextResponse.json(
                { error: 'Demasiados intentos seguidos. Por favor aguardá unos minutos.' },
                { status: 429 }
            )
        }

        const body = await request.json()
        const parsed = ReservaSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
        }

        const {
            nombre,
            servicio,
            adicionales,
            fecha,
            horario,
            celular,
            email,
            fecha_nacimiento,
            metodo_pago
        } = parsed.data

        const adicionalesValidos = Array.isArray(adicionales)
            ? adicionales.filter(id => ADICIONALES_CATALOGO.some(a => a.id === id))
            : []

        const cfg = await getConfigCompleta()
        await autoConfirmarPendientesVencidos(cfg.minutos_autoconfirmacion)

        // 1. Validar ventana de fechas según meses habilitados por el dueño (en hora de Argentina)
        const hoyArg = getHoyArgentina()
        const maxFechaArg = getFinMesesSiguientesArgentina(cfg.meses_visibles_cliente)
        if (fecha < hoyArg) {
            return NextResponse.json(
                { error: 'No se puede reservar en una fecha pasada.' },
                { status: 400 }
            )
        }
        if (fecha > maxFechaArg) {
            return NextResponse.json(
                { error: `Solo se permiten reservas dentro de los ${cfg.meses_visibles_cliente} meses habilitados en el calendario.` },
                { status: 400 }
            )
        }

        const supabaseAdmin = createServiceClient()

        // 2. Validar que el servicio exista en la DB y obtener precio real
        const nombreServicioPuro = servicio.split('(')[0].trim()
        const { data: dbServicio, error: dbError } = await supabaseAdmin
            .from('servicios')
            .select('precio, nombre')
            .eq('nombre', nombreServicioPuro)
            .single()

        if (dbError || !dbServicio) {
            return NextResponse.json(
                { error: 'El servicio seleccionado no es válido.' },
                { status: 400 }
            )
        }

        // 3. Consultar reservas del día y verificar disponibilidad real (día laboral, feriados y colisión)
        const { data: reservasDelDia, error: errDia } = await supabaseAdmin
            .from('reservas')
            .select('id, horario, estado, mp_preference_id')
            .eq('fecha', fecha)

        if (errDia) throw errDia

        const disp = calcularDisponibilidadParaFecha(fecha, cfg, reservasDelDia ?? [])
        if (disp.cerrado) {
            return NextResponse.json(
                { error: `El día seleccionado no atiende (${disp.motivo || 'Cerrado'}).` },
                { status: 400 }
            )
        }

        const horarioNorm = horario.substring(0, 5)
        if (!disp.horariosBase.includes(horarioNorm)) {
            return NextResponse.json(
                { error: 'El horario seleccionado no forma parte de los turnos disponibles.' },
                { status: 400 }
            )
        }

        const yaOcupado = disp.ocupados.some(o => o.horario.substring(0, 5) === horarioNorm)
        if (yaOcupado) {
            return NextResponse.json(
                { error: 'Ese horario acaba de ser reservado por otra persona. Por favor elegí otro.' },
                { status: 409 }
            )
        }

        // 4. Control de reservas por clienta:
        // Permite agendar libremente en diferentes fechas.
        // En una misma fecha se permite un máximo de 2 turnos activos por clienta (ej: manos + pies o bloques continuos).
        const celNorm = normalizarCelular(celular)
        if (celNorm.length >= 8) {
            const { data: reservasMismoDia } = await supabaseAdmin
                .from('reservas')
                .select('id, fecha, horario, celular, estado, mp_preference_id')
                .eq('fecha', fecha)

            const turnosActivosMismoDia = (reservasMismoDia || []).filter(r => {
                if (!esTurnoActivoEnGrilla(r)) return false
                return normalizarCelular(r.celular) === celNorm
            })

            if (turnosActivosMismoDia.length >= 2) {
                const fechaLatam = fecha.split('-').reverse().join('/')
                return NextResponse.json(
                    {
                        error: `Ya tenés ${turnosActivosMismoDia.length} turnos agendados para el ${fechaLatam}. Si necesitás coordinar turnos adicionales o un servicio especial en este mismo día, por favor comunicate por WhatsApp.`
                    },
                    { status: 409 }
                )
            }
        }

        // 5. Preparar metadata con código único de seguimiento y auditoría
        const nowIso = new Date().toISOString()
        const codigoPublico = generarCodigoPublico()
        const extraAdic = calcularTotalAdicionales(adicionalesValidos)
        const totalBruto = Number(dbServicio.precio) + extraAdic
        const montoSena = Math.round(totalBruto * 0.5)

        let initPoint: string | null = null
        let mpPreferenceId: string | undefined = undefined

        // 6. Interruptor de cobro de seña (50%) — Suspendido por defecto, reactivable sin borrar código
        if (cfg.pagos_habilitados && metodo_pago === 'mp') {
            const origin = request.headers.get('origin') || 'http://localhost:3000'
            const mp = await crearPreferenciaMercadoPago({
                tituloServicio: nombreServicioPuro,
                montoSena,
                origin,
                externalReference: codigoPublico
            })
            mpPreferenceId = mp.preferenceId
            initPoint = mp.initPoint
        }

        const labelsAdic = obtenerLabelsAdicionales(adicionalesValidos)
        const metaPayload = serializeReservaMeta({
            v: 1,
            codigo: codigoPublico,
            createdAt: nowIso,
            ...(adicionalesValidos.length > 0
                ? { adicionalesSeleccionados: adicionalesValidos }
                : {}),
            ...(mpPreferenceId ? { mpPreferenceId } : {}),
            historial: [
                {
                    fecha: nowIso,
                    accion: 'creado',
                    actor: 'cliente',
                    detalle:
                        labelsAdic.length > 0
                            ? `Reserva creada desde la web con adicionales: ${labelsAdic.join(', ')}`
                            : 'Reserva creada desde la web en estado PENDIENTE'
                }
            ]
        })

        // Re-verificación inmediata antes del insert para minimizar ventana de carrera
        const { data: checkColision } = await supabaseAdmin
            .from('reservas')
            .select('id, estado, mp_preference_id')
            .eq('fecha', fecha)
            .in('horario', [horarioNorm, `${horarioNorm}:00`])

        if ((checkColision || []).some(r => esTurnoActivoEnGrilla(r))) {
            return NextResponse.json(
                { error: 'Ese horario acaba de ser tomado. Por favor seleccioná otro.' },
                { status: 409 }
            )
        }

        const insertPayload = {
            nombre: nombre.trim(),
            servicio,
            fecha,
            horario: horarioNorm,
            celular: celular.trim(),
            ...(fecha_nacimiento ? { fecha_nacimiento } : {}),
            ...(email ? { email: email.trim() } : {}),
            estado: 'pendiente',
            metodo_pago: cfg.pagos_habilitados ? metodo_pago : null,
            monto_sena: cfg.pagos_habilitados ? montoSena : 0,
            mp_preference_id: metaPayload,
            estado_pago: 'pendiente'
        }

        const { data: inserted, error: insertError } = await supabaseAdmin
            .from('reservas')
            .insert([insertPayload])
            .select('id')
            .single()

        if (insertError || !inserted) {
            console.error('Insert reserva error:', insertError)
            return NextResponse.json(
                { error: 'No se pudo registrar el turno. Intentá nuevamente.' },
                { status: 500 }
            )
        }

        // Notificar en tiempo real a todos los dispositivos (admin y clientes)
        notificarCambioServidor('reserva_nueva', {
            id: inserted.id,
            cliente: nombre,
            fecha,
            horario
        }).catch(() => {})

        return NextResponse.json({
            success: true,
            id: inserted.id,
            codigo: codigoPublico,
            estado: 'pendiente',
            minutosConfirmacion: cfg.minutos_autoconfirmacion,
            ...(initPoint ? { initPoint } : {}),
            ...(cfg.pagos_habilitados ? { montoSena } : {})
        })
    } catch (e: unknown) {
        console.error('POST /api/reservas error:', e)
        return NextResponse.json(
            { error: 'Ocurrió un error al procesar la solicitud.' },
            { status: 500 }
        )
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date')

    const cfg = await getConfigCompleta()
    await autoConfirmarPendientesVencidos(cfg.minutos_autoconfirmacion)

    const supabaseAdmin = createServiceClient()

    if (dateStr) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return NextResponse.json({ error: 'Formato de fecha inválido' }, { status: 400 })
        }
        const { data, error } = await supabaseAdmin
            .from('reservas')
            .select('id, horario, estado, mp_preference_id')
            .eq('fecha', dateStr)

        if (error) {
            return NextResponse.json({ error: 'Error al consultar' }, { status: 500 })
        }
        const disp = calcularDisponibilidadParaFecha(dateStr, cfg, data ?? [])
        return NextResponse.json({ ocupados: disp.ocupados })
    }

    // Listado completo de reservas: EXCLUSIVO para administradores autorizados (Dueña / Soporte Técnico)
    const { authorized } = await requireAdminUser()
    if (!authorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
        .from('reservas')
        .select('*')
        .order('fecha', { ascending: true })
        .order('horario', { ascending: true })

    if (error) return NextResponse.json({ error: 'Error al obtener reservas' }, { status: 500 })
    return NextResponse.json({
        reservas: (data || []).map(r => ({
            ...r,
            estadoEfectivo: getEstadoEfectivo(r)
        }))
    })
}
