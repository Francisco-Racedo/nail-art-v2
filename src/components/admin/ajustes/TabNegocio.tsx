'use client'

import React, { useMemo } from 'react'
import {
    Settings,
    Store,
    PhoneCall,
    Clock,
    Calendar,
    CreditCard,
    ExternalLink,
    CheckCircle2,
    AlertCircle,
    Sparkles
} from 'lucide-react'

interface TabNegocioProps {
    nombreNegocio: string
    setNombreNegocio: (v: string) => void
    whatsappNumero: string
    setWhatsappNumero: (v: string) => void
    intervaloMinutos: number
    setIntervaloMinutos: (v: number) => void
    horaInicio: string
    setHoraInicio: (v: string) => void
    horaFin: string
    setHoraFin: (v: string) => void
    mesesVisibles: number
    setMesesVisibles: (v: number) => void
    minutosAuto: number
    setMinutosAuto: (v: number) => void
    pagosHabilitados: boolean
    setPagosHabilitados: (v: boolean) => void
    guardandoConfig: boolean
    handleSaveConfig: (e: React.FormEvent<HTMLFormElement>) => void
}

export default function TabNegocio({
    nombreNegocio,
    setNombreNegocio,
    whatsappNumero,
    setWhatsappNumero,
    intervaloMinutos,
    setIntervaloMinutos,
    horaInicio,
    setHoraInicio,
    horaFin,
    setHoraFin,
    mesesVisibles,
    setMesesVisibles,
    minutosAuto,
    setMinutosAuto,
    pagosHabilitados,
    setPagosHabilitados,
    guardandoConfig,
    handleSaveConfig
}: TabNegocioProps) {
    // Cálculo en vivo de turnos generados por día
    const turnosEstimados = useMemo(() => {
        const [hi, mi] = (horaInicio || '08:30').split(':').map(Number)
        const [hf, mf] = (horaFin || '20:00').split(':').map(Number)
        const totalMins = (hf * 60 + mf) - (hi * 60 + mi)
        if (totalMins <= 0 || !intervaloMinutos) return []
        
        // Bloques habituales estándar de 90m
        const slots: string[] = []
        let cur = hi * 60 + mi
        const fin = hf * 60 + mf
        while (cur + intervaloMinutos <= fin) {
            const h = Math.floor(cur / 60)
            const m = cur % 60
            slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
            cur += intervaloMinutos
        }
        return slots
    }, [horaInicio, horaFin, intervaloMinutos])

    const isValidWpp = /^\d{10,15}$/.test(whatsappNumero.trim())
    const wppLink = isValidWpp ? `https://wa.me/${whatsappNumero.trim()}` : null

    return (
        <form onSubmit={handleSaveConfig} className="space-y-6 animate-in fade-in">
            {/* 1. Identidad de Marca y WhatsApp */}
            <div className="bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-stone-100">
                    <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                        <Store className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-black text-stone-900">
                            Identidad del Salón y Contacto
                        </h3>
                        <p className="text-xs text-stone-500">
                            Configuración del nombre visible en el sitio y el canal directo de reservas.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                            Nombre del Negocio (Firma Oficial) *
                        </label>
                        <input
                            type="text"
                            required
                            value={nombreNegocio}
                            onChange={e => setNombreNegocio(e.target.value)}
                            maxLength={80}
                            placeholder="Ej: Pintaditas Nails"
                            className="w-full bg-stone-50/80 hover:bg-white focus:bg-white border border-stone-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 rounded-xl p-3 text-stone-900 text-sm font-semibold transition"
                        />
                        <p className="text-[11px] text-stone-500 mt-1">
                            Aparece en la barra de navegación superior, pie de página y títulos.
                        </p>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                                Número WhatsApp de Atención *
                            </label>
                            {wppLink && (
                                <a
                                    href={wppLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                                >
                                    Probar Enlace <ExternalLink className="w-3 h-3" />
                                </a>
                            )}
                        </div>
                        <div className="relative">
                            <input
                                type="text"
                                required
                                value={whatsappNumero}
                                onChange={e => setWhatsappNumero(e.target.value.replace(/\D/g, ''))}
                                placeholder="Ej: 5493813013850 (código de país + área + número sin + ni espacios)"
                                className={`w-full bg-stone-50/80 hover:bg-white focus:bg-white border rounded-xl p-3 text-stone-900 text-sm font-semibold transition ${
                                    isValidWpp ? 'border-stone-200 focus:border-emerald-400 focus:ring-emerald-200' : 'border-rose-300'
                                }`}
                            />
                        </div>
                        <p className="text-[11px] text-stone-500 mt-1">
                            De 10 a 15 dígitos. Se usa para botones de WhatsApp, avisos de reprogramación y contacto directo.
                        </p>
                    </div>
                </div>
            </div>

            {/* 2. Horarios Habituales y Capacidad Operativa */}
            <div className="bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-stone-100">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-black text-stone-900">
                            Horarios de Atención & Turnos
                        </h3>
                        <p className="text-xs text-stone-500">
                            Franja horaria base para lunes a sábado y duración de cada sesión.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
                    <div>
                        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                            Hora de Apertura
                        </label>
                        <input
                            type="time"
                            value={horaInicio}
                            onChange={e => setHoraInicio(e.target.value)}
                            className="w-full bg-stone-50/80 hover:bg-white focus:bg-white border border-stone-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 rounded-xl p-3 text-stone-900 text-sm font-semibold transition"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                            Hora de Cierre
                        </label>
                        <input
                            type="time"
                            value={horaFin}
                            onChange={e => setHoraFin(e.target.value)}
                            className="w-full bg-stone-50/80 hover:bg-white focus:bg-white border border-stone-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 rounded-xl p-3 text-stone-900 text-sm font-semibold transition"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                            Duración por Turno (Minutos)
                        </label>
                        <input
                            type="number"
                            min={15}
                            max={240}
                            step={15}
                            value={intervaloMinutos}
                            onChange={e => setIntervaloMinutos(Number(e.target.value))}
                            className="w-full bg-stone-50/80 hover:bg-white focus:bg-white border border-stone-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 rounded-xl p-3 text-stone-900 text-sm font-semibold transition"
                        />
                    </div>
                </div>

                {/* Tarjeta de capacidad diaria en tiempo real */}
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                        <div>
                            <span className="text-xs font-bold text-stone-800 block">
                                Capacidad habitual calculada: {turnosEstimados.length} turnos por jornada de semana
                            </span>
                            <span className="text-[11px] text-stone-600">
                                Horario {horaInicio} a {horaFin} hs • Bloques de {intervaloMinutos} min: {turnosEstimados.join(', ')} hs
                            </span>
                        </div>
                    </div>
                    <span className="text-[10px] uppercase font-black px-2.5 py-1 rounded-full bg-amber-200 text-amber-900 shrink-0 self-start sm:self-auto">
                        Turnos de 1h 30m
                    </span>
                </div>
            </div>

            {/* 3. Calendario del Cliente y Cobros Online */}
            <div className="bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-stone-100">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                        <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-black text-stone-900">
                            Calendario Público & Políticas de Pago
                        </h3>
                        <p className="text-xs text-stone-500">
                            Configuración de visibilidad futura y reglas de confirmación de turnos.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    <div>
                        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                            Meses Visibles en la Página del Cliente
                        </label>
                        <select
                            value={mesesVisibles}
                            onChange={e => setMesesVisibles(Number(e.target.value))}
                            className="w-full bg-stone-50/80 hover:bg-white focus:bg-white border border-stone-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 rounded-xl p-3 text-stone-900 text-sm font-semibold transition"
                        >
                            <option value={1}>1 mes (solo el mes actual en curso)</option>
                            <option value={2}>2 meses (mes actual + próximo mes)</option>
                            <option value={3}>3 meses (recomendado: 90 días hacia adelante)</option>
                            <option value={4}>4 meses</option>
                            <option value={6}>6 meses</option>
                            <option value={12}>12 meses (año calendario completo)</option>
                        </select>
                        <p className="text-[11px] text-stone-500 mt-1">
                            Controla cuántos meses hacia adelante pueden explorar y agendar las clientas en el sitio web.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                            Ventana de Auto-Confirmación (Minutos)
                        </label>
                        <input
                            type="number"
                            min={0}
                            max={120}
                            value={minutosAuto}
                            onChange={e => setMinutosAuto(Number(e.target.value))}
                            className="w-full bg-stone-50/80 hover:bg-white focus:bg-white border border-stone-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 rounded-xl p-3 text-stone-900 text-sm font-semibold transition"
                        />
                        <p className="text-[11px] text-stone-500 mt-1">
                            Si una clienta no abona la seña en {minutosAuto} min, el turno pendiente se autoconfirma provisionalmente para no trabar la agenda.
                        </p>
                    </div>
                </div>

                {/* Switch de Pagos Online */}
                <label className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-stone-50/80 border border-stone-200 cursor-pointer hover:bg-stone-50 transition">
                    <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-indigo-600 shrink-0" />
                        <div>
                            <span className="block text-sm font-bold text-stone-900">
                                Cobro Online de Seña (Mercado Pago)
                            </span>
                            <span className="block text-xs text-stone-500 mt-0.5">
                                Cuando está deshabilitado, las reservas se confirman directamente sin exigir pago previo con tarjeta.
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                            pagosHabilitados ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-stone-200 text-stone-600'
                        }`}>
                            {pagosHabilitados ? 'Cobro Activo' : 'Sin Seña Previa'}
                        </span>
                        <input
                            type="checkbox"
                            checked={pagosHabilitados}
                            onChange={e => setPagosHabilitados(e.target.checked)}
                            className="w-5 h-5 accent-rose-500 rounded"
                        />
                    </div>
                </label>
            </div>

            {/* Botón de guardado principal */}
            <div className="flex items-center justify-end gap-3 pt-2">
                <button
                    type="submit"
                    disabled={guardandoConfig}
                    className="bg-stone-900 hover:bg-stone-800 text-white font-black text-sm px-8 py-3.5 rounded-2xl shadow-md transition disabled:opacity-50 flex items-center gap-2"
                >
                    {guardandoConfig ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Guardando Ajustes...
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            Guardar Ajustes del Negocio
                        </>
                    )}
                </button>
            </div>
        </form>
    )
}
