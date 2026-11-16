import { createServiceClient } from '@/lib/supabase/service'
import {
    generarHorariosDisponibles,
    getAhoraArgentina,
    getHoyArgentina,
    getEstadoEfectivo,
    esTurnoActivoEnGrilla,
    parseReservaMeta,
    serializeReservaMeta,
    normalizarCelular
} from '@/lib/utils'
import { isPagosHabilitadosEnv } from '@/lib/payments/mercadopago'
import { CMSContenido, DEFAULT_CMS_CONTENIDO, mergeCMSContenido } from '@/lib/cms-types'

export interface JornadaEspecial {
    fecha: string // YYYY-MM-DD
    tipo: 'cerrado' | 'reducido'
    horarios?: string[] // ej. ['10:00', '12:00', '14:00']
    motivo?: string
}

export interface ConfigCompleta {
    id?: number
    hora_inicio: string
    hora_fin: string
    intervalo_minutos: number
    nombre_negocio: string
    whatsapp_numero: string
    pagos_habilitados: boolean
    minutos_autoconfirmacion: number
    meses_visibles_cliente: number
    jornadas_especiales: JornadaEspecial[]
    cms: CMSContenido
}

export const DEFAULT_CONFIG_COMPLETA: ConfigCompleta = {
    hora_inicio: '10:00',
    hora_fin: '22:00',
    intervalo_minutos: 120,
    nombre_negocio: 'Pintitas Nails',
    whatsapp_numero: '5493813013850',
    pagos_habilitados: false,
    minutos_autoconfirmacion: 10,
    meses_visibles_cliente: 3,
    jornadas_especiales: [],
    cms: DEFAULT_CMS_CONTENIDO
}

// Feriados nacionales de Argentina (precargados como referencia para el calendario)
export const FERIADOS_ARGENTINA: Record<string, string> = {
    '2026-01-01': 'Año Nuevo',
    '2026-02-16': 'Carnaval',
    '2026-02-17': 'Carnaval',
    '2026-03-24': 'Día de la Memoria',
    '2026-04-02': 'Malvinas',
    '2026-04-03': 'Viernes Santo',
    '2026-05-01': 'Día del Trabajador',
    '2026-05-25': 'Revolución de Mayo',
    '2026-06-20': 'Paso a la Inmortalidad de Belgrano',
    '2026-07-09': 'Día de la Independencia',
    '2026-08-17': 'Paso a la Inmortalidad de San Martín',
    '2026-10-12': 'Diversidad Cultural',
    '2026-11-20': 'Día de la Soberanía Nacional',
    '2026-11-23': 'Feriado puente turístico',
    '2026-12-08': 'Inmaculada Concepción',
    '2026-12-25': 'Navidad'
}

