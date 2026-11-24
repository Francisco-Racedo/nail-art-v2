export const HORARIOS_ESTANDAR_HABITUALES = [
    '08:30',
    '10:00',
    '13:30',
    '15:00',
    '16:30',
    '18:00'
]

export const HORARIO_NOCTURNO_EXTRA = '21:00'

export const HORARIOS_DOMINGO_DICIEMBRE = [
    '11:00',
    '12:30',
    '14:00',
    '16:00'
]

export const TODOS_LOS_HORARIOS_SISTEMA = [
    '08:30',
    '10:00',
    '11:00',
    '12:30',
    '13:30',
    '14:00',
    '15:00',
    '16:00',
    '16:30',
    '18:00',
    '21:00'
]

export function formatearBloqueHorario(horario: string, intervaloMinutos = 90): string {
    const parts = (horario || '08:30').split(':')
    let h = parseInt(parts[0], 10) || 0
    let m = parseInt(parts[1], 10) || 0
    m += intervaloMinutos
    h += Math.floor(m / 60)
    m = m % 60
    const fin = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    return `${horario} a ${fin} hs`
}

export function esDomingoDiciembre(fecha: string): boolean {
    const partes = (fecha || '').substring(0, 10).split('-').map(Number)
    if (partes.length < 3 || isNaN(partes[0])) return false
    const d = new Date(partes[0], partes[1] - 1, partes[2])
    return partes[1] === 12 && d.getDay() === 0
}

export function generarHorariosBaseParaFecha(
    fecha: string,
    nocturnoHabilitado = false
): string[] {
    const partes = (fecha || '').substring(0, 10).split('-').map(Number)
    if (partes.length < 3 || isNaN(partes[0])) return [...HORARIOS_ESTANDAR_HABITUALES]
    const d = new Date(partes[0], partes[1] - 1, partes[2])
    const dayOfWeek = d.getDay() // 0 = Domingo
    const mes = partes[1]

    if (dayOfWeek === 0) {
        // Domingo
        if (mes === 12) {
            // Domingos de Diciembre: temporada verano reducida 11:00 a 16:00 hs (último turno 16:00)
            const dom = [...HORARIOS_DOMINGO_DICIEMBRE]
            if (nocturnoHabilitado && !dom.includes(HORARIO_NOCTURNO_EXTRA)) {
                dom.push(HORARIO_NOCTURNO_EXTRA)
            }
            return dom
        }
        // Resto del año: domingos cerrados
        return []
    }

    // Lunes a Sábado:
    const base = [...HORARIOS_ESTANDAR_HABITUALES]
    if (nocturnoHabilitado && !base.includes(HORARIO_NOCTURNO_EXTRA)) {
        base.push(HORARIO_NOCTURNO_EXTRA)
    }
    return base
}

