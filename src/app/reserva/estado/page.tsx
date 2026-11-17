'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { motion } from 'framer-motion'

interface Config {
    whatsapp_numero?: string
    nombre_negocio?: string
}

interface ReservaData {
    nombre: string
    servicio: string
    fecha: string
    horario: string
    monto_sena: number
    metodo_pago: string
}

function EstadoReservaContent() {
    const searchParams = useSearchParams()
    const status = searchParams.get('status')
    const payment_id = searchParams.get('payment_id')
    const preference_id = searchParams.get('preference_id')

    const [config, setConfig] = useState<Config | null>(null)
    const [reserva, setReserva] = useState<ReservaData | null>(null)
    const [wppEnviado, setWppEnviado] = useState(false)

    useEffect(() => {
        fetch('/api/config').then(r => r.json()).then(data => setConfig(data)).catch(() => { })
        if (preference_id) {
            fetch(`/api/reservas/por-preferencia?preference_id=${preference_id}`)
                .then(r => r.json())
                .then(data => {
                    if (data.reserva) setReserva(data.reserva)
                })
                .catch(() => { })
        }
    }, [preference_id])

    const getWhatsappUrl = () => {
        if (!config || !reserva) return '#'
        const numero = config.whatsapp_numero || '5493813013850'
        const negocio = config.nombre_negocio || 'Pintaditas Nails'
        const fechaLatam = reserva.fecha.split('-').reverse().join('/')

        let msg = ''
        if (reserva.metodo_pago === 'transferencia') {
            msg = `*COMPROBANTE DE TRANSFERENCIA - ${negocio.toUpperCase()}*\n\nHola! Hice el pago del turno mediante Mercado Pago / Transferencia.\n\n*Soy:* ${reserva.nombre}\n*Servicio:* ${reserva.servicio}\n*Día:* ${fechaLatam} a las ${reserva.horario}hs.\n*Seña:* $${reserva.monto_sena}\n*Pago ID:* ${payment_id || 'N/A'}\n\nAdjunto comprobante. ¿Confirmas turno? 💅`
        } else {
            msg = `*PAGO REALIZADO - ${negocio.toUpperCase()}*\n\nHola! Aboné la seña de mi turno.\n*Soy:* ${reserva.nombre}\n*Servicio:* ${reserva.servicio}\n*Día:* ${fechaLatam} a las ${reserva.horario}hs.\n*Pago ID:* ${payment_id || 'N/A'}\n\n¿Me envían confirmación? 💅`
        }

        return `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`
    }

    const isApproved = status === 'approved'

    return (
        <section className="min-h-screen py-24 bg-gradient-to-br from-pink-100 via-rose-50 to-orange-100 relative overflow-hidden flex items-center justify-center">
            {/* Orbes luminosos de fondo */}
            <div className="absolute -top-20 -left-10 w-[500px] h-[500px] bg-fuchsia-300/40 rounded-full blur-[90px] pointer-events-none z-0"></div>
            <div className="absolute -bottom-20 -right-10 w-[500px] h-[500px] bg-orange-300/40 rounded-full blur-[90px] pointer-events-none z-0"></div>

            <div className="container mx-auto px-6 max-w-2xl relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-gradient-to-br from-pink-300/60 via-rose-200/60 to-orange-300/60 backdrop-blur-xl border border-white/60 shadow-2xl shadow-pink-900/10 rounded-[2rem] p-10 text-center"
                >
                    {isApproved ? (
                        <>
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner border border-emerald-200">
                                ✓
                            </div>
                            <h2 className="text-3xl font-bold mb-4 text-[#2C2421] tracking-tight" style={{ fontFamily: 'serif' }}>
                                ¡Pago Aprobado!
                            </h2>
                            <p className="text-[#2C2421]/80 font-light mb-8 max-w-sm mx-auto">
                                Tu pago ha sido procesado con éxito. Por favor, <strong>envíanos tu comprobante por WhatsApp</strong> para confirmar el turno en nuestra agenda.
                            </p>

                            <div className="bg-white/70 rounded-xl p-5 mb-8 inline-block shadow-sm w-full max-w-sm">
                                <p className="text-sm text-stone-500 mb-1">ID de Operación</p>
                                <p className="font-mono font-bold text-stone-800">{payment_id || 'Procesando...'}</p>
                            </div>

                            {!wppEnviado ? (
                                <a
                                    href={getWhatsappUrl()}
                                    onClick={() => setWppEnviado(true)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-white font-bold py-4 px-8 rounded-full shadow-lg hover:shadow-emerald-500/40 transition-all duration-300 inline-flex items-center gap-2 transform hover:-translate-y-1 w-full sm:w-auto"
                                >
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" /></svg>
                                    Enviar comprobante por WhatsApp
                                </a>
                            ) : (
                                <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                                    <p className="font-bold text-emerald-600">¡WhatsApp solicitado!</p>
                                    <a href={getWhatsappUrl()} target="_blank" rel="noopener noreferrer" className="text-sm text-stone-600 hover:text-emerald-500 underline mt-2 inline-block">
                                        Reintentar abrir conversación
                                    </a>
                                </div>
                            )}

                            {/* Volver a Home (Opción A) */}
                            <div className="mt-8 pt-6 border-t border-rose-900/5">
                                <a
                                    href="/"
                                    className="text-stone-500 hover:text-stone-800 font-medium text-sm inline-flex items-center gap-2 transition-colors duration-300 px-4 py-2 rounded-full hover:bg-stone-50"
                                >
                                    ← Volver a la página principal
                                </a>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-20 h-20 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner border border-rose-200">
                                !
                            </div>
                            <h2 className="text-3xl font-bold mb-4 text-[#2C2421] tracking-tight" style={{ fontFamily: 'serif' }}>
                                Pago Pendiente o Fallido
                            </h2>
                            <p className="text-[#2C2421]/80 font-light mb-8 max-w-sm mx-auto">
                                El estado de la operación es <strong>{status}</strong>. Si tuviste un problema, por favor contactate con nosotros.
                            </p>
                            <a
                                href="/"
                                className="bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 font-semibold py-4 px-8 rounded-full shadow-sm transition-all inline-block"
                            >
                                Volver al inicio
                            </a>
                        </>
                    )}
                </motion.div>
            </div>
        </section>
    )
}

export default function ReservaEstadoPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-pink-50 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin"></div>
            </div>
        }>
            <EstadoReservaContent />
        </Suspense>
    )
}