export async function getConfigCompleta(): Promise<ConfigCompleta> {
    try {
        const supabase = createServiceClient()
        const [cfgRes, kvRes] = await Promise.all([
            supabase.from('config').select('*').limit(1).single(),
            supabase.from('configuracion').select('clave, valor')
        ])

        const base = cfgRes.data || {}
        const kvMap = new Map<string, string>()
        for (const row of kvRes.data || []) {
            kvMap.set(row.clave, row.valor)
        }

        let jornadas: JornadaEspecial[] = []
        const rawJornadas = kvMap.get('jornadas_especiales')
        if (rawJornadas) {
            try {
                const parsed = JSON.parse(rawJornadas)
                if (Array.isArray(parsed)) jornadas = parsed
            } catch {}
        }

        const pagosKv = kvMap.get('pagos_habilitados')
        const pagosHabilitados =
            pagosKv !== undefined ? pagosKv === 'true' : isPagosHabilitadosEnv()

        const minAuto = parseInt(kvMap.get('minutos_autoconfirmacion') || '10', 10)
        const mesesVisibles = parseInt(kvMap.get('meses_visibles_cliente') || '3', 10)
        const cms = mergeCMSContenido(kvMap.get('cms_contenido'))

        return {
            id: base.id ?? 1,
            hora_inicio: kvMap.get('hora_inicio') || base.hora_inicio || DEFAULT_CONFIG_COMPLETA.hora_inicio,
            hora_fin: kvMap.get('hora_fin') || base.hora_fin || DEFAULT_CONFIG_COMPLETA.hora_fin,
            intervalo_minutos:
                Number(kvMap.get('intervalo_minutos') || base.intervalo_minutos) ||
                DEFAULT_CONFIG_COMPLETA.intervalo_minutos,
            nombre_negocio:
                kvMap.get('nombre_negocio') ||
                base.nombre_negocio ||
                DEFAULT_CONFIG_COMPLETA.nombre_negocio,
            whatsapp_numero:
                kvMap.get('whatsapp_numero') ||
                base.whatsapp_numero ||
                DEFAULT_CONFIG_COMPLETA.whatsapp_numero,
            pagos_habilitados: pagosHabilitados,
            minutos_autoconfirmacion: isNaN(minAuto) ? 10 : minAuto,
            meses_visibles_cliente: isNaN(mesesVisibles) ? 3 : Math.max(1, Math.min(12, mesesVisibles)),
            jornadas_especiales: jornadas,
            cms
        }
    } catch {
        return DEFAULT_CONFIG_COMPLETA
    }
}

export async function guardarKvConfig(entries: { clave: string; valor: string }[]) {
    const supabase = createServiceClient()
    const { error } = await supabase
        .from('configuracion')
        .upsert(entries, { onConflict: 'clave' })
    if (error) throw error
}

/**
 * Auto-confirma cualquier turno en estado 'pendiente' que haya superado la ventana máxima
 * de confirmación (por defecto 10 minutos).
 */
export async function autoConfirmarPendientesVencidos(minutosMax = 10): Promise<number> {
    try {
        const supabase = createServiceClient()
        const hoy = getHoyArgentina()
        const { data: pendientes, error } = await supabase
            .from('reservas')
            .select('id, estado, mp_preference_id, fecha')
            .eq('estado', 'pendiente')
            .gte('fecha', hoy)

        if (error || !pendientes || pendientes.length === 0) return 0

        const nowMs = Date.now()
        const limitMs = Math.max(0, minutosMax) * 60 * 1000
        let confirmadosCount = 0

        for (const r of pendientes) {
            const efectivo = getEstadoEfectivo(r)
            if (efectivo !== 'pendiente') continue

            const meta = parseReservaMeta(r.mp_preference_id, r.id)
            // Solo auto-confirmamos turnos que tengan timestamp real de creación en su metadata
            if (!meta.createdAt || meta.createdAt.startsWith('1970-')) continue

            const createdMs = new Date(meta.createdAt).getTime()
            if (isNaN(createdMs)) continue

            if (nowMs - createdMs >= limitMs) {
                const nowIso = new Date().toISOString()
                const nuevoMeta = {
                    ...meta,
                    confirmadoEn: nowIso,
                    confirmadoPor: 'auto' as const,
                    historial: [
                        ...(meta.historial || []),
                        {
                            fecha: nowIso,
                            accion: 'confirmado_automatico',
                            actor: 'auto' as const,
                            detalle: `Confirmado automáticamente tras ${minutosMax} min`
                        }
                    ]
                }

                const { error: updErr } = await supabase
                    .from('reservas')
                    .update({
                        estado: 'confirmado',
                        mp_preference_id: serializeReservaMeta(nuevoMeta)
                    })
                    .eq('id', r.id)

                if (!updErr) confirmadosCount++
            }
        }

        return confirmadosCount
    } catch {
        return 0
    }
}

export interface DisponibilidadDia {
    fecha: string
    cerrado: boolean
    esFeriado: boolean
    motivo?: string
    horariosBase: string[]
    ocupados: { horario: string; estado: string }[]
    libresCount: number
    totalSlots: number
    semaforo: 'cerrado' | 'completo' | 'pocos' | 'disponible'
}

