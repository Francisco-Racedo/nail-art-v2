'use client'

import React from 'react'
import {
    Layers,
    Plus,
    Trash2,
    Eye,
    EyeOff,
    Upload,
    Film,
    Image as ImageIcon,
    Sparkles,
    Check,
    Palette,
    ArrowUpRight,
    Compass
} from 'lucide-react'
import {
    CMSContenido,
    SeccionPersonalizada,
    IconoAnimadoCMS,
    AnimacionPremiumCMS,
    EstiloFondoCMS
} from '@/lib/cms-types'
import { IconoAnimadoRenderer } from '@/components/SeccionesPersonalizadas'

interface TabSeccionesCustomProps {
    cms: CMSContenido
    setCms: React.Dispatch<React.SetStateAction<CMSContenido>>
    subirArchivoMultimedia: (file: File, onUrlReady: (url: string) => void) => Promise<void>
    subiendoArchivo: boolean
    guardandoCMS: boolean
    persistirCMS: (nuevoCms: CMSContenido, mensaje?: string) => Promise<void>
    agregarSeccionPersonalizada: () => void
    actualizarSeccionPersonalizada: (id: string, cambios: Partial<SeccionPersonalizada>) => void
    eliminarSeccionPersonalizada: (id: string) => void
}

const OPCIONES_ICONOS: { value: IconoAnimadoCMS; label: string }[] = [
    { value: 'crown', label: '👑 Corona Luxury' },
    { value: 'sparkles', label: '✨ Destellos' },
    { value: 'gem', label: '💎 Diamante' },
    { value: 'heart', label: '💖 Corazón' },
    { value: 'star', label: '⭐ Estrella' },
    { value: 'flame', label: '🔥 Tendencia' },
    { value: 'award', label: '🏅 Premio Calidad' },
    { value: 'gift', label: '🎁 Regalo / Promo' },
    { value: 'shield', label: '🛡️ Bioseguridad' },
    { value: 'clock', label: '⏰ Puntualidad' }
]

const OPCIONES_ESTILOS: {
    value: EstiloFondoCMS
    label: string
    desc: string
    colorCls: string
}[] = [
    {
        value: 'perla_editorial',
        label: 'Perla & Seda Editorial',
        desc: 'Fondo cremoso suave con halo oro rosa sutil',
        colorCls: 'bg-[#FAF6F2] border-rose-200 text-[#231C19]'
    },
    {
        value: 'espresso_luxury',
        label: 'Espresso & Champagne',
        desc: 'Fondo oscuro chocolate VIP de alto contraste',
        colorCls: 'bg-[#231C19] border-stone-800 text-amber-200'
    },
    {
        value: 'rose_gold_glow',
        label: 'Resplandor Oro Rosa',
        desc: 'Fondo cálido rosado con destellos dorados',
        colorCls: 'bg-rose-100/80 border-rose-300 text-rose-900'
    },
    {
        value: 'cristal_minimal',
        label: 'Cristal Minimalista',
        desc: 'Blanco puro cristalino con bordes finos',
        colorCls: 'bg-white border-stone-200 text-stone-900'
    }
]

