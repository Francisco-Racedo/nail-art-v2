'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
    esUsuarioAdminAutorizado,
    requireAdminUser
} from '@/lib/auth-admin'
import {
    parseReservaMeta,
    serializeReservaMeta,
    esTurnoActivoEnGrilla,
    celularParaWhatsapp,
    generarCodigoPublico
} from '@/lib/utils'
import {
    getConfigCompleta,
    guardarKvConfig,
    JornadaEspecial
} from '@/lib/reservas-server'

const loginAttemptMap = new Map<string, { fails: number; lockUntil: number }>()

export async function login(formData: FormData) {
    const emailRaw = ((formData.get('email') as string) || '').trim().toLowerCase()
    const password = (formData.get('password') as string) || ''

    if (!emailRaw || !password) {
        return { error: 'Ingresá tu email y contraseña.' }
    }

    const now = Date.now()
    const attempt = loginAttemptMap.get(emailRaw)
    if (attempt && now < attempt.lockUntil) {
        const secs = Math.ceil((attempt.lockUntil - now) / 1000)
        return {
            error: `Demasiados intentos fallidos. Por seguridad, aguardá ${secs} segundos antes de reintentar.`
        }
    }

    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
        email: emailRaw,
        password
    })

    if (error || !data?.user) {
        const fails = (attempt?.fails || 0) + 1
        // Bloqueo progresivo tras 5 intentos fallidos (2 minutos)
        const lockUntil = fails >= 5 ? now + 2 * 60 * 1000 : 0
        loginAttemptMap.set(emailRaw, { fails, lockUntil })
        return { error: 'Credenciales incorrectas. Verificá tu email y contraseña.' }
    }

    // Verificar estrictamente que la cuenta pertenezca a la Dueña o al Administrador de Soporte Técnico
    const { autorizado } = await esUsuarioAdminAutorizado(data.user)
    if (!autorizado) {
        await supabase.auth.signOut()
        return {
            error: 'Acceso denegado: Esta cuenta no figura en la lista de administradores autorizados del salón.'
        }
    }

    loginAttemptMap.delete(emailRaw)
    revalidatePath('/', 'layout')
    return { success: true }
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/admin/login')
}

export async function reprogramarTurno(
    turnoId: number,
    nuevaFecha: string,
    nuevaHora: string
) {
    try {
        const { authorized } = await requireAdminUser()
        if (!authorized) {
            return { error: 'No autorizado' }
        }

        const supabaseAdmin = createServiceClient()
        const fechaStrict = nuevaFecha.substring(0, 10)
        const horaNorm = nuevaHora.substring(0, 5)

        const { data: actual } = await supabaseAdmin
            .from('reservas')
            .select('id, fecha, horario, mp_preference_id')
            .eq('id', turnoId)
            .single()

        if (!actual) {
            return { error: 'Turno no encontrado' }
        }

        const { data: posiblesOcupados } = await supabaseAdmin
            .from('reservas')
            .select('id, estado, mp_preference_id')
            .eq('fecha', fechaStrict)
            .in('horario', [horaNorm, `${horaNorm}:00`])
            .neq('id', turnoId)

        if ((posiblesOcupados || []).some(r => esTurnoActivoEnGrilla(r))) {
            return {
                error: 'Ese horario acaba de ser reservado por alguien más. Por favor elegí otro.'
            }
        }

        const meta = parseReservaMeta(actual.mp_preference_id, actual.id)
        const nowIso = new Date().toISOString()
        const nuevoMeta = {
            ...meta,
            subEstado: undefined,
            fechaOriginal: meta.fechaOriginal || actual.fecha,
            horarioOriginal: meta.horarioOriginal || (actual.horario || '').substring(0, 5),
            historial: [
                ...(meta.historial || []),
                {
                    fecha: nowIso,
                    accion: 'reprogramado_dueno',
                    actor: 'dueno' as const,
                    detalle: `Reprogramado de ${actual.fecha} ${(actual.horario || '').substring(0, 5)} a ${fechaStrict} ${horaNorm}`
                }
            ]
        }

        const { error } = await supabaseAdmin
            .from('reservas')
            .update({
                fecha: fechaStrict,
                horario: horaNorm,
                reprogramado: true,
                mp_preference_id: serializeReservaMeta(nuevoMeta)
            })
            .eq('id', turnoId)

        if (error) {
            console.error('SUPABASE UPDATE ERROR:', error)
            return { error: 'No se pudo actualizar el turno en la base de datos.' }
        }

        revalidatePath('/', 'layout')
        return { success: true, codigo: nuevoMeta.codigo }
    } catch (e: unknown) {
        console.error('Error en reprogramarTurno:', e)
        return { error: 'Fallo interno del servidor' }
    }
}