export function calcularDisponibilidadParaFecha(
    fecha: string,
    cfg: ConfigCompleta,
    reservasDelDia: { id?: number; horario: string; estado?: string | null; mp_preference_id?: string | null }[]
): DisponibilidadDia {
    const partes = fecha.split('-').map(Number)
    const d = new Date(partes[0], partes[1] - 1, partes[2])
    const dayOfWeek = d.getDay() // 0 = Domingo

    const jornada = cfg.jornadas_especiales.find(j => j.fecha === fecha)
    const feriadoNombre = FERIADOS_ARGENTINA[fecha]

    const todosLosHorarios = generarHorariosDisponibles(
        cfg.hora_inicio,
        cfg.hora_fin,
        cfg.intervalo_minutos
    )

    // Regla de cierre:
    // 1. Si hay jornada especial 'cerrado' -> cerrado
    // 2. Si es domingo y no hay jornada especial 'reducido' que lo habilite -> cerrado
    if (jornada?.tipo === 'cerrado') {
        return {
            fecha,
            cerrado: true,
            esFeriado: !!feriadoNombre,
            motivo: jornada.motivo || feriadoNombre || 'Cerrado',
            horariosBase: [],
            ocupados: [],
            libresCount: 0,
            totalSlots: 0,
            semaforo: 'cerrado'
        }
    }

    if (dayOfWeek === 0 && !jornada) {
        return {
            fecha,
            cerrado: true,
            esFeriado: !!feriadoNombre,
            motivo: 'Domingo (cerrado)',
            horariosBase: [],
            ocupados: [],
            libresCount: 0,
            totalSlots: 0,
            semaforo: 'cerrado'
        }
    }

    const horariosDelDia =
        jornada?.tipo === 'reducido' && Array.isArray(jornada.horarios) && jornada.horarios.length > 0
            ? jornada.horarios
            : todosLosHorarios

    const ocupadosMap = new Map<string, string>()

    // Si es hoy en Argentina, marcar como no disponibles los horarios que ya pasaron
    const hoyArg = getHoyArgentina()
    if (fecha === hoyArg) {
        const ahoraArg = getAhoraArgentina()
        const minsAhora = ahoraArg.getHours() * 60 + ahoraArg.getMinutes()
        for (const h of horariosDelDia) {
            const [hh, mm] = h.split(':').map(Number)
            if (hh * 60 + mm <= minsAhora) {
                ocupadosMap.set(h, 'completado')
            }
        }
    }

    for (const r of reservasDelDia) {
        if (!esTurnoActivoEnGrilla(r)) continue
        const hNorm = (r.horario || '').substring(0, 5)
        const efectivo = getEstadoEfectivo(r)
        ocupadosMap.set(hNorm, efectivo)

        const meta = parseReservaMeta(r.mp_preference_id, r.id)
        if (meta.ocupaBloqueSiguiente) {
            const idx = todosLosHorarios.indexOf(hNorm)
            if (idx >= 0 && idx + 1 < todosLosHorarios.length) {
                const sig = todosLosHorarios[idx + 1]
                if (!ocupadosMap.has(sig)) {
                    ocupadosMap.set(sig, efectivo)
                }
            }
        }
    }

    const ocupados = Array.from(ocupadosMap.entries()).map(([horario, estado]) => ({
        horario,
        estado
    }))

    const libresCount = horariosDelDia.filter(h => !ocupadosMap.has(h)).length
    const totalSlots = horariosDelDia.length

    let semaforo: DisponibilidadDia['semaforo'] = 'disponible'
    if (totalSlots === 0) {
        semaforo = 'cerrado'
    } else if (libresCount === 0) {
        semaforo = 'completo'
    } else if (libresCount <= 2) {
        semaforo = 'pocos'
    }

    return {
        fecha,
        cerrado: false,
        esFeriado: !!feriadoNombre,
        motivo: jornada?.motivo || feriadoNombre,
        horariosBase: horariosDelDia,
        ocupados,
        libresCount,
        totalSlots,
        semaforo
    }
}

