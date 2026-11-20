'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertTriangle, Trash2 } from 'lucide-react'

export interface BottomSheetModalProps {
    isOpen: boolean
    onClose: () => void
    title: React.ReactNode
    subtitle?: React.ReactNode
    badge?: React.ReactNode
    icon?: React.ReactNode
    maxWidthClass?: string
    headerClassName?: string
    bodyClassName?: string
    footer?: React.ReactNode
    children: React.ReactNode
}

export default function BottomSheetModal({
    isOpen,
    onClose,
    title,
    subtitle,
    badge,
    icon,
    maxWidthClass = 'max-w-lg',
    headerClassName = 'bg-white',
    bodyClassName = 'p-4 sm:p-6',
    footer,
    children
}: BottomSheetModalProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!isOpen) return

        const originalOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }
        window.addEventListener('keydown', handleKeyDown)

        return () => {
            document.body.style.overflow = originalOverflow
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen, onClose])

    if (!mounted || !isOpen) return null

    return createPortal(
        <div
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-950/65 backdrop-blur-xs animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
        >
            {/* Backdrop click to close */}
            <div
                className="fixed inset-0"
                onClick={onClose}
                aria-label="Cerrar ventana"
            />

            {/* Slide-up bottom sheet on mobile, centered rounded modal on desktop */}
            <div
                className={`relative z-10 w-full ${maxWidthClass} bg-white rounded-t-[2rem] sm:rounded-3xl shadow-[0_-15px_50px_rgba(0,0,0,0.3)] sm:shadow-2xl border-t sm:border border-stone-200/90 flex flex-col max-h-[90dvh] sm:max-h-[88dvh] overflow-hidden animate-bottom-sheet`}
                onClick={e => e.stopPropagation()}
            >
                {/* Tirador superior estilo Slide Nativo (Solo Móviles) */}
                <div
                    onClick={onClose}
                    className="sm:hidden pt-3 pb-1 flex justify-center items-center shrink-0 cursor-pointer bg-inherit"
                >
                    <div className="w-12 h-1.5 rounded-full bg-stone-300/90" />
                </div>

                {/* Cabecera Fija (Sticky Header) */}
                <div
                    className={`px-5 pt-2.5 pb-3.5 sm:p-5 border-b border-stone-100 flex items-start justify-between gap-3 shrink-0 ${headerClassName}`}
                >
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                        {icon && <div className="shrink-0">{icon}</div>}
                        <div className="min-w-0">
                            {badge && (
                                <div className="text-[10px] font-black uppercase tracking-widest mb-0.5">
                                    {badge}
                                </div>
                            )}
                            <h3 className="text-base sm:text-xl font-black text-stone-900 leading-snug">
                                {title}
                            </h3>
                            {subtitle && (
                                <p className="text-xs text-stone-500 font-medium mt-0.5 leading-relaxed">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-100/90 hover:bg-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center transition shrink-0 cursor-pointer"
                        title="Cerrar"
                    >
                        <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                </div>

                {/* Cuerpo Desplazable (Scrollable Body) */}
                <div
                    className={`flex-1 min-h-0 overflow-y-auto overscroll-contain ${bodyClassName}`}
                >
                    {children}
                </div>

                {/* Pie de Acciones Fijo (Sticky Footer) - Siempre visible en pantalla */}
                {footer && (
                    <div className="shrink-0 px-5 pt-3.5 pb-[max(1.1rem,env(safe-area-inset-bottom))] sm:p-5 border-t border-stone-200/80 bg-stone-50/95 backdrop-blur-md">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    )
}

export interface ConfirmBottomSheetModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    description: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'danger' | 'warning'
    loading?: boolean
}

export function ConfirmBottomSheetModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = 'Sí, Eliminar',
    cancelLabel = 'Cancelar',
    variant = 'danger',
    loading = false
}: ConfirmBottomSheetModalProps) {
    const isDanger = variant === 'danger'

    return (
        <BottomSheetModal
            isOpen={isOpen}
            onClose={onClose}
            maxWidthClass="max-w-md"
            headerClassName={
                isDanger
                    ? 'bg-gradient-to-r from-red-50/80 via-rose-50/50 to-white'
                    : 'bg-gradient-to-r from-amber-50/80 via-orange-50/50 to-white'
            }
            icon={
                <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs border ${
                        isDanger
                            ? 'bg-red-100 text-red-600 border-red-200'
                            : 'bg-amber-100 text-amber-700 border-amber-200'
                    }`}
                >
                    {isDanger ? (
                        <Trash2 className="w-5 h-5" />
                    ) : (
                        <AlertTriangle className="w-5 h-5" />
                    )}
                </div>
            }
            badge={
                <span className={isDanger ? 'text-red-600' : 'text-amber-700'}>
                    Confirmación Requerida
                </span>
            }
            title={title}
            footer={
                <div className="flex items-center gap-2.5 w-full">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 py-3 px-4 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 font-bold text-xs sm:text-sm transition cursor-pointer"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className={`flex-1 py-3 px-4 rounded-xl text-white font-black text-xs sm:text-sm shadow-md transition cursor-pointer disabled:opacity-50 ${
                            isDanger
                                ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-red-200'
                                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-200'
                        }`}
                    >
                        {loading ? 'Procesando...' : confirmLabel}
                    </button>
                </div>
            }
        >
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-medium">
                {description}
            </p>
        </BottomSheetModal>
    )
}
