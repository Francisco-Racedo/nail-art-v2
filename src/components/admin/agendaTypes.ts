import {
    getEstadoEfectivo,
    parseReservaMeta,
    getHoyArgentina,
    getAhoraArgentina,
    HistorialEvento,
    TRANSICIONES_ESTADO,
    validarTransicionEstado,
    ReglaTransicionEstado
} from '@/lib/utils'

export type EstadoReserva =
    | 'pendiente'
    | 'confirmado'
    | 'completado'
    | 'reprogramar'
    | 'cancelado'
    | 'ausente'
    | 'rechazado'

export interface Reserva {
    id: number
    nombre: string
    servicio: string
    fecha: string
    horario: string
    estado: EstadoReserva
    celular?: string
    email?: string
    notificacion_enviada?: boolean
    fecha_nacimiento?: string
    descuento_aplicado?: number
    metodo_pago?: string
    monto_sena?: number
    mp_preference_id?: string
    estado_pago?: string
    reprogramado?: boolean
}

export const ESTADO_CONFIG: Record<
    EstadoReserva,
    { label: string; color: string; bg: string; border: string; hoverCls: string }
> = {
    pendiente: {
        label: 'Pendiente',
        color: 'text-amber-800',
        bg: 'bg-amber-100',
        border: 'border-amber-300',
        hoverCls:
            'hover:scale-[1.02] active:scale-95 transition-all duration-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300'
    },
    confirmado: {
        label: 'Confirmado',
        color: 'text-emerald-800',
        bg: 'bg-emerald-100',
        border: 'border-emerald-300',
        hoverCls:
            'hover:scale-[1.02] active:scale-95 transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'
    },
    completado: {
        label: 'Completado',
        color: 'text-rose-800',
        bg: 'bg-rose-100',
        border: 'border-rose-300',
        hoverCls:
            'hover:scale-[1.02] active:scale-95 transition-all duration-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300'
    },
    reprogramar: {
        label: 'A Reprogramar',
        color: 'text-indigo-800',
        bg: 'bg-indigo-100',
        border: 'border-indigo-300',
        hoverCls:
            'hover:scale-[1.02] active:scale-95 transition-all duration-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300'
    },
    ausente: {
        label: 'Ausente',
        color: 'text-stone-700',
        bg: 'bg-stone-200',
        border: 'border-stone-300',
        hoverCls:
            'hover:scale-[1.02] active:scale-95 transition-all duration-200 hover:bg-stone-100 hover:text-stone-700 hover:border-stone-300'
    },
    cancelado: {
        label: 'Cancelado',
        color: 'text-red-700',
        bg: 'bg-red-100',
        border: 'border-red-200',
        hoverCls:
            'hover:scale-[1.02] active:scale-95 transition-all duration-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300'
    },
    rechazado: {
        label: 'Rechazado',
        color: 'text-red-700',
        bg: 'bg-red-100',
        border: 'border-red-200',
        hoverCls:
            'hover:scale-[1.02] active:scale-95 transition-all duration-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300'
    }
}

export interface ModalData {
    id: number
    cliente: string
    servicio: string
    fecha: string
    hora: string
    estado: EstadoReserva
    celular?: string
    email?: string
    notificacion_enviada?: boolean
    fecha_nacimiento?: string
    descuento_aplicado?: number
    descuento_motivo?: string
    monto_sena?: number
    metodo_pago?: string
    estado_pago?: string
    reprogramado?: boolean
    codigo?: string
    ocupa_bloque_siguiente?: boolean
    dias_recordatorio_service?: number
    service_recordado?: boolean
    notas_turno?: string
    precio_personalizado?: number
    adicionales?: string[]
    historial_eventos?: HistorialEvento[]
    mp_preference_id?: string
}

export const formatDateStr = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// Detecta cumpleaños hoy o dentro de ±7 días en horario de Argentina
export const checkCumple = (fn?: string) => {
    if (!fn || fn.length < 10) return false
    const tzTime = getAhoraArgentina()
    const [, mStr, dStr] = fn.substring(0, 10).split('-')
    const m = parseInt(mStr, 10)
    const d = parseInt(dStr, 10)
    if (!m || !d) return false

    const cumpleDate = new Date(tzTime.getFullYear(), m - 1, d)
    tzTime.setHours(0, 0, 0, 0)
    const diffDays = Math.abs((cumpleDate.getTime() - tzTime.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays <= 7
}

export const getHoyUTC3 = () => {
    return getHoyArgentina()
}

export {
    getEstadoEfectivo,
    parseReservaMeta,
    TRANSICIONES_ESTADO,
    validarTransicionEstado
}
export type { ReglaTransicionEstado }