export interface AvisoReprogramacionCliente {
    id: number
    nombre: string
    celular: string
    wppPhone: string
    servicio: string
    fechaAnterior: string
    horarioAnterior: string
    nuevaFecha?: string
    nuevoHorario?: string
    codigo: string
}

export async function reprogramarMasivoImprevisto(input: {
    fecha: string
    desdeHora?: string
    motivo?: string
    modo: 'cliente_elige' | 'mover_dia'
    fechaDestino?: string
    bloquearDia?: boolean
}) {
    try {
        const { authorized } = await requireAdminUser()
        if (!authorized) return { error: 'No autorizado' }

        const supabaseAdmin = createServiceClient()
        const fechaOrigen = input.fecha.substring(0, 10)

        const { data: reservasDia, error } = await supabaseAdmin
            .from('reservas')
            .select('*')
            .eq('fecha', fechaOrigen)
            .order('horario', { ascending: true })

        if (error) return { error: 'Error al consultar turnos del día' }

        const afectados = (reservasDia || []).filter(r => {
            if (!esTurnoActivoEnGrilla(r)) return false
            if (input.desdeHora) {
                return (r.horario || '').substring(0, 5) >= input.desdeHora.substring(0, 5)
            }
            return true
        })

        if (afectados.length === 0) {
            // Igual permitimos bloquear el día si lo pidió
            if (input.bloquearDia) {
                await guardarJornadaEspecialAction({
                    fecha: fechaOrigen,
                    tipo: 'cerrado',
                    motivo: input.motivo || 'Cerrado por imprevisto'
                })
            }
            return { success: true, avisos: [], mensaje: 'Día bloqueado (no había turnos activos).' }
        }

        const nowIso = new Date().toISOString()
        const avisos: AvisoReprogramacionCliente[] = []

        if (input.modo === 'mover_dia') {
            const destino = (input.fechaDestino || '').substring(0, 10)
            if (!destino || destino === fechaOrigen) {
                return { error: 'Debés elegir una fecha de destino distinta.' }
            }

            const { data: existentesDestino } = await supabaseAdmin
                .from('reservas')
                .select('id, horario, estado, mp_preference_id')
                .eq('fecha', destino)

            const horasOcupadasDestino = new Set(
                (existentesDestino || [])
                    .filter(r => esTurnoActivoEnGrilla(r))
                    .map(r => (r.horario || '').substring(0, 5))
            )

            const conflictos = afectados.filter(a =>
                horasOcupadasDestino.has((a.horario || '').substring(0, 5))
            )
            if (conflictos.length > 0) {
                return {
                    error: `La fecha destino (${destino.split('-').reverse().join('/')}) ya tiene ocupados los horarios: ${conflictos.map(c => (c.horario || '').substring(0, 5)).join(', ')}. Usá el modo "El cliente elige desde su link" o elegí otra fecha.`
                }
            }

            for (const r of afectados) {
                const meta = parseReservaMeta(r.mp_preference_id, r.id)
                const hCorto = (r.horario || '').substring(0, 5)
                const nuevoMeta = {
                    ...meta,
                    subEstado: undefined,
                    motivoReprogramacion: input.motivo || 'Reprogramación de jornada',
                    fechaOriginal: meta.fechaOriginal || r.fecha,
                    horarioOriginal: meta.horarioOriginal || hCorto,
                    historial: [
                        ...(meta.historial || []),
                        {
                            fecha: nowIso,
                            accion: 'reprogramado_masivo_dia',
                            actor: 'dueno' as const,
                            detalle: `Trasladado de ${r.fecha} a ${destino} (${hCorto})`
                        }
                    ]
                }

                await supabaseAdmin
                    .from('reservas')
                    .update({
                        fecha: destino,
                        reprogramado: true,
                        mp_preference_id: serializeReservaMeta(nuevoMeta)
                    })
                    .eq('id', r.id)

                avisos.push({
                    id: r.id,
                    nombre: r.nombre,
                    celular: r.celular || '',
                    wppPhone: celularParaWhatsapp(r.celular),
                    servicio: r.servicio,
                    fechaAnterior: r.fecha,
                    horarioAnterior: hCorto,
                    nuevaFecha: destino,
                    nuevoHorario: hCorto,
                    codigo: nuevoMeta.codigo
                })
            }
        } else {
            // modo === 'cliente_elige': libera el horario y pasa cada turno a 'reprogramar'
            for (const r of afectados) {
                const meta = parseReservaMeta(r.mp_preference_id, r.id)
                const hCorto = (r.horario || '').substring(0, 5)
                const nuevoMeta = {
                    ...meta,
                    subEstado: 'reprogramar' as const,
                    motivoReprogramacion:
                        input.motivo ||
                        'Surgió un imprevisto en el salón. Por favor elegí tu nuevo día y horario disponible.',
                    fechaOriginal: meta.fechaOriginal || r.fecha,
                    horarioOriginal: meta.horarioOriginal || hCorto,
                    historial: [
                        ...(meta.historial || []),
                        {
                            fecha: nowIso,
                            accion: 'imprevisto_cliente_elige',
                            actor: 'dueno' as const,
                            detalle: input.motivo || 'Solicitada reprogramación por imprevisto'
                        }
                    ]
                }

                await supabaseAdmin
                    .from('reservas')
                    .update({
                        reprogramado: true,
                        mp_preference_id: serializeReservaMeta(nuevoMeta)
                    })
                    .eq('id', r.id)

                avisos.push({
                    id: r.id,
                    nombre: r.nombre,
                    celular: r.celular || '',
                    wppPhone: celularParaWhatsapp(r.celular),
                    servicio: r.servicio,
                    fechaAnterior: r.fecha,
                    horarioAnterior: hCorto,
                    codigo: nuevoMeta.codigo
                })
            }
        }

        if (input.bloquearDia) {
            await guardarJornadaEspecialAction({
                fecha: fechaOrigen,
                tipo: 'cerrado',
                motivo: input.motivo || 'Cerrado por imprevisto'
            })
        }

        revalidatePath('/', 'layout')
        return { success: true, avisos }
    } catch (e: unknown) {
        console.error('Error en reprogramarMasivoImprevisto:', e)
        return { error: 'Error al aplicar la reprogramación masiva' }
    }
}

