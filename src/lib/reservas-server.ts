import { createServiceClient } from '@/lib/supabase/service'
import {
    generarHorariosDisponibles,
    generarHorariosBaseParaFecha,
    esDomingoDiciembre,
    getAhoraArgentina,
    getHoyArgentina,
    getEstadoEfectivo,
    esTurnoActivoEnGrilla,
    parseReservaMeta,
    serializeReservaMeta,
    normalizarCelular,
    calcularDesgloseReserva
} from '@/lib/utils'
import { isPagosHabilitadosEnv } from '@/lib/payments/mercadopago'
import { CMSContenido, DEFAULT_CMS_CONTENIDO, mergeCMSContenido } from '@/lib/cms-types'

export interface JornadaEspecial {
    fecha: string // YYYY-MM-DD
    tipo: 'cerrado' | 'reducido'
    horarios?: string[] // ej. ['08:30', '10:00']
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
    fechas_nocturno_habilitado: string[]
    cms: CMSContenido
}

export const DEFAULT_CONFIG_COMPLETA: ConfigCompleta = {
    hora_inicio: '08:30',
    hora_fin: '20:00',
    intervalo_minutos: 90,
    nombre_negocio: 'Pintaditas Nails',
    whatsapp_numero: '5493813013850',
    pagos_habilitados: false,
    minutos_autoconfirmacion: 10,
    meses_visibles_cliente: 3,
    jornadas_especiales: [],
    fechas_nocturno_habilitado: [],
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

        let fechasNocturno: string[] = []
        const rawNocturno = kvMap.get('fechas_nocturno_habilitado')
        if (rawNocturno) {
            try {
                const parsed = JSON.parse(rawNocturno)
                if (Array.isArray(parsed)) fechasNocturno = parsed
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
            fechas_nocturno_habilitado: fechasNocturno,
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
    const mes = partes[1]

    const jornada = cfg.jornadas_especiales?.find(j => j.fecha === fecha)
    const feriadoNombre = FERIADOS_ARGENTINA[fecha]
    const esDomDic = mes === 12 && dayOfWeek === 0

    // Regla de cierre:
    // 1. Si hay jornada especial 'cerrado' -> cerrado
    // 2. Si es domingo (y NO es domingo de diciembre con horario de verano) y no hay jornada especial que lo habilite -> cerrado
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

    if (dayOfWeek === 0 && !jornada && !esDomDic) {
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

    const tieneNocturno =
        Array.isArray(cfg.fechas_nocturno_habilitado) &&
        cfg.fechas_nocturno_habilitado.includes(fecha)

    const horariosDelDia =
        jornada?.tipo === 'reducido' && Array.isArray(jornada.horarios) && jornada.horarios.length > 0
            ? jornada.horarios
            : generarHorariosBaseParaFecha(fecha, tieneNocturno)

    const ocupadosMap = new Map<string, string>()

    for (const r of reservasDelDia) {
        if (!esTurnoActivoEnGrilla(r)) continue
        const hNorm = (r.horario || '').replace(/^~/, '').split('#')[0].substring(0, 5)
        const efectivo = getEstadoEfectivo(r)
        ocupadosMap.set(hNorm, efectivo)

        const meta = parseReservaMeta(r.mp_preference_id, r.id)
        if (meta.ocupaBloqueSiguiente) {
            const idx = horariosDelDia.indexOf(hNorm)
            if (idx >= 0 && idx + 1 < horariosDelDia.length) {
                const sig = horariosDelDia[idx + 1]
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

export type EtiquetaCliente = 'vip' | 'frecuente' | 'nueva' | 'atencion'

export interface FichaCRMManual {
    key: string
    nombre: string
    celular: string
    email?: string
    fecha_nacimiento?: string
    notas_tecnicas?: string
    etiqueta?: EtiquetaCliente
    dias_recordatorio_service?: number
    oculto?: boolean
}

export interface TurnoHistorialCliente {
    id: number
    fecha: string
    horario: string
    servicio: string
    estado: string
    descuento_aplicado: number
    precioBase: number
    precioFinal: number
}

export interface ResumenCliente {
    key: string
    celularNorm: string
    celularDisplay: string
    nombre: string
    email?: string
    fecha_nacimiento?: string
    notas_tecnicas?: string
    etiqueta?: EtiquetaCliente
    dias_recordatorio_service: number
    totalTurnos: number
    completados: number
    ausencias: number
    cancelados: number
    totalInvertido: number
    ultimoTurno?: string
    diasDesdeUltimoTurno: number | null
    proximoTurno?: {
        id: number
        fecha: string
        horario: string
        servicio: string
        estado: string
    }
    esCumpleHoy: boolean
    esCumpleSemana: boolean
    esCumpleMes: boolean
    necesitaService: boolean
    reservaIds: number[]
    turnos: TurnoHistorialCliente[]
}

const parsePrecioServicio = (servicioStr?: string | null): number => {
    if (!servicioStr) return 0
    const m = servicioStr.match(/\$([\d.,]+)/)
    return m ? parseInt(m[1].replace(/[.,]/g, ''), 10) || 0 : 0
}

export function checkCumpleEnSemana(fn?: string | null): boolean {
    if (!fn || fn.length < 10) return false
    const [, mStr, dStr] = fn.substring(0, 10).split('-')
    const m = parseInt(mStr, 10)
    const d = parseInt(dStr, 10)
    if (!m || !d) return false

    const ahora = getAhoraArgentina()
    ahora.setHours(0, 0, 0, 0)
    const cumpleEsteAnio = new Date(ahora.getFullYear(), m - 1, d)
    const diffDays = Math.abs((cumpleEsteAnio.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays <= 7
}

export function checkCumpleEnMes(fn?: string | null): boolean {
    if (!fn || fn.length < 10) return false
    const [, mStr] = fn.substring(0, 10).split('-')
    const m = parseInt(mStr, 10)
    if (!m) return false
    const ahora = getAhoraArgentina()
    return ahora.getMonth() + 1 === m
}

export function checkCumpleHoy(fn?: string | null): boolean {
    if (!fn || fn.length < 10) return false
    const [, mStr, dStr] = fn.substring(0, 10).split('-')
    const m = parseInt(mStr, 10)
    const d = parseInt(dStr, 10)
    const ahora = getAhoraArgentina()
    return ahora.getMonth() + 1 === m && ahora.getDate() === d
}

export async function obtenerFichasCRM(): Promise<Record<string, FichaCRMManual>> {
    try {
        const supabase = createServiceClient()
        const { data } = await supabase
            .from('configuracion')
            .select('valor')
            .eq('clave', 'clientes_crm')
            .single()
        if (data?.valor) {
            const parsed = JSON.parse(data.valor)
            if (parsed && typeof parsed === 'object') return parsed
        }
    } catch {}
    return {}
}

export function construirFichasClientes(
    reservas: any[],
    fichasCRM: Record<string, FichaCRMManual> = {}
): Map<string, ResumenCliente> {
    const map = new Map<string, ResumenCliente>()
    const hoyArg = getHoyArgentina()
    const ahoraArg = getAhoraArgentina()
    ahoraArg.setHours(0, 0, 0, 0)

    for (const r of reservas || []) {
        const norm = normalizarCelular(r.celular)
        const nombreLimpio = (r.nombre || 'Cliente').trim()
        const nombreKey = `nombre:${nombreLimpio.toLowerCase()}`
        // Si es el teléfono de prueba del salón (3813013850) y hay distintos nombres, agrupamos por nombre para no mezclar clientas distintas
        const key =
            norm && norm !== '3813013850'
                ? norm
                : norm === '3813013850'
                  ? `${norm}_${nombreLimpio.toLowerCase()}`
                  : nombreKey

        const efectivo = getEstadoEfectivo(r)
        const meta = parseReservaMeta(r.mp_preference_id, r.id)
        const hClean = (r.horario || '').replace(/^~/, '').split('#')[0].substring(0, 5)
        const desglose = calcularDesgloseReserva(r)
        const precioBase = desglose.subtotalBruto
        const desc = desglose.descuentoPct
        const precioFinal = desglose.totalFinal

        const prev: ResumenCliente = map.get(key) || {
            key,
            celularNorm: norm,
            celularDisplay: r.celular || '',
            nombre: nombreLimpio,
            email: r.email || undefined,
            fecha_nacimiento: r.fecha_nacimiento || undefined,
            notas_tecnicas: undefined,
            etiqueta: undefined,
            dias_recordatorio_service: 18,
            totalTurnos: 0,
            completados: 0,
            ausencias: 0,
            cancelados: 0,
            totalInvertido: 0,
            ultimoTurno: undefined,
            diasDesdeUltimoTurno: null,
            proximoTurno: undefined,
            esCumpleHoy: false,
            esCumpleSemana: false,
            esCumpleMes: false,
            necesitaService: false,
            reservaIds: [],
            turnos: []
        }

        if (meta.diasRecordatorioService && meta.diasRecordatorioService >= 5) {
            prev.dias_recordatorio_service = meta.diasRecordatorioService
        }
        if (meta.notasTurno && !prev.notas_tecnicas) {
            prev.notas_tecnicas = meta.notasTurno
        }

        prev.totalTurnos += 1
        prev.reservaIds.push(r.id)
        prev.turnos.push({
            id: r.id,
            fecha: r.fecha,
            horario: hClean,
            servicio: r.servicio,
            estado: efectivo,
            descuento_aplicado: desc,
            precioBase,
            precioFinal
        })

        if (efectivo === 'completado' || efectivo === 'confirmado') {
            prev.completados += 1
            prev.totalInvertido += precioFinal
        }
        if (efectivo === 'ausente') prev.ausencias += 1
        if (efectivo === 'cancelado') prev.cancelados += 1

        if (r.nombre) prev.nombre = r.nombre.trim()
        if (r.celular && !prev.celularDisplay) prev.celularDisplay = r.celular
        if (r.email && !prev.email) prev.email = r.email
        if (r.fecha_nacimiento && !prev.fecha_nacimiento) {
            prev.fecha_nacimiento = r.fecha_nacimiento
        }

        // Última visita pasada o de hoy vs próximo turno futuro
        if (r.fecha <= hoyArg && (efectivo === 'confirmado' || efectivo === 'completado')) {
            if (!prev.ultimoTurno || r.fecha > prev.ultimoTurno) {
                prev.ultimoTurno = r.fecha
            }
        }
        if (r.fecha >= hoyArg && (efectivo === 'pendiente' || efectivo === 'confirmado')) {
            if (!prev.proximoTurno || r.fecha < prev.proximoTurno.fecha) {
                prev.proximoTurno = {
                    id: r.id,
                    fecha: r.fecha,
                    horario: hClean,
                    servicio: r.servicio,
                    estado: efectivo
                }
            }
        }

        map.set(key, prev)
    }

    // Incorporar o fusionar las fichas editadas/creadas manualmente desde el CRM
    for (const [crmKey, crm] of Object.entries(fichasCRM)) {
        if (crm.oculto) {
            map.delete(crmKey)
            continue
        }
        const existente = map.get(crmKey)
        if (existente) {
            if (crm.nombre) existente.nombre = crm.nombre
            if (crm.celular !== undefined) {
                existente.celularDisplay = crm.celular
                existente.celularNorm = normalizarCelular(crm.celular)
            }
            if (crm.email !== undefined) existente.email = crm.email || undefined
            if (crm.fecha_nacimiento !== undefined) {
                existente.fecha_nacimiento = crm.fecha_nacimiento || undefined
            }
            if (crm.notas_tecnicas !== undefined) {
                existente.notas_tecnicas = crm.notas_tecnicas || undefined
            }
            if (crm.etiqueta !== undefined) {
                existente.etiqueta = crm.etiqueta
            }
            if (crm.dias_recordatorio_service !== undefined && crm.dias_recordatorio_service >= 5) {
                existente.dias_recordatorio_service = crm.dias_recordatorio_service
            }
        } else {
            map.set(crmKey, {
                key: crmKey,
                celularNorm: normalizarCelular(crm.celular),
                celularDisplay: crm.celular || '',
                nombre: crm.nombre || 'Clienta',
                email: crm.email || undefined,
                fecha_nacimiento: crm.fecha_nacimiento || undefined,
                notas_tecnicas: crm.notas_tecnicas || undefined,
                etiqueta: crm.etiqueta || 'nueva',
                dias_recordatorio_service: crm.dias_recordatorio_service || 18,
                totalTurnos: 0,
                completados: 0,
                ausencias: 0,
                cancelados: 0,
                totalInvertido: 0,
                ultimoTurno: undefined,
                diasDesdeUltimoTurno: null,
                proximoTurno: undefined,
                esCumpleHoy: false,
                esCumpleSemana: false,
                esCumpleMes: false,
                necesitaService: false,
                reservaIds: [],
                turnos: []
            })
        }
    }

    // Calcular métricas derivadas (cumpleaños, días desde último turno, alerta de service, etiqueta automática)
    for (const item of map.values()) {
        item.turnos.sort((a, b) =>
            `${b.fecha}_${b.horario}`.localeCompare(`${a.fecha}_${a.horario}`)
        )
        item.esCumpleHoy = checkCumpleHoy(item.fecha_nacimiento)
        item.esCumpleSemana = checkCumpleEnSemana(item.fecha_nacimiento)
        item.esCumpleMes = checkCumpleEnMes(item.fecha_nacimiento)

        if (item.ultimoTurno) {
            const [y, m, d] = item.ultimoTurno.split('-').map(Number)
            const fechaUlt = new Date(y, m - 1, d)
            const diff = Math.floor(
                (ahoraArg.getTime() - fechaUlt.getTime()) / (1000 * 60 * 60 * 24)
            )
            item.diasDesdeUltimoTurno = Math.max(0, diff)
        }

        const umbralService = item.dias_recordatorio_service || 18
        item.necesitaService =
            item.diasDesdeUltimoTurno !== null &&
            item.diasDesdeUltimoTurno >= umbralService &&
            !item.proximoTurno

        if (!item.etiqueta) {
            if (item.ausencias >= 2) item.etiqueta = 'atencion'
            else if (item.completados >= 5) item.etiqueta = 'vip'
            else if (item.completados >= 2) item.etiqueta = 'frecuente'
            else item.etiqueta = 'nueva'
        }
    }

    return map
}