export function generarHorariosDisponibles(
    horaInicio: string,
    horaFin: string,
    intervaloMinutos: number | string
): string[] {
    const intervalo =
        typeof intervaloMinutos === 'string'
            ? parseInt(intervaloMinutos, 10) || 90
            : Math.max(15, intervaloMinutos || 90)

    // Si coincide con la configuración por defecto de verano (08:30 a 20:00 / 22:00 con 90m),
    // devolvemos los turnos estándar de mañana y tarde
    if (
        (horaInicio === '08:30' || !horaInicio) &&
        (horaFin === '20:00' || horaFin === '22:00' || !horaFin) &&
        intervalo === 90
    ) {
        return [...HORARIOS_ESTANDAR_HABITUALES]
    }

    const horarios: string[] = []
    const [hi, mi] = (horaInicio || '08:30').split(':').map(Number)
    const [hf, mf] = (horaFin || '20:00').split(':').map(Number)

    const inicioMins = (hi || 0) * 60 + (mi || 0)
    const finMins = (hf || 0) * 60 + (mf || 0)

    let mins = inicioMins

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

export interface ReglaTransicionEstado {
    permitidos: SubEstadoReserva[]
    motivoBloqueo: Record<string, string>
}

export const TRANSICIONES_ESTADO: Record<SubEstadoReserva, ReglaTransicionEstado> = {
    pendiente: {
        permitidos: ['confirmado', 'reprogramar', 'cancelado'],
        motivoBloqueo: {
            pendiente: 'El turno ya se encuentra en estado Pendiente.',
            completado: 'Un turno pendiente debe ser confirmado y atendido antes de marcarse como completado.',
            ausente: 'No se puede marcar ausente a un turno que aún no fue confirmado.'
        }
    },
    confirmado: {
        permitidos: ['completado', 'reprogramar', 'ausente', 'cancelado'],
        motivoBloqueo: {
            confirmado: 'El turno ya se encuentra Confirmado.',
            pendiente: 'No se puede retroceder en los estados: Un turno confirmado ya fue acordado con la clienta y no puede volver a estar pendiente de confirmación.'
        }
    },
    completado: {
        permitidos: ['confirmado'],
        motivoBloqueo: {
            completado: 'El turno ya está Completado y cerrado.',
            pendiente: 'No se puede retroceder a pendiente un turno que ya fue atendido y finalizado.',
            reprogramar: 'El servicio ya fue realizado con éxito.',
            ausente: 'El servicio ya fue realizado con éxito.',
            cancelado: 'El servicio ya fue realizado con éxito.'
        }
    },
    reprogramar: {
        permitidos: ['confirmado', 'cancelado'],
        motivoBloqueo: {
            reprogramar: 'El turno ya se encuentra en espera de Reprogramación.',
            pendiente: 'Un turno en reprogramación no puede retroceder a pendiente.',
            completado: 'El turno debe tener día y horario asignado antes de completarse.',
            ausente: 'El turno está pendiente de reasignación.'
        }
    },
    ausente: {
        permitidos: ['reprogramar', 'cancelado'],
        motivoBloqueo: {
            ausente: 'El turno ya está marcado como Ausente.',
            pendiente: 'No se puede retroceder a pendiente una inasistencia.',
            confirmado: 'Para reactivar una cita ausente, seleccione "A Reprogramar" para asignar nueva fecha.',
            completado: 'No se puede completar un turno en el que la clienta no se presentó.'
        }
    },
    cancelado: {
        permitidos: ['reprogramar'],
        motivoBloqueo: {
            cancelado: 'El turno ya se encuentra Cancelado.',
            pendiente: 'Un turno cancelado no puede retroceder a pendiente.',
            confirmado: 'Para volver a agendar un turno cancelado, elija "A Reprogramar".',
            completado: 'No se puede completar un turno cancelado.',
            ausente: 'El turno fue cancelado.'
        }
    },
    rechazado: {
        permitidos: ['reprogramar'],
        motivoBloqueo: {
            rechazado: 'El turno ya se encuentra Rechazado.',
            pendiente: 'Un turno rechazado no puede retroceder a pendiente.',
            confirmado: 'Para volver a agendar un turno rechazado, elija "A Reprogramar".',
            completado: 'No se puede completar un turno rechazado.',
            ausente: 'El turno fue rechazado.'
        }
    }
}

export function validarTransicionEstado(
    estadoActual: SubEstadoReserva,
    nuevoEstado: SubEstadoReserva
): { permitida: boolean; motivo?: string } {
    if (estadoActual === nuevoEstado) {
        return { permitida: false, motivo: `El turno ya está en estado ${estadoActual}.` }
    }
    const regla = TRANSICIONES_ESTADO[estadoActual]
    if (!regla) {
        return { permitida: true }
    }
    if (regla.permitidos.includes(nuevoEstado)) {
        return { permitida: true }
    }
    const motivo =
        regla.motivoBloqueo[nuevoEstado] ||
        `No está permitido cambiar de estado ${estadoActual.toUpperCase()} a ${nuevoEstado.toUpperCase()}.`
    return { permitida: false, motivo }
}

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
    serviceRecordado?: boolean
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
    { id: 'retiro_semi', label: 'Retiro Semipermanente (otro salón)', precio: 3000 },
    { id: 'retiro_capping', label: 'Retiro Capping Gel (otro salón)', precio: 4000 },
    { id: 'retiro_softgel', label: 'Retiro Soft Gel (otro salón)', precio: 4500 },
    { id: 'retirado_otro', label: 'Retirado de otro salón (Genérico)', precio: 3000 }
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