export default function TabSeccionesCustom({
    cms,
    subirArchivoMultimedia,
    subiendoArchivo,
    guardandoCMS,
    persistirCMS,
    agregarSeccionPersonalizada,
    actualizarSeccionPersonalizada,
    eliminarSeccionPersonalizada
}: TabSeccionesCustomProps) {
    const inputCls =
        'w-full bg-stone-50 border border-stone-200/90 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 font-medium'
    const labelCls =
        'block text-[11px] font-bold text-stone-700 mb-1.5 uppercase tracking-wider'

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header del Constructor */}
            <div className="bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                            <Layers className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-black text-stone-900">
                                    Constructor de Secciones Personalizadas
                                </h3>
                                <span className="bg-rose-50 text-rose-700 font-bold text-xs px-2.5 py-0.5 rounded-full border border-rose-200">
                                    {cms.secciones_personalizadas.length} creadas
                                </span>
                            </div>
                            <p className="text-xs text-stone-500">
                                Agregá nuevos bloques con fotos, videos, beneficios o lanzamientos en cualquier posición de la página.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={agregarSeccionPersonalizada}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 shadow-md shadow-rose-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <Plus className="w-4 h-4" />
                        Crear Nueva Sección
                    </button>
                </div>
            </div>

            {/* Listado de Secciones Creadas */}
            {cms.secciones_personalizadas.length === 0 ? (
                <div className="bg-white border border-stone-200/90 rounded-3xl p-12 text-center shadow-xs">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-3">
                        <Layers className="w-6 h-6" />
                    </div>
                    <p className="text-base font-bold text-stone-900 mb-1">
                        Aún no creaste secciones adicionales
                    </p>
                    <p className="text-xs text-stone-500 max-w-md mx-auto mb-5 leading-relaxed">
                        Tocá &ldquo;Crear Nueva Sección&rdquo; para agregar un bloque promocional, consejos para cuidar tus uñas, videos de trabajos o anuncios para tus clientas.
                    </p>
                    <button
                        type="button"
                        onClick={agregarSeccionPersonalizada}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
                    >
                        <Plus className="w-4 h-4" />
                        Comenzar ahora
                    </button>
                </div>
            ) : (
                cms.secciones_personalizadas.map((sec, idx) => (
                    <div
                        key={sec.id}
                        className="bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs"
                    >
                        {/* Cabecera de la Sección */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-100">
                            <div className="flex items-center gap-2.5">
                                <span className="w-7 h-7 rounded-xl bg-stone-100 text-stone-700 font-black text-xs flex items-center justify-center border border-stone-200">
                                    #{idx + 1}
                                </span>
                                <div>
                                    <h4 className="font-bold text-sm text-stone-900">
                                        {sec.titulo || 'Nueva Sección'}{' '}
                                        <span className="text-rose-600 font-semibold italic">
                                            {sec.titulo_resaltado}
                                        </span>
                                    </h4>
                                    <span className="text-[11px] text-stone-400">
                                        Ubicación: {sec.posicion === 'antes_servicios' ? 'Arriba del Tarifario' : sec.posicion === 'despues_servicios' ? 'Debajo del Tarifario' : 'Debajo de la Agenda'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        actualizarSeccionPersonalizada(sec.id, {
                                            visible: !sec.visible
                                        })
                                    }
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                                        sec.visible
                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                            : 'bg-stone-100 text-stone-600 border border-stone-200'
                                    }`}
                                >
                                    {sec.visible ? (
                                        <>
                                            <Eye className="w-3.5 h-3.5" /> Visible
                                        </>
                                    ) : (
                                        <>
                                            <EyeOff className="w-3.5 h-3.5" /> Oculta
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => eliminarSeccionPersonalizada(sec.id)}
                                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 flex items-center gap-1 transition"
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> Eliminar
                                </button>
                            </div>
                        </div>

                        {/* LIVE MINI-PREVIEW DE LA SECCIÓN PERSONALIZADA */}
                        <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200/90 space-y-2">
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-stone-600">
                                <Eye className="w-3.5 h-3.5 text-rose-500" />
                                Vista Previa del Bloque
                            </span>
                            <div className="p-6 rounded-2xl border border-stone-200/80 bg-white shadow-xs space-y-3">
                                {sec.badge && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                                        <IconoAnimadoRenderer
                                            icono={sec.icono_animado || 'sparkles'}
                                            className="w-3 h-3 text-rose-600"
                                        />
                                        {sec.badge}
                                    </span>
                                )}
                                <h3 className="font-editorial text-2xl font-bold text-[#231C19]">
                                    {sec.titulo}{' '}
                                    <span className="italic font-normal text-rose-gold-gradient">
                                        {sec.titulo_resaltado}
                                    </span>
                                </h3>
                                {sec.descripcion && (
                                    <p className="text-xs text-stone-600 max-w-xl">
                                        {sec.descripcion}
                                    </p>
                                )}
                                {sec.boton_texto && (
                                    <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-xs mt-2">
                                        {sec.boton_texto}
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Controles de Configuración de la Sección */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className={labelCls}>Ubicación en la Página</label>
                                <select
                                    value={sec.posicion}
                                    onChange={e =>
                                        actualizarSeccionPersonalizada(sec.id, {
                                            posicion: e.target.value as any
                                        })
                                    }
                                    className={inputCls}
                                >
                                    <option value="antes_servicios">
                                        Arriba del Tarifario
                                    </option>
                                    <option value="despues_servicios">
                                        Debajo del Tarifario
                                    </option>
                                    <option value="despues_reserva">
                                        Debajo de la Agenda
                                    </option>
                                </select>
                            </div>

                            <div>
                                <label className={labelCls}>Animación al Entrar</label>
                                <select
                                    value={sec.animacion}
                                    onChange={e =>
                                        actualizarSeccionPersonalizada(sec.id, {
                                            animacion: e.target.value as AnimacionPremiumCMS
                                        })
                                    }
                                    className={inputCls}
                                >
                                    <option value="fade_up">Aparición Suave (Fade Up)</option>
                                    <option value="zoom_luxury">Zoom de Revista (Scale In)</option>
                                    <option value="float_suave">Flotación Continua en Vivo</option>
                                    <option value="resplandor_dorado">Desenfoque a Foco + Halo</option>
                                </select>
                            </div>

                            <div>
                                <label className={labelCls}>Icono Animado</label>
                                <select
                                    value={sec.icono_animado}
                                    onChange={e =>
                                        actualizarSeccionPersonalizada(sec.id, {
                                            icono_animado: e.target.value as IconoAnimadoCMS
                                        })
                                    }
                                    className={inputCls}
                                >
                                    {OPCIONES_ICONOS.map(op => (
                                        <option key={op.value} value={op.value}>
                                            {op.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Estilos Visuales con Tarjetas Selectoras */}
                        <div>
                            <label className={labelCls}>Paleta de Color y Fondo</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                {OPCIONES_ESTILOS.map(est => {
                                    const activo = sec.estilo_fondo === est.value
                                    return (
                                        <button
                                            key={est.value}
                                            type="button"
                                            onClick={() =>
                                                actualizarSeccionPersonalizada(sec.id, {
                                                    estilo_fondo: est.value
                                                })
                                            }
                                            className={`p-3.5 rounded-2xl border text-left transition-all ${
                                                activo
                                                    ? 'ring-2 ring-rose-500/40 shadow-xs border-rose-400'
                                                    : 'border-stone-200/90 hover:bg-stone-50'
                                            } ${est.colorCls}`}
                                        >
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-xs font-black">
                                                    {est.label}
                                                </span>
                                                {activo && (
                                                    <Check className="w-4 h-4 text-rose-500" />
                                                )}
                                            </div>
                                            <p className="text-[10px] opacity-80 leading-tight">
                                                {est.desc}
                                            </p>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Textos y Titulares */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className={labelCls}>Insignia Superior</label>
                                <input
                                    type="text"
                                    value={sec.badge}
                                    onChange={e =>
                                        actualizarSeccionPersonalizada(sec.id, {
                                            badge: e.target.value
                                        })
                                    }
                                    placeholder="Ej: Promo Exclusiva"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Título Base (Serif)</label>
                                <input
                                    type="text"
                                    value={sec.titulo}
                                    onChange={e =>
                                        actualizarSeccionPersonalizada(sec.id, {
                                            titulo: e.target.value
                                        })
                                    }
                                    placeholder="Ej: Experiencia Spa"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Resaltado (Oro Rosa)</label>
                                <input
                                    type="text"
                                    value={sec.titulo_resaltado}
                                    onChange={e =>
                                        actualizarSeccionPersonalizada(sec.id, {
                                            titulo_resaltado: e.target.value
                                        })
                                    }
                                    placeholder="Ej: Especial para Vos"
                                    className={inputCls}
                                />
                            </div>
                        </div>

                        <div>
                            <label className={labelCls}>Descripción o Párrafo Explicativo</label>
                            <textarea
                                rows={2}
                                value={sec.descripcion}
                                onChange={e =>
                                    actualizarSeccionPersonalizada(sec.id, {
                                        descripcion: e.target.value
                                    })
                                }
                                placeholder="Describí los detalles de tu tratamiento o promoción..."
                                className={inputCls}
                            />
                        </div>

                        {/* Multimedia (Imagen o Video) */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className={labelCls}>Tipo de Multimedia</label>
                                <select
                                    value={sec.media_tipo}
                                    onChange={e =>
                                        actualizarSeccionPersonalizada(sec.id, {
                                            media_tipo: e.target.value as any
                                        })
                                    }
                                    className={inputCls}
                                >
                                    <option value="ninguno">Solo Texto y Tarjetas</option>
                                    <option value="imagen">🖼️ Con Imagen</option>
                                    <option value="video">🎬 Con Video (MP4)</option>
                                </select>
                            </div>

                            {sec.media_tipo !== 'ninguno' && (
                                <div className="sm:col-span-2">
                                    <label className={labelCls}>
                                        URL de {sec.media_tipo} (o subir archivo)
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={sec.media_url}
                                            onChange={e =>
                                                actualizarSeccionPersonalizada(sec.id, {
                                                    media_url: e.target.value
                                                })
                                            }
                                            placeholder="https://... o subí un archivo"
                                            className={inputCls}
                                        />
                                        <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl cursor-pointer transition shrink-0 shadow-xs">
                                            {sec.media_tipo === 'video' ? (
                                                <Film className="w-4 h-4 text-rose-400" />
                                            ) : (
                                                <ImageIcon className="w-4 h-4 text-rose-400" />
                                            )}
                                            Subir
                                            <input
                                                type="file"
                                                accept={
                                                    sec.media_tipo === 'video'
                                                        ? 'video/*'
                                                        : 'image/*'
                                                }
                                                className="hidden"
                                                disabled={subiendoArchivo}
                                                onChange={e => {
                                                    const f = e.target.files?.[0]
                                                    if (f) {
                                                        subirArchivoMultimedia(f, url =>
                                                            actualizarSeccionPersonalizada(
                                                                sec.id,
                                                                { media_url: url }
                                                            )
                                                        )
                                                    }
                                                }}
                                            />
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Botón de Enlace */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Texto del Botón (Opcional)</label>
                                <input
                                    type="text"
                                    value={sec.boton_texto || ''}
                                    onChange={e =>
                                        actualizarSeccionPersonalizada(sec.id, {
                                            boton_texto: e.target.value
                                        })
                                    }
                                    placeholder="Ej: Reservar esta promo"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Enlace del Botón</label>
                                <input
                                    type="text"
                                    value={sec.boton_link || '#reserva'}
                                    onChange={e =>
                                        actualizarSeccionPersonalizada(sec.id, {
                                            boton_link: e.target.value
                                        })
                                    }
                                    placeholder="#reserva o https://wa.me/..."
                                    className={inputCls}
                                />
                            </div>
                        </div>
                    </div>
                ))
            )}

            {cms.secciones_personalizadas.length > 0 && (
                <div className="pt-2">
                    <button
                        type="button"
                        disabled={guardandoCMS}
                        onClick={() =>
                            persistirCMS(
                                cms,
                                'Secciones personalizadas actualizadas en tiempo real'
                            )
                        }
                        className="w-full bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-rose-500/20 text-xs uppercase tracking-widest transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                    >
                        {guardandoCMS
                            ? 'Guardando secciones...'
                            : '💾 Guardar Cambios en Secciones Personalizadas'}
                    </button>
                </div>
            )}
        </div>
    )
}
