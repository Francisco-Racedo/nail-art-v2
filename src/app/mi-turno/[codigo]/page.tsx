'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { toast, Toaster } from 'sonner'
import CalendarioReserva from '@/components/CalendarioReserva'
import { getHoyArgentina, getFinMesSiguienteArgentina } from '@/lib/utils'
import type { DisponibilidadDia } from '@/lib/reservas-server'

interface TurnoPublico {
    id: number
    codigo: string
    nombre: string
    servicio: string
    fecha: string
    horario: string
    estado: string
    reprogramado: boolean
    createdAt: string
    confirmadoEn?: string
    confirmadoPor?: 'dueno' | 'auto' | 'cliente'
    motivoReprogramacion?: string
    fechaOriginal?: string
    horarioOriginal?: string
    sugerencias: { fecha: string; horario: string; mismoHorario: boolean }[]
    minutosConfirmacion: number
    nombreNegocio: string
    whatsappNumero: string
}

export default function MiTurnoPage() {
    const params = useParams<{ codigo: string }>()
    const codigo = params?.codigo || ''

    const [turno, setTurno] = useState<TurnoPublico | null>(null)
    const [loading, setLoading] = useState(true)
    const [errorMsg, setErrorMsg] = useState('')
    const [segundosRestantes, setSegundosRestantes] = useState<number | null>(null)

    // Estado para reprogramación autogestionada por el cliente
    const [mostrarReprogramar, setMostrarReprogramar] = useState(false)
    const [hoy, setHoy] = useState('')
    const [maxFecha, setMaxFecha] = useState('')
    const [disponibilidad, setDisponibilidad] = useState<Record<string, DisponibilidadDia>>({})
    const [loadingCalendario, setLoadingCalendario] = useState(false)
    const [nuevaFecha, setNuevaFecha] = useState('')
    const [nuevoHorario, setNuevoHorario] = useState('')
    const [procesando, setProcesando] = useState(false)

    const cargarTurno = useCallback(async () => {
        if (!codigo) return
        try {
            const res = await fetch(`/api/mi-turno/${codigo}?t=${Date.now()}`, {
                cache: 'no-store'
            })
            const data = await res.json()
            if (!res.ok || !data.turno) {
                setErrorMsg(data.error || 'No encontramos este turno.')
                setLoading(false)
                return
            }
            setTurno(data.turno)
            if (data.turno.estado === 'reprogramar') {
                setMostrarReprogramar(true)
            }
            setLoading(false)
        } catch {
            setErrorMsg('Error de conexión al consultar tu turno.')
            setLoading(false)
        }
    }, [codigo])

    const cargarDisponibilidad = useCallback(async () => {
        const h = getHoyArgentina()
        const m = getFinMesSiguienteArgentina()
        setHoy(h)
        setMaxFecha(m)
        setLoadingCalendario(true)
        try {
            const res = await fetch(`/api/disponibilidad?desde=${h}&hasta=${m}`, {
                cache: 'no-store'
            })
            if (res.ok) {
                const data = await res.json()
                setDisponibilidad(data.dias || {})
            }
        } catch {}
        setLoadingCalendario(false)
    }, [])

    useEffect(() => {
        cargarTurno()
    }, [cargarTurno])

    useEffect(() => {
        if (mostrarReprogramar && Object.keys(disponibilidad).length === 0) {
            cargarDisponibilidad()
        }
    }, [mostrarReprogramar, disponibilidad, cargarDisponibilidad])

    // Cuenta regresiva en vivo para la ventana de 10 minutos cuando el turno está PENDIENTE
    useEffect(() => {
        if (!turno || turno.estado !== 'pendiente') {
            setSegundosRestantes(null)
            return
        }

        const calcularRestante = () => {
            if (!turno.createdAt || turno.createdAt.startsWith('1970-')) return null
            const createdMs = new Date(turno.createdAt).getTime()
            const limitMs = (turno.minutosConfirmacion || 10) * 60 * 1000
            const diffSec = Math.max(0, Math.ceil((createdMs + limitMs - Date.now()) / 1000))
            return diffSec
        }

        setSegundosRestantes(calcularRestante())

        const timer = setInterval(() => {
            const sec = calcularRestante()
            setSegundosRestantes(sec)
            if (sec !== null && sec <= 0) {
                // Al llegar a 0, consultar al servidor para activar la auto-confirmación
                cargarTurno()
            }
        }, 1000)

        const poll = setInterval(() => {
            cargarTurno()
        }, 12_000)

        return () => {
            clearInterval(timer)
            clearInterval(poll)
        }
    }, [turno, cargarTurno])

    const aplicarReprogramacion = async (fechaElegida: string, horarioElegido: string) => {
        if (!fechaElegida || !horarioElegido) {
            toast.error('Seleccioná un día y un horario disponible.')
            return
        }
        setProcesando(true)
        const toastId = toast.loading('Guardando nuevo horario...')
        try {
            const res = await fetch(`/api/mi-turno/${codigo}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accion: 'reprogramar',
                    nuevaFecha: fechaElegida,
                    nuevoHorario: horarioElegido
                })
            })
            const data = await res.json()
            if (!res.ok) {
                toast.error(data.error || 'No se pudo cambiar el turno', { id: toastId })
                setProcesando(false)
                return
            }
            toast.success('¡Tu turno fue reprogramado con éxito!', { id: toastId })
            setMostrarReprogramar(false)
            setNuevaFecha('')
            setNuevoHorario('')
            await cargarTurno()
            await cargarDisponibilidad()
        } catch {
            toast.error('Error de conexión', { id: toastId })
        }
        setProcesando(false)
    }

    const cancelarMiTurno = async () => {
        setProcesando(true)
        const toastId = toast.loading('Cancelando turno...')
        try {
            const res = await fetch(`/api/mi-turno/${codigo}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accion: 'cancelar' })
            })
            if (res.ok) {
                toast.success('Turno cancelado correctamente', { id: toastId })
                await cargarTurno()
            } else {
                toast.error('No se pudo cancelar el turno', { id: toastId })
            }
        } catch {
            toast.error('Error de conexión', { id: toastId })
        }
        setProcesando(false)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-pink-100 via-rose-50 to-orange-100 flex items-center justify-center p-6">
                <div className="bg-white/90 rounded-3xl p-8 shadow-xl text-center max-w-sm w-full">
                    <div className="w-10 h-10 border-4 border-pink-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-stone-600 font-medium text-sm">Cargando tu turno...</p>
                </div>
            </div>
        )
    }

    if (errorMsg || !turno) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-pink-100 via-rose-50 to-orange-100 flex items-center justify-center p-6">
                <div className="bg-white/95 rounded-3xl p-8 shadow-xl text-center max-w-md w-full border border-pink-200">
                    <p className="text-3xl mb-3">💅</p>
                    <h1 className="text-xl font-bold text-stone-800 mb-2">Turno no encontrado</h1>
                    <p className="text-sm text-stone-600 mb-6">{errorMsg}</p>
                    <Link
                        href="/#reserva"
                        className="inline-block bg-gradient-to-r from-pink-500 to-orange-400 text-white font-bold px-6 py-3 rounded-full text-sm shadow-md"
                    >
                        Volver a la página principal
                    </Link>
                </div>
            </div>
        )
    }

    const fechaLatam = turno.fecha.split('-').reverse().join('/')
    const infoDiaNuevo = nuevaFecha ? disponibilidad[nuevaFecha] : undefined

    const fmtCountdown = (sec: number) => {
        const m = Math.floor(sec / 60)
        const s = sec % 60
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    }

    const wppUrl = () => {
        const msg = `Hola! Soy *${turno.nombre}*. Te escribo por mi turno de *${turno.servicio.split('(')[0].trim()}* del día *${fechaLatam}* a las *${turno.horario} hs* (Código: ${turno.codigo}). 💅`
        return `https://wa.me/${turno.whatsappNumero || '5493813013850'}?text=${encodeURIComponent(msg)}`
    }

    return (
        <main className="min-h-screen py-12 px-4 sm:px-6 bg-gradient-to-br from-pink-100 via-rose-50 to-orange-100">
            <Toaster position="top-center" richColors />

            <div className="max-w-xl mx-auto">
                <div className="bg-white/95 rounded-[2rem] p-6 sm:p-8 shadow-xl border border-pink-200/80">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold uppercase tracking-widest text-pink-600">
                            {turno.nombreNegocio}
                        </span>
                        <span className="text-xs text-stone-400 font-mono">#{turno.codigo}</span>
                    </div>

                    {/* Estado del turno */}
                    {turno.estado === 'pendiente' && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
                            <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-amber-800 font-bold text-sm flex items-center gap-1.5">
                                    ⏳ Pendiente de confirmación
                                </span>
                                {segundosRestantes !== null && (
                                    <span className="bg-amber-200/80 text-amber-900 font-mono font-bold text-xs px-2.5 py-1 rounded-full">
                                        {fmtCountdown(segundosRestantes)}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-amber-800/90 leading-relaxed">
                                Tu horario ya está reservado. Se confirmará automáticamente en un
                                máximo de <strong>{turno.minutosConfirmacion} minutos</strong> sin
                                que tengas que hacer nada más.
                            </p>
                        </div>
                    )}

                    {turno.estado === 'confirmado' && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6">
                            <p className="text-emerald-800 font-bold text-base flex items-center gap-2">
                                ✅ ¡Tu turno está confirmado!
                            </p>
                            <p className="text-xs text-emerald-700 mt-1">
                                Te esperamos en el salón. Recordá asistir puntual.
                            </p>
                        </div>
                    )}

                    {turno.estado === 'reprogramar' && (
                        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 mb-6">
                            <p className="text-indigo-900 font-bold text-base mb-1">
                                🔄 Necesitamos reprogramar tu turno
                            </p>
                            <p className="text-xs text-indigo-800 leading-relaxed">
                                {turno.motivoReprogramacion ||
                                    'Surgió un imprevisto en el salón. Por favor elegí el nuevo día y horario que te quede más cómodo a continuación.'}
                            </p>
                        </div>
                    )}

                    {(turno.estado === 'cancelado' || turno.estado === 'rechazado') && (
                        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-6">
                            <p className="text-rose-800 font-bold text-base">
                                ❌ Este turno fue cancelado
                            </p>
                            <p className="text-xs text-rose-700 mt-1">
                                Podés volver a elegir un nuevo horario cuando gustes.
                            </p>
                        </div>
                    )}

                    {/* Datos del turno */}
                    <h1 className="text-2xl font-bold text-stone-900 mb-1">{turno.nombre}</h1>
                    <p className="text-sm font-medium text-pink-600 mb-5">{turno.servicio}</p>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-4">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                                📅 Fecha
                            </p>
                            <p className="text-lg font-black text-stone-800">{fechaLatam}</p>
                        </div>
                        <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-4">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                                ⏰ Horario (2 hs)
                            </p>
                            <p className="text-lg font-black text-stone-800">{turno.horario} hs</p>
                        </div>
                    </div>

                    {/* Sugerencias rápidas de 1 toque cuando requiere reprogramación */}
                    {mostrarReprogramar &&
                        turno.sugerencias &&
                        turno.sugerencias.length > 0 && (
                            <div className="mb-6 bg-pink-50/70 border border-pink-200 rounded-2xl p-4">
                                <p className="text-xs font-bold uppercase tracking-wider text-pink-700 mb-2">
                                    ⚡ Horarios sugeridos (1 toque)
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    {turno.sugerencias.map(s => (
                                        <button
                                            key={`${s.fecha}-${s.horario}`}
                                            type="button"
                                            disabled={procesando}
                                            onClick={() =>
                                                aplicarReprogramacion(s.fecha, s.horario)
                                            }
                                            className="bg-white hover:bg-pink-100 border border-pink-300 text-stone-800 rounded-xl p-2.5 text-xs font-bold shadow-sm transition min-h-[48px] flex flex-col items-center justify-center"
                                        >
                                            <span>{s.fecha.split('-').reverse().join('/')}</span>
                                            <span className="text-pink-600">{s.horario} hs</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                    {/* Calendario completo de 2 meses para elegir otro día u horario */}
                    {mostrarReprogramar && (
                        <div className="mb-6 border-t border-stone-200 pt-5">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-base font-bold text-stone-800">
                                    Elegí tu nuevo día y horario
                                </h2>
                                {turno.estado !== 'reprogramar' && (
                                    <button
                                        type="button"
                                        onClick={() => setMostrarReprogramar(false)}
                                        className="text-xs text-stone-500 underline"
                                    >
                                        Cerrar
                                    </button>
                                )}
                            </div>

                            <CalendarioReserva
                                fechaSeleccionada={nuevaFecha}
                                onSelectFecha={f => {
                                    setNuevaFecha(f)
                                    setNuevoHorario('')
                                }}
                                disponibilidadPorDia={disponibilidad}
                                hoy={hoy}
                                maxFecha={maxFecha}
                                loading={loadingCalendario}
                            />

                            {nuevaFecha && infoDiaNuevo && !infoDiaNuevo.cerrado && (
                                <div className="mt-4">
                                    <p className="text-xs font-bold text-stone-600 mb-2">
                                        Horarios disponibles para el{' '}
                                        {nuevaFecha.split('-').reverse().join('/')}:
                                    </p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {infoDiaNuevo.horariosBase.map(h => {
                                            const ocupado = infoDiaNuevo.ocupados.some(
                                                o => o.horario.substring(0, 5) === h
                                            )
                                            const sel = nuevoHorario === h
                                            return (
                                                <button
                                                    key={h}
                                                    type="button"
                                                    disabled={ocupado}
                                                    onClick={() => setNuevoHorario(h)}
                                                    className={`min-h-[44px] rounded-xl text-sm font-bold border transition ${
                                                        ocupado
                                                            ? 'bg-stone-100 text-stone-400 border-stone-200 line-through cursor-not-allowed'
                                                            : sel
                                                              ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white border-transparent shadow-md'
                                                              : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                                    }`}
                                                >
                                                    {h}
                                                </button>
                                            )
                                        })}
                                    </div>

                                    <button
                                        type="button"
                                        disabled={!nuevoHorario || procesando}
                                        onClick={() =>
                                            aplicarReprogramacion(nuevaFecha, nuevoHorario)
                                        }
                                        className="mt-4 w-full bg-gradient-to-r from-pink-500 to-orange-400 text-white font-bold py-3.5 rounded-xl shadow-md disabled:opacity-50 min-h-[48px]"
                                    >
                                        {procesando
                                            ? 'Guardando...'
                                            : `Confirmar nuevo horario (${nuevaFecha.split('-').reverse().join('/')} ${nuevoHorario} hs)`}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Acciones del cliente */}
                    <div className="flex flex-col gap-3">
                        <a
                            href={wppUrl()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full bg-[#25D366] hover:bg-[#20b857] text-white font-bold py-3.5 px-6 rounded-xl text-center text-sm shadow-md transition min-h-[48px] flex items-center justify-center"
                        >
                            Contactar por WhatsApp
                        </a>

                        {turno.estado !== 'cancelado' &&
                            turno.estado !== 'completado' &&
                            !mostrarReprogramar && (
                                <button
                                    type="button"
                                    onClick={() => setMostrarReprogramar(true)}
                                    className="w-full bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 font-bold py-3 px-6 rounded-xl text-sm transition min-h-[46px]"
                                >
                                    📅 Cambiar día u horario
                                </button>
                            )}

                        {turno.estado !== 'cancelado' && turno.estado !== 'completado' && (
                            <button
                                type="button"
                                disabled={procesando}
                                onClick={cancelarMiTurno}
                                className="w-full bg-white hover:bg-rose-50 text-stone-500 hover:text-rose-600 border border-stone-200 font-semibold py-2.5 px-6 rounded-xl text-xs transition min-h-[42px]"
                            >
                                Cancelar mi turno
                            </button>
                        )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-stone-100 text-center">
                        <Link
                            href="/"
                            className="text-xs font-semibold text-stone-500 hover:text-pink-600"
                        >
                            ← Volver al inicio
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    )
}
