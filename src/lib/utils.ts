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

export function getPartesAhoraArgentina(): {
    year: number
    month: number
    day: number
    hour: number
    minute: number
    second: number
} {
    const now = new Date()
    const dtf = new Intl.DateTimeFormat('en-CA', {
        timeZone: TZ_ARGENTINA,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    })
    const parts = dtf.formatToParts(now)
    const map: Record<string, string> = {}
    for (const p of parts) {
        if (p.type !== 'literal') map[p.type] = p.value
    }
    const year = parseInt(map.year || '2026', 10)
    const month = parseInt(map.month || '1', 10)
    const day = parseInt(map.day || '1', 10)
    const rawHour = parseInt(map.hour || '0', 10)
    const hour = rawHour === 24 ? 0 : rawHour
    const minute = parseInt(map.minute || '0', 10)
    const second = parseInt(map.second || '0', 10)
    return { year, month, day, hour, minute, second }
}

export function getAhoraArgentina(): Date {
    const p = getPartesAhoraArgentina()
    return new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
}

export function formatDateYYYYMMDD(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function getHoyArgentina(): string {
    const p = getPartesAhoraArgentina()
    return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

export function parseFechaLocalYYYYMMDD(fechaStr: string): Date {
    const clean = (fechaStr || '').substring(0, 10)
    const [y, m, d] = clean.split('-').map(Number)
    if (!y || !m || !d) return getAhoraArgentina()
    return new Date(y, m - 1, d, 12, 0, 0)
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
    diasRecordatorioService?: number
    notasTurno?: string
    precioPersonalizado?: number
    adicionalesSeleccionados?: string[]
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

export interface AdicionalCatalogo {
    id: string
    label: string
    precio: number
}

export const ADICIONALES_CATALOGO: AdicionalCatalogo[] = [
    { id: 'strass', label: 'Strass / Piedrería', precio: 1500 },
    { id: 'una_quebrada', label: 'Arreglo de uña quebrada', precio: 1500 },
    { id: 'pigmentos', label: 'Pigmentos / Efecto Aurora', precio: 2000 },
    { id: 'cat_eye', label: 'Efecto Cat Eye', precio: 2000 },
    { id: 'francesas', label: 'Francesas (10 uñas)', precio: 2000 },
    { id: 'dibujos', label: 'Dibujos / Nail Art', precio: 2500 },
    { id: 'retirado_otro', label: 'Retirado de otro salón', precio: 3000 }
]

export function parsePrecioServicioBase(servicioStr?: string | null): number {
    if (!servicioStr) return 0
    const m = servicioStr.match(/\$([\d.,]+)/)
    return m ? parseInt(m[1].replace(/[.,]/g, ''), 10) || 0 : 0
}

export function calcularTotalAdicionales(ids?: string[] | null): number {
    if (!Array.isArray(ids) || ids.length === 0) return 0
    return ids.reduce((acc, id) => {
        const found = ADICIONALES_CATALOGO.find(a => a.id === id)
        return acc + (found ? found.precio : 0)
    }, 0)
}

export function obtenerLabelsAdicionales(ids?: string[] | null): string[] {
    if (!Array.isArray(ids) || ids.length === 0) return []
    return ids
        .map(id => ADICIONALES_CATALOGO.find(a => a.id === id)?.label)
        .filter((x): x is string => !!x)
}

export function calcularDesgloseReserva(reserva: {
    servicio?: string | null
    descuento_aplicado?: number | null
    mp_preference_id?: string | null
    id?: number
    adicionalesOverride?: string[]
    precioManualOverride?: number | null
}) {
    const meta = parseReservaMeta(reserva.mp_preference_id, reserva.id)
    const precioBaseServicio = parsePrecioServicioBase(reserva.servicio)
    const adicionalesIds =
        reserva.adicionalesOverride !== undefined
            ? reserva.adicionalesOverride
            : meta.adicionalesSeleccionados || []
    const montoAdicionales = calcularTotalAdicionales(adicionalesIds)
    const subtotalAutomatico = precioBaseServicio + montoAdicionales

    const rawManual =
        reserva.precioManualOverride !== undefined
            ? reserva.precioManualOverride
            : meta.precioPersonalizado

    const usaPrecioManual =
        typeof rawManual === 'number' && !isNaN(rawManual) && rawManual >= 0

    const subtotalBruto = usaPrecioManual ? rawManual! : subtotalAutomatico
    const descuentoPct = Number(reserva.descuento_aplicado) || 0
    const montoDescuento = Math.round(subtotalBruto * (descuentoPct / 100))
    const totalFinal = Math.max(0, subtotalBruto - montoDescuento)

    return {
        precioBaseServicio,
        adicionalesIds,
        montoAdicionales,
        subtotalAutomatico,
        usaPrecioManual,
        subtotalBruto,
        descuentoPct,
        montoDescuento,
        totalFinal
    }
}
