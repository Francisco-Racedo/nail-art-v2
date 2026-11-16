export function generarHorariosDisponibles(
    horaInicio: string,
    horaFin: string,
    intervaloMinutos: number | string
): string[] {
    const horarios: string[] = []
    const [hi, mi] = (horaInicio || '10:00').split(':').map(Number)
    const [hf, mf] = (horaFin || '22:00').split(':').map(Number)

    const intervalo =
        typeof intervaloMinutos === 'string'
            ? parseInt(intervaloMinutos, 10) || 120
            : Math.max(15, intervaloMinutos || 120)

    const inicioMins = (hi || 0) * 60 + (mi || 0)
    const finMins = (hf || 0) * 60 + (mf || 0)

    let mins = inicioMins

    // Un bloque solo se ofrece si termina a más tardar en horaFin (mins + intervalo <= finMins).
    // Ej.: 10:00 a 22:00 con bloques de 120 min -> 10:00, 12:00, 14:00, 16:00, 18:00, 20:00 (termina 22:00).
    while (mins + intervalo <= finMins) {
        horarios.push(
            `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
        )
        mins += intervalo
    }

    return horarios
}

export const TZ_ARGENTINA = 'America/Argentina/Buenos_Aires'

export function getAhoraArgentina(): Date {
    const now = new Date()
    return new Date(now.toLocaleString('en-US', { timeZone: TZ_ARGENTINA }))
}

export function formatDateYYYYMMDD(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function getHoyArgentina(): string {
    return formatDateYYYYMMDD(getAhoraArgentina())
}

export function getFinMesSiguienteArgentina(): string {
    return getFinMesesSiguientesArgentina(2)
}

export function getFinMesesSiguientesArgentina(cantidadMeses = 2): string {
    const now = getAhoraArgentina()
    const meses = Math.max(1, Math.min(24, Number(cantidadMeses) || 2))
    // cantidadMeses = 1 -> último día del mes en curso (mes + 1, día 0)
    // cantidadMeses = 2 -> último día del mes siguiente (mes + 2, día 0)
    // cantidadMeses = 3 -> último día del tercer mes (mes + 3, día 0)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + meses, 0)
    return formatDateYYYYMMDD(lastDay)
}

export function normalizarCelular(cel?: string | null): string {
    if (!cel) return ''
    const digits = cel.replace(/\D/g, '')
    if (!digits) return ''
    // Normalizamos a últimos 10 dígitos (código de área + número local en Argentina) para comparar
    if (digits.startsWith('549') && digits.length >= 13) {
        return digits.slice(3)
    }
    if (digits.startsWith('54') && digits.length >= 12) {
        return digits.slice(2)
    }
    if (digits.startsWith('0') && digits.length >= 11) {
        return digits.slice(1)
    }
    return digits
}

export function celularParaWhatsapp(cel?: string | null): string {
    const norm = normalizarCelular(cel)
    if (!norm) return ''
    return norm.startsWith('549') ? norm : `549${norm}`
}

export type SubEstadoReserva =
    | 'pendiente'
    | 'confirmado'
    | 'completado'
    | 'reprogramar'
    | 'cancelado'
    | 'ausente'
    | 'rechazado'

export interface HistorialEvento {
    fecha: string
    accion: string
    actor: 'cliente' | 'dueno' | 'auto'
    detalle?: string
}

export interface ReservaMeta {
    v: 1
    codigo: string
    createdAt: string
    confirmadoEn?: string
    confirmadoPor?: 'dueno' | 'auto' | 'cliente'
    subEstado?: SubEstadoReserva
    motivoReprogramacion?: string
    fechaOriginal?: string
    horarioOriginal?: string
    ocupaBloqueSiguiente?: boolean
    descuentoMotivo?: string
    mpPreferenceId?: string
    historial?: HistorialEvento[]
}

export function generarCodigoPublico(idFallback?: number): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
    let out = ''
    for (let i = 0; i < 10; i++) {
        out += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return idFallback ? `${out}${idFallback}` : out
}

export function parseReservaMeta(mp_preference_id?: string | null, id?: number): ReservaMeta {
    if (mp_preference_id && mp_preference_id.trim().startsWith('{')) {
        try {
            const parsed = JSON.parse(mp_preference_id)
            if (parsed && typeof parsed === 'object') {
                return {
                    v: 1,
                    codigo: parsed.codigo || `T${id || 0}`,
                    createdAt: parsed.createdAt || new Date().toISOString(),
                    ...parsed
                }
            }
        } catch {
            // Si no es JSON válido, es un preference_id clásico de MercadoPago
        }
    }
    return {
        v: 1,
        codigo: id ? `T${id}` : generarCodigoPublico(),
        createdAt: new Date(0).toISOString(),
        ...(mp_preference_id ? { mpPreferenceId: mp_preference_id } : {})
    }
}

export function serializeReservaMeta(meta: ReservaMeta): string {
    return JSON.stringify({ ...meta, v: 1 })
}

export function getEstadoEfectivo(reserva: {
    estado?: string | null
    mp_preference_id?: string | null
    id?: number
}): SubEstadoReserva {
    const meta = parseReservaMeta(reserva.mp_preference_id, reserva.id)
    if (
        meta.subEstado &&
        ['reprogramar', 'cancelado', 'ausente', 'rechazado'].includes(meta.subEstado)
    ) {
        return meta.subEstado
    }
    const base = (reserva.estado || 'pendiente') as SubEstadoReserva
    return base
}

export function esTurnoActivoEnGrilla(reserva: {
    estado?: string | null
    mp_preference_id?: string | null
    id?: number
}): boolean {
    const efectivo = getEstadoEfectivo(reserva)
    return efectivo === 'pendiente' || efectivo === 'confirmado' || efectivo === 'completado'
}
