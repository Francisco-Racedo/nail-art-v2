export interface Reserva {
    id: number
    nombre: string
    servicio: string
    fecha: string
    horario: string
    estado: 'pendiente' | 'confirmado' | 'completado'
    celular?: string
    email?: string
    notificacion_enviada?: boolean
    fecha_nacimiento?: string
    descuento_aplicado?: number
    metodo_pago?: string
    monto_sena?: number
    estado_pago?: string
    reprogramado?: boolean
}

export type EstadoReserva = 'pendiente' | 'confirmado' | 'completado'

export const ESTADO_CONFIG: Record<EstadoReserva, { label: string; color: string; bg: string; border: string; hoverCls: string }> = {
    pendiente: { label: 'Pendiente', color: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-300', hoverCls: 'hover:scale-[1.03] active:scale-95 transition-all duration-300 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300' },
    confirmado: { label: 'Confirmado', color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-300', hoverCls: 'hover:scale-[1.03] active:scale-95 transition-all duration-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300' },
    completado: { label: 'Completado', color: 'text-rose-700', bg: 'bg-rose-100', border: 'border-rose-300', hoverCls: 'hover:scale-[1.03] active:scale-95 transition-all duration-300 hover:bg-fuchsia-50 hover:text-fuchsia-700 hover:border-fuchsia-300' },
}

export interface ModalData {
    id: number;
    cliente: string;
    servicio: string;
    fecha: string;
    hora: string;
    estado: EstadoReserva;
    celular?: string;
    email?: string;
    notificacion_enviada?: boolean;
    fecha_nacimiento?: string;
    descuento_aplicado?: number;
    monto_sena?: number;
    metodo_pago?: string;
    estado_pago?: string;
    reprogramado?: boolean;
}

export const formatDateStr = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export const checkCumple = (fn?: string) => {
    if (!fn) return false
    const now = new Date()
    const tzTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }))
    const m = String(tzTime.getMonth() + 1).padStart(2, '0')
    const d = String(tzTime.getDate()).padStart(2, '0')
    const todayMMDD = `${m}-${d}`
    const fnMMDD = fn.substring(5, 10)
    return todayMMDD === fnMMDD
}

export const getHoyUTC3 = () => {
    const now = new Date()
    const tzTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }))
    return formatDateStr(tzTime)
}