export async function guardarJornadaEspecialAction(jornada: JornadaEspecial) {
    const { authorized } = await requireAdminUser()
    if (!authorized) return { error: 'No autorizado' }

    const cfg = await getConfigCompleta()
    const resto = cfg.jornadas_especiales.filter(j => j.fecha !== jornada.fecha)
    const nuevas = [...resto, jornada].sort((a, b) => a.fecha.localeCompare(b.fecha))

    await guardarKvConfig([{ clave: 'jornadas_especiales', valor: JSON.stringify(nuevas) }])
    revalidatePath('/', 'layout')
    return { success: true, jornadas: nuevas }
}

export async function eliminarJornadaEspecialAction(fecha: string) {
    const { authorized } = await requireAdminUser()
    if (!authorized) return { error: 'No autorizado' }

    const cfg = await getConfigCompleta()
    const nuevas = cfg.jornadas_especiales.filter(j => j.fecha !== fecha)
    await guardarKvConfig([{ clave: 'jornadas_especiales', valor: JSON.stringify(nuevas) }])
    revalidatePath('/', 'layout')
    return { success: true, jornadas: nuevas }
}

export async function toggleTurnoNocturnoAction(fecha: string, habilitar?: boolean) {
    const { authorized } = await requireAdminUser()
    if (!authorized) return { error: 'No autorizado' }

    const cfg = await getConfigCompleta()
    const current = new Set(cfg.fechas_nocturno_habilitado || [])
    const fNorm = (fecha || '').substring(0, 10)

    const shouldEnable = habilitar !== undefined ? habilitar : !current.has(fNorm)
    if (shouldEnable) {
        current.add(fNorm)
    } else {
        current.delete(fNorm)
    }

    const nuevaLista = Array.from(current).sort()
    await guardarKvConfig([
        { clave: 'fechas_nocturno_habilitado', valor: JSON.stringify(nuevaLista) }
    ])

    revalidatePath('/', 'layout')
    revalidatePath('/admin/dashboard')

    return { success: true, habilitado: shouldEnable, fechas: nuevaLista }
}

