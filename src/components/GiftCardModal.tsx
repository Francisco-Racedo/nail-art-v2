'use client'

import React, { useState, useEffect } from 'react'
import { Gift, Send, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import BottomSheetModal from './ui/BottomSheetModal'

export interface GiftCardModalProps {
    isOpen: boolean
    onClose: () => void
    isAdmin?: boolean
    defaultServicio?: string
    clienteDestino?: {
        nombre?: string
        celular?: string
    }
}

export default function GiftCardModal({
    isOpen,
    onClose,
    isAdmin = false,
    defaultServicio = 'Servicio de Manicuría a Elección',
    clienteDestino
}: GiftCardModalProps) {
    const [paraNombre, setParaNombre] = useState(clienteDestino?.nombre || '')
    const [deParteDe, setDeParteDe] = useState('')
    const [servicio, setServicio] = useState(defaultServicio)
    const [validoHasta, setValidoHasta] = useState(() => {
        const d = new Date()
        d.setDate(d.getDate() + 45) // 45 días de validez por defecto
        return d.toISOString().split('T')[0]
    })
    const [copiado, setCopiado] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setParaNombre(clienteDestino?.nombre || '')
            setServicio(defaultServicio || 'Servicio de Manicuría a Elección')
        }
    }, [isOpen, clienteDestino?.nombre, defaultServicio])

    const fechaLatam = validoHasta.split('-').reverse().join('/')
    const whatsappSalon = '5493816988692' // Celular oficial de Mili Tripolone

    const textoWhatsAppCliente = `¡Hola Mili! 🌸 Quiero solicitar una *GIFT CARD DE REGALO* de Pintaditas Nails 🎁✨
• *Para:* ${paraNombre || 'Una persona especial'}
• *De parte de:* ${deParteDe || 'Yo'}
• *Vale por:* ${servicio}
• *Válido hasta:* ${fechaLatam}
¿Me pasás los datos para abonarla por transferencia o efectivo y recibir la tarjeta digital? ¡Muchas gracias! 💕`

    const textoWhatsAppAdmin = `🎁✨ *¡TENÉS UNA GIFT CARD DE REGALO!* ✨🎁
¡Hola ${paraNombre || 'hermosa'}! Te regalaron una experiencia en *Pintaditas Nails by Mili Tripolone* 💅🌸

_¡Nada mejora tu actitud, cómo unas uñas preciosas!_

• *Vale por:* ${servicio}
• *Válido hasta el día:* ${fechaLatam}
${deParteDe ? `• *De parte de:* ${deParteDe}\n` : ''}
📍 *Salón:* Bartolomé Mitre 155, B° 25 de Mayo • Lules
📲 *Reservá tu turno online en:* https://pintaditas-nails.vercel.app/
o escribinos a este WhatsApp (${whatsappSalon}). ¡Te esperamos para mimarte! 🥂💕`

    const mensajeAEnviar = isAdmin ? textoWhatsAppAdmin : textoWhatsAppCliente

    const abrirWhatsapp = () => {
        const celDestino =
            isAdmin && clienteDestino?.celular
                ? clienteDestino.celular.replace(/\D/g, '')
                : whatsappSalon
        const celFinal = celDestino.startsWith('549') ? celDestino : `549${celDestino}`
        const url = `https://wa.me/${celFinal}?text=${encodeURIComponent(mensajeAEnviar)}`
        window.open(url, '_blank')
    }

    const copiarTexto = async () => {
        try {
            await navigator.clipboard.writeText(mensajeAEnviar)
            setCopiado(true)
            toast.success('¡Texto de la Gift Card copiado al portapapeles!')
            setTimeout(() => setCopiado(false), 2500)
        } catch {
            toast.error('No se pudo copiar el texto')
        }
    }

    return (
        <BottomSheetModal
            isOpen={isOpen}
            onClose={onClose}
            maxWidthClass="max-w-lg"
            headerClassName="bg-gradient-to-r from-rose-50 via-pink-50 to-orange-50"
            icon={
                <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-200">
                    <Gift className="w-5 h-5" />
                </div>
            }
            title={isAdmin ? 'Emitir Gift Card de Regalo' : 'Regalá una Gift Card de Uñas'}
            subtitle="Pintaditas Nails by Mili Tripolone"
            footer={
                <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full">
                    <button
                        type="button"
                        onClick={copiarTexto}
                        className="w-full sm:w-auto px-4 py-3 rounded-xl border border-stone-300 bg-white text-stone-700 hover:bg-stone-100 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                        {copiado ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                            <Copy className="w-4 h-4" />
                        )}
                        {copiado ? '¡Copiado!' : 'Copiar Texto'}
                    </button>
                    <button
                        type="button"
                        onClick={abrirWhatsapp}
                        className="w-full flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-200 flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                        <Send className="w-4 h-4" />
                        {isAdmin ? 'Enviar Gift Card por WhatsApp' : 'Pedir Gift Card por WhatsApp'}
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                {/* Tarjeta Visual de la Gift Card (Réplica de la imagen oficial) */}
                <div className="relative rounded-2xl p-4 sm:p-6 bg-gradient-to-br from-[#FFF5F7] via-[#FFEBF0] to-[#FCE7ED] border-2 border-rose-200/80 shadow-md overflow-hidden text-center">
                    {/* Decoraciones florales de fondo */}
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-pink-300/20 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-rose-400/20 rounded-full blur-2xl pointer-events-none" />

                    <div className="relative z-10">
                        <span className="text-[10px] font-black tracking-[0.3em] uppercase text-rose-500 inline-block mb-1">
                            EXPERIENCIA EXCLUSIVA
                        </span>
                        <h2 className="font-editorial text-2xl sm:text-4xl font-extrabold tracking-wide text-stone-900 mb-1">
                            GIFT CARD
                        </h2>
                        <p className="font-editorial italic text-stone-700 text-xs sm:text-base font-medium mb-3.5">
                            ¡Nada mejora tu actitud, cómo unas uñas preciosas!
                        </p>

                        <div className="space-y-2 text-left bg-white/95 rounded-xl p-3.5 border border-rose-200/70 text-xs">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">
                                    Vale por:
                                </span>
                                <p className="font-bold text-stone-900 text-sm">
                                    {servicio || 'Servicio a elección'}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-rose-100">
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                                        Para:
                                    </span>
                                    <p className="font-semibold text-stone-800 truncate">
                                        {paraNombre || 'A designar'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                                        Válido hasta el día:
                                    </span>
                                    <p className="font-semibold text-stone-800">{fechaLatam}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-rose-200/60 flex flex-col items-center justify-center text-center">
                            <p className="font-editorial text-xs font-bold text-stone-800 tracking-wide">
                                PintaditasNails by Mili Tripolone
                            </p>
                            <p className="text-[11px] text-stone-600 font-medium">
                                Cel: 3816988692 • Lules, Tucumán
                            </p>
                        </div>
                    </div>
                </div>

                {/* Formulario de personalización */}
                <div className="space-y-3 bg-stone-50 rounded-2xl p-4 border border-stone-200/70 text-xs">
                    <div>
                        <label className="block font-bold text-stone-700 mb-1">
                            ¿A quién se la regalás? (Nombre)
                        </label>
                        <input
                            type="text"
                            placeholder="Ej: Camila Racedo..."
                            value={paraNombre}
                            onChange={e => setParaNombre(e.target.value)}
                            className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-400 font-medium"
                        />
                    </div>

                    {!isAdmin && (
                        <div>
                            <label className="block font-bold text-stone-700 mb-1">
                                De parte de (tu nombre)
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: Romina..."
                                value={deParteDe}
                                onChange={e => setDeParteDe(e.target.value)}
                                className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-400 font-medium"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block font-bold text-stone-700 mb-1">
                            Servicio del Voucher
                        </label>
                        <select
                            value={servicio}
                            onChange={e => setServicio(e.target.value)}
                            className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-rose-400"
                        >
                            <option value="Servicio de Manicuría a Elección">
                                Cualquier servicio a elección ✨
                            </option>
                            <option value="Esmaltado Semipermanente Liso">
                                Esmaltado Semipermanente ($17.000)
                            </option>
                            <option value="Capping Gel Liso">
                                Capping Gel Liso ($20.000)
                            </option>
                            <option value="Soft Gel Lisas">
                                Extensión Soft Gel ($24.000)
                            </option>
                            <option value="Capping en Polygel / Técnica Híbrida">
                                Capping en Polygel ($25.000)
                            </option>
                            <option value="Semipermanente + 2 Decos Simples">
                                Semipermanente + 2 Decos Simples ($18.000)
                            </option>
                            <option value="Capping Gel + 2 Decos Simples">
                                Capping Gel + 2 Decos Simples ($21.500)
                            </option>
                            <option value="Soft Gel + 2 Decos Simples">
                                Soft Gel + 2 Decos Simples ($25.500)
                            </option>
                        </select>
                    </div>

                    <div>
                        <label className="block font-bold text-stone-700 mb-1">
                            Válido hasta:
                        </label>
                        <input
                            type="date"
                            value={validoHasta}
                            onChange={e => setValidoHasta(e.target.value)}
                            className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-rose-400"
                        />
                    </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <span>💵</span>
                    <span>
                        <strong>Medios de pago recibidos:</strong> Efectivo y Transferencia bancaria.
                    </span>
                </div>
            </div>
        </BottomSheetModal>
    )
}