export async function obtenerDisponibilidadRango(
    desde: string,
    hasta: string
): Promise<{ config: ConfigCompleta; dias: Record<string, DisponibilidadDia> }> {
    const cfg = await getConfigCompleta()
    await autoConfirmarPendientesVencidos(cfg.minutos_autoconfirmacion)

    const supabase = createServiceClient()
    const { data: reservas } = await supabase
        .from('reservas')
        .select('id, fecha, horario, estado, mp_preference_id')
        .gte('fecha', desde)
        .lte('fecha', hasta)

    const porFecha = new Map<string, typeof reservas>()
    for (const r of reservas || []) {
        const list = porFecha.get(r.fecha) || []
        list.push(r)
        porFecha.set(r.fecha, list)
    }

    const dias: Record<string, DisponibilidadDia> = {}
    const [y1, m1, d1] = desde.split('-').map(Number)
    const [y2, m2, d2] = hasta.split('-').map(Number)
    const cur = new Date(y1, m1 - 1, d1)
    const end = new Date(y2, m2 - 1, d2)

    let guard = 0
    while (cur <= end && guard < 400) {
        guard++
        const fStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
        dias[fStr] = calcularDisponibilidadParaFecha(fStr, cfg, porFecha.get(fStr) || [])
        cur.setDate(cur.getDate() + 1)
    }

    return { config: cfg, dias }
}

export interface ResumenCliente {
    celularNorm: string
    celularDisplay: string
    nombre: string
    email?: string
    fecha_nacimiento?: string
    totalTurnos: number
    completados: number
    ausencias: number
    cancelados: number
    ultimoTurno?: string
    esCumpleSemana: boolean
}

export function checkCumpleEnSemana(fn?: string | null): boolean {
    if (!fn || fn.length < 10) return false
    const [, mStr, dStr] = fn.substring(0, 10).split('-')
    const m = parseInt(mStr, 10)
    const d = parseInt(dStr, 10)
    if (!m || !d) return false

    const ahora = getAhoraArgentina()
    const cumpleEsteAnio = new Date(ahora.getFullYear(), m - 1, d)
    const diffDays = Math.abs((cumpleEsteAnio.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays <= 7
}

export function construirFichasClientes(reservas: any[]): Map<string, ResumenCliente> {
    const map = new Map<string, ResumenCliente>()
    for (const r of reservas || []) {
        const norm = normalizarCelular(r.celular)
        const key = norm || `nombre:${(r.nombre || '').toLowerCase().trim()}`
        const efectivo = getEstadoEfectivo(r)

        const prev = map.get(key) || {
            celularNorm: norm,
            celularDisplay: r.celular || '',
            nombre: r.nombre || 'Cliente',
            email: r.email || undefined,
            fecha_nacimiento: r.fecha_nacimiento || undefined,
            totalTurnos: 0,
            completados: 0,
            ausencias: 0,
            cancelados: 0,
            ultimoTurno: undefined,
            esCumpleSemana: false
        }

        prev.totalTurnos += 1
        if (efectivo === 'completado' || efectivo === 'confirmado') prev.completados += 1
        if (efectivo === 'ausente') prev.ausencias += 1
        if (efectivo === 'cancelado') prev.cancelados += 1
        if (r.nombre) prev.nombre = r.nombre
        if (r.celular) prev.celularDisplay = r.celular
        if (r.email) prev.email = r.email
        if (r.fecha_nacimiento) {
            prev.fecha_nacimiento = r.fecha_nacimiento
            prev.esCumpleSemana = checkCumpleEnSemana(r.fecha_nacimiento)
        }
        if (!prev.ultimoTurno || r.fecha > prev.ultimoTurno) {
            prev.ultimoTurno = r.fecha
        }

        map.set(key, prev)
    }
    return map
}