export async function actualizarMesesVisiblesAction(meses: number) {
    const { authorized } = await requireAdminUser()
    if (!authorized) return { error: 'No autorizado' }

    const valorLimpio = Math.max(1, Math.min(12, Number(meses) || 3))
    await guardarKvConfig([{ clave: 'meses_visibles_cliente', valor: String(valorLimpio) }])
    revalidatePath('/', 'layout')
    revalidatePath('/admin/dashboard')
    revalidatePath('/admin/dashboard/ajustes')
    return { success: true, meses: valorLimpio }
}

export async function crearTurnoManualAdmin(input: {
    nombre: string
    celular?: string
    servicio: string
    fecha: string
    horario: string
    estado?: 'pendiente' | 'confirmado'
}) {
    try {
        const { authorized } = await requireAdminUser()
        if (!authorized) return { error: 'No autorizado' }

        const nombre = (input.nombre || '').trim()
        const servicio = (input.servicio || '').trim()
        const fecha = (input.fecha || '').substring(0, 10)
        const horario = (input.horario || '').substring(0, 5)
        const estado = input.estado || 'confirmado'

        if (nombre.length < 2 || !servicio || !fecha || !horario) {
            return { error: 'Completá nombre, servicio, fecha y horario.' }
        }

        const supabaseAdmin = createServiceClient()
        const { data: existentes } = await supabaseAdmin
            .from('reservas')
            .select('id, estado, mp_preference_id')
            .eq('fecha', fecha)
            .in('horario', [horario, `${horario}:00`])

        if ((existentes || []).some(r => esTurnoActivoEnGrilla(r))) {
            return { error: 'Ese horario ya está ocupado en esta fecha.' }
        }

        const nowIso = new Date().toISOString()
        const codigo = generarCodigoPublico()
        const meta = serializeReservaMeta({
            v: 1,
            codigo,
            createdAt: nowIso,
            ...(estado === 'confirmado'
                ? { confirmadoEn: nowIso, confirmadoPor: 'dueno' as const }
                : {}),
            historial: [
                {
                    fecha: nowIso,
                    accion: 'creado_admin',
                    actor: 'dueno',
                    detalle: 'Turno asignado manualmente desde el panel administrativo'
                }
            ]
        })

        const { error } = await supabaseAdmin.from('reservas').insert([
            {
                nombre,
                celular: (input.celular || '').trim() || null,
                servicio,
                fecha,
                horario,
                estado,
                mp_preference_id: meta,
                estado_pago: 'pendiente'
            }
        ])

        if (error) {
            console.error('Error crearTurnoManualAdmin:', error)
            return { error: 'No se pudo guardar el turno.' }
        }

        revalidatePath('/', 'layout')
        return { success: true, codigo }
    } catch {
        return { error: 'Error al crear el turno.' }
    }
}

