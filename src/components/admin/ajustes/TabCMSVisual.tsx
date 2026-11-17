'use client'

import React, { useState } from 'react'
import {
    LayoutTemplate,
    Sparkles,
    Eye,
    EyeOff,
    Upload,
    Film,
    Image as ImageIcon,
    Type,
    Check,
    Smartphone,
    Sliders,
    Layers,
    Gift,
    Calendar,
    Compass,
    MapPin,
    Save
} from 'lucide-react'
import {
    CMSContenido,
    IconoAnimadoCMS
} from '@/lib/cms-types'
import { IconoAnimadoRenderer } from '@/components/SeccionesPersonalizadas'

interface TabCMSVisualProps {
    cms: CMSContenido
    setCms: React.Dispatch<React.SetStateAction<CMSContenido>>
    subirArchivoMultimedia: (file: File, onUrlReady: (url: string) => void) => Promise<void>
    subiendoArchivo: boolean
    guardandoCMS: boolean
    persistirCMS: (nuevoCms: CMSContenido, mensaje?: string) => Promise<void>
    nombreNegocio: string
}

const OPCIONES_ICONOS: { value: IconoAnimadoCMS; label: string; desc: string }[] = [
    { value: 'crown', label: 'Corona Luxury', desc: 'Exclusividad y alta gama' },
    { value: 'sparkles', label: 'Destellos', desc: 'Brillo y acabado perfecto' },
    { value: 'gem', label: 'Diamante', desc: 'Calidad superior y durabilidad' },
    { value: 'heart', label: 'Corazón', desc: 'Atención con amor y cuidado' },
    { value: 'star', label: 'Estrella', desc: 'Destacados y valoraciones' },
    { value: 'flame', label: 'Tendencia', desc: 'Diseños más pedidos' },
    { value: 'award', label: 'Premio Calidad', desc: 'Certificación profesional' },
    { value: 'gift', label: 'Regalo / Promo', desc: 'Beneficios especiales' },
    { value: 'shield', label: 'Bioseguridad', desc: 'Higiene y esterilización' },
    { value: 'clock', label: 'Puntualidad', desc: 'Tiempo y turnos dedicados' }
]

export default function TabCMSVisual({
    cms,
    setCms,
    subirArchivoMultimedia,
    subiendoArchivo,
    guardandoCMS,
    persistirCMS,
    nombreNegocio
}: TabCMSVisualProps) {
    const [subSeccion, setSubSeccion] = useState<
        'portada' | 'servicios' | 'agenda' | 'lookbook' | 'nav_footer'
    >('portada')

    const inputCls =
        'w-full bg-stone-50 border border-stone-200/90 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all font-medium'
    const labelCls =
        'block text-[11px] font-bold text-stone-700 mb-1.5 uppercase tracking-wider'

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header del CMS Visual */}
            <div className="bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                            <LayoutTemplate className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-stone-900">
                                Personalización Visual & Textos de la Web
                            </h3>
                            <p className="text-xs text-stone-500">
                                Editá títulos con tipografía editorial, cursivas oro rosa, imágenes en arco e insignias con vista previa en tiempo real.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        disabled={guardandoCMS}
                        onClick={() => persistirCMS(cms)}
                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 shadow-md shadow-rose-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shrink-0"
                    >
                        <Save className="w-4 h-4" />
                        {guardandoCMS ? 'Publicando en vivo...' : 'Guardar y Publicar en Vivo'}
                    </button>
                </div>

                {/* Sub-pestañas para navegar cada sección de la página web */}
                <div className="flex flex-wrap items-center gap-2 pt-5">
                    <button
                        type="button"
                        onClick={() => setSubSeccion('portada')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                            subSeccion === 'portada'
                                ? 'bg-stone-900 text-white shadow-xs'
                                : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200/80'
                        }`}
                    >
                        <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                        1. Portada Principal (Hero)
                    </button>

                    <button
                        type="button"
                        onClick={() => setSubSeccion('servicios')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                            subSeccion === 'servicios'
                                ? 'bg-stone-900 text-white shadow-xs'
                                : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200/80'
                        }`}
                    >
                        <Gift className="w-3.5 h-3.5 text-amber-500" />
                        2. Tarifario & Tarjeta Cumpleaños
                    </button>

                    <button
                        type="button"
                        onClick={() => setSubSeccion('lookbook')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                            subSeccion === 'lookbook'
                                ? 'bg-stone-900 text-white shadow-xs'
                                : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200/80'
                        }`}
                    >
                        <ImageIcon className="w-3.5 h-3.5 text-pink-500" />
                        3. Galería Lookbook
                    </button>

                    <button
                        type="button"
                        onClick={() => setSubSeccion('agenda')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                            subSeccion === 'agenda'
                                ? 'bg-stone-900 text-white shadow-xs'
                                : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200/80'
                        }`}
                    >
                        <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                        4. Agenda de Turnos
                    </button>

                    <button
                        type="button"
                        onClick={() => setSubSeccion('nav_footer')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                            subSeccion === 'nav_footer'
                                ? 'bg-stone-900 text-white shadow-xs'
                                : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200/80'
                        }`}
                    >
                        <Compass className="w-3.5 h-3.5 text-indigo-500" />
                        5. Navegación & Pie de Página
                    </button>
                </div>
            </div>

            {/* =========================================================================
                1. PORTADA PRINCIPAL (HERO)
               ========================================================================= */}
            {subSeccion === 'portada' && (
                <div className="space-y-6">
                    {/* LIVE PREVIEW COMPLETO DE LA PORTADA */}
                    <div className="bg-gradient-to-b from-[#FAF6F2] via-[#FDF8F5] to-[#F6EAE3] border border-rose-200/80 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-rose-200/60">
                            <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-rose-800">
                                <Eye className="w-4 h-4 text-rose-600" />
                                Vista Previa en Vivo: Portada de Revista (Hero)
                            </span>
                            <button
                                type="button"
                                onClick={() =>
                                    setCms(p => ({
                                        ...p,
                                        hero: { ...p.hero, visible: !p.hero.visible }
                                    }))
                                }
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                                    cms.hero.visible
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}
                            >
                                {cms.hero.visible ? (
                                    <>
                                        <Eye className="w-3.5 h-3.5" /> Visible en la web
                                    </>
                                ) : (
                                    <>
                                        <EyeOff className="w-3.5 h-3.5" /> Oculta para clientas
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Maqueta Editorial en Vivo */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                            {/* Columna Izquierda: Textos y Tipografías */}
                            <div className="lg:col-span-7 space-y-4">
                                {cms.hero.badge && (
                                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/90 border border-rose-200 shadow-xs">
                                        <IconoAnimadoRenderer
                                            icono={cms.hero.icono_badge || 'crown'}
                                            className="w-3.5 h-3.5 text-amber-600"
                                        />
                                        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-700">
                                            {cms.hero.badge}
                                        </span>
                                    </div>
                                )}

                                {/* TÍTULO CON TIPOGRAFÍA EDITORIAL REAL Y CURSIVA ORO ROSA */}
                                <h1 className="font-editorial text-3xl sm:text-5xl font-semibold leading-[1.08] tracking-tight text-[#231C19]">
                                    {cms.hero.titulo_parte1}{' '}
                                    <span className="italic font-normal text-rose-gold-gradient block sm:inline">
                                        {cms.hero.titulo_resaltado}
                                    </span>{' '}
                                    {cms.hero.titulo_parte2}
                                </h1>

                                {/* CITA DE AUTOR */}
                                {(cms.hero.cita_texto || cms.hero.cita_destacado || cms.hero.cita_final) && (
                                    <p className="text-stone-600 text-xs sm:text-sm font-normal leading-relaxed max-w-lg">
                                        &ldquo;{cms.hero.cita_texto}{' '}
                                        {cms.hero.cita_destacado && (
                                            <strong className="font-semibold text-[#231C19] underline decoration-rose-300 decoration-2 underline-offset-4">
                                                {cms.hero.cita_destacado}
                                            </strong>
                                        )}{' '}
                                        {cms.hero.cita_final}&rdquo;
                                        <span className="font-editorial italic text-sm block mt-1.5 text-rose-700 font-semibold">
                                            — {nombreNegocio}
                                        </span>
                                    </p>
                                )}

                                {/* BOTONES */}
                                <div className="flex flex-wrap items-center gap-3 pt-2">
                                    {cms.hero.boton_primario && (
                                        <span className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-full shadow-md">
                                            <Sparkles className="w-3.5 h-3.5" />
                                            {cms.hero.boton_primario}
                                        </span>
                                    )}
                                    {cms.hero.boton_secundario && (
                                        <span className="inline-flex items-center gap-2 bg-white/90 text-stone-800 border border-rose-200 font-semibold text-xs uppercase tracking-wider px-5 py-2.5 rounded-full shadow-xs">
                                            {cms.hero.boton_secundario}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Columna Derecha: Arco Multimedia y Badge de Confianza */}
                            <div className="lg:col-span-5 relative flex justify-center">
                                <div className="relative w-48 sm:w-56 h-64 sm:h-72 rounded-t-full rounded-b-[2rem] border-4 border-white shadow-xl overflow-hidden bg-stone-100">
                                    {cms.hero.media_principal_tipo === 'video' && cms.hero.imagen_principal ? (
                                        <video
                                            src={cms.hero.imagen_principal}
                                            autoPlay
                                            muted
                                            loop
                                            playsInline
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <img
                                            src={cms.hero.imagen_principal || '/img/nail-1.png'}
                                            alt="Preview Portada"
                                            className="w-full h-full object-cover"
                                            onError={e => {
                                                e.currentTarget.src =
                                                    'https://images.unsplash.com/photo-1519014816548-bf5fe059c98b?auto=format&fit=crop&w=800&q=85'
                                            }}
                                        />
                                    )}

                                    {/* Badge flotante en el arco */}
                                    {cms.hero.badge_flotante_titulo && (
                                        <div className="absolute top-3 right-2 bg-white/95 backdrop-blur-md border border-rose-200 rounded-xl px-2.5 py-1.5 shadow-md flex items-center gap-1.5">
                                            <span className="text-sm">{cms.hero.badge_flotante_icono || '💅'}</span>
                                            <div>
                                                <p className="text-[10px] font-black text-stone-900 leading-tight">
                                                    {cms.hero.badge_flotante_titulo}
                                                </p>
                                                <p className="text-[9px] text-rose-600 font-semibold">
                                                    {cms.hero.badge_flotante_subtitulo}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CONTROLES EDITORIALES DE LA PORTADA */}
                    <div className="bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
                        <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
                            <Type className="w-5 h-5 text-rose-500" />
                            <h4 className="text-sm font-black text-stone-900 uppercase tracking-wider">
                                1. Titular Principal & Tipografía Editorial
                            </h4>
                        </div>

                        {/* Explicación de tipografía para el dueño */}
                        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-900 flex items-start gap-3">
                            <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <span className="font-bold block mb-0.5">
                                    Cómo funciona la tipografía de la portada:
                                </span>
                                El titular combina la fuente serif de alta gama <em>(Cormorant Garamond)</em> con una palabra o frase en cursiva animada con gradiente oro rosa <em>(Rose Gold Shimmer)</em>. Completá cada fragmento para componer la frase.
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className={labelCls}>
                                    Parte 1: Texto Inicial (Serif)
                                </label>
                                <input
                                    type="text"
                                    value={cms.hero.titulo_parte1}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            hero: { ...p.hero, titulo_parte1: e.target.value }
                                        }))
                                    }
                                    placeholder="Ej: Manicuría Rusa &"
                                    className={inputCls}
                                />
                                <span className="text-[10px] text-stone-400 mt-1 block">
                                    Aparece al inicio en fuente serif elegante.
                                </span>
                            </div>

                            <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-200/80">
                                <label className="block text-[11px] font-bold text-rose-900 mb-1.5 uppercase tracking-wider flex items-center justify-between">
                                    <span>Parte 2: Cursiva Oro Rosa</span>
                                    <span className="text-[10px] bg-rose-200 text-rose-800 px-1.5 py-0.2 rounded font-normal">
                                        Efecto Shimmer
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    value={cms.hero.titulo_resaltado}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            hero: { ...p.hero, titulo_resaltado: e.target.value }
                                        }))
                                    }
                                    placeholder="Ej: Nail Art Exclusivo"
                                    className="w-full bg-white border border-rose-300 rounded-xl px-3 py-2 text-xs font-bold text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                                />
                                <span className="text-[10px] text-rose-700/80 mt-1 block">
                                    Se destaca con brillo fluido dorado y rosa.
                                </span>
                            </div>

                            <div>
                                <label className={labelCls}>
                                    Parte 3: Texto de Cierre
                                </label>
                                <input
                                    type="text"
                                    value={cms.hero.titulo_parte2}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            hero: { ...p.hero, titulo_parte2: e.target.value }
                                        }))
                                    }
                                    placeholder="Ej: en Yerba Buena"
                                    className={inputCls}
                                />
                                <span className="text-[10px] text-stone-400 mt-1 block">
                                    Cierre de la frase o ubicación.
                                </span>
                            </div>
                        </div>

                        {/* Insignia Superior & Selector Visual de Icono */}
                        <div className="pt-4 border-t border-stone-100">
                            <label className={labelCls}>
                                Insignia Superior (Badge de Bienvenida)
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <input
                                    type="text"
                                    value={cms.hero.badge}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            hero: { ...p.hero, badge: e.target.value }
                                        }))
                                    }
                                    placeholder="Ej: Salón Privado • Citas Exclusivas"
                                    className={inputCls}
                                />
                                <div className="text-xs text-stone-500 flex items-center">
                                    Se ubica como una pastilla flotante sobre el título con el icono animado seleccionado a continuación.
                                </div>
                            </div>

                            {/* Selector Visual de Iconos con Animación en Vivo */}
                            <label className={labelCls}>
                                Elegí el Icono Animado para la Insignia:
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                                {OPCIONES_ICONOS.map(op => {
                                    const activo = (cms.hero.icono_badge || 'crown') === op.value
                                    return (
                                        <button
                                            key={op.value}
                                            type="button"
                                            onClick={() =>
                                                setCms(p => ({
                                                    ...p,
                                                    hero: { ...p.hero, icono_badge: op.value }
                                                }))
                                            }
                                            className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 ${
                                                activo
                                                    ? 'bg-rose-50/90 border-rose-400 shadow-xs ring-2 ring-rose-400/20'
                                                    : 'bg-stone-50/80 border-stone-200/80 hover:bg-stone-100'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="w-8 h-8 rounded-xl bg-white border border-stone-200/70 flex items-center justify-center text-rose-600 shadow-xs">
                                                    <IconoAnimadoRenderer
                                                        icono={op.value}
                                                        className="w-4 h-4"
                                                    />
                                                </div>
                                                {activo && (
                                                    <Check className="w-4 h-4 text-rose-600" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-stone-900 leading-tight">
                                                    {op.label}
                                                </p>
                                                <p className="text-[10px] text-stone-500 line-clamp-1">
                                                    {op.desc}
                                                </p>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Cita de Autor */}
                        <div className="pt-4 border-t border-stone-100 space-y-3">
                            <label className={labelCls}>
                                Cita Inspiracional / Declaración del Estudio
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <span className="text-[10px] font-bold text-stone-500 block mb-1">
                                        Texto Previo
                                    </span>
                                    <input
                                        type="text"
                                        value={cms.hero.cita_texto}
                                        onChange={e =>
                                            setCms(p => ({
                                                ...p,
                                                hero: { ...p.hero, cita_texto: e.target.value }
                                            }))
                                        }
                                        placeholder="Diseñamos cada detalle para"
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-rose-700 block mb-1">
                                        Frase Subrayada con Rosa
                                    </span>
                                    <input
                                        type="text"
                                        value={cms.hero.cita_destacado}
                                        onChange={e =>
                                            setCms(p => ({
                                                ...p,
                                                hero: { ...p.hero, cita_destacado: e.target.value }
                                            }))
                                        }
                                        placeholder="resaltar la elegancia natural"
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-stone-500 block mb-1">
                                        Texto Final de la Cita
                                    </span>
                                    <input
                                        type="text"
                                        value={cms.hero.cita_final}
                                        onChange={e =>
                                            setCms(p => ({
                                                ...p,
                                                hero: { ...p.hero, cita_final: e.target.value }
                                            }))
                                        }
                                        placeholder="de tus manos con técnicas seguras."
                                        className={inputCls}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Botones de Llamado a la Acción (CTAs) */}
                        <div className="pt-4 border-t border-stone-100">
                            <label className={labelCls}>
                                Botones de Acción (Llamados a la Acción)
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[10px] font-bold text-stone-500 block mb-1">
                                        Botón Principal (Lleva a la agenda de turnos)
                                    </span>
                                    <input
                                        type="text"
                                        value={cms.hero.boton_primario}
                                        onChange={e =>
                                            setCms(p => ({
                                                ...p,
                                                hero: { ...p.hero, boton_primario: e.target.value }
                                            }))
                                        }
                                        placeholder="Reservar Turno"
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-stone-500 block mb-1">
                                        Botón Secundario (Lleva al tarifario)
                                    </span>
                                    <input
                                        type="text"
                                        value={cms.hero.boton_secundario}
                                        onChange={e =>
                                            setCms(p => ({
                                                ...p,
                                                hero: {
                                                    ...p.hero,
                                                    boton_secundario: e.target.value
                                                }
                                            }))
                                        }
                                        placeholder="Ver Tratamientos"
                                        className={inputCls}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Multimedia en Arco Romano (Imagen o Video) */}
                        <div className="pt-4 border-t border-stone-100 space-y-4">
                            <div className="flex items-center justify-between">
                                <label className={labelCls}>
                                    Multimedia Principal del Arco (Imagen o Video)
                                </label>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setCms(p => ({
                                                ...p,
                                                hero: { ...p.hero, media_principal_tipo: 'imagen' }
                                            }))
                                        }
                                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                                            cms.hero.media_principal_tipo === 'imagen'
                                                ? 'bg-rose-500 text-white shadow-xs'
                                                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                        }`}
                                    >
                                        <ImageIcon className="w-3.5 h-3.5" /> Imagen
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setCms(p => ({
                                                ...p,
                                                hero: { ...p.hero, media_principal_tipo: 'video' }
                                            }))
                                        }
                                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                                            cms.hero.media_principal_tipo === 'video'
                                                ? 'bg-rose-500 text-white shadow-xs'
                                                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                        }`}
                                    >
                                        <Film className="w-3.5 h-3.5" /> Video (MP4)
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={cms.hero.imagen_principal}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            hero: { ...p.hero, imagen_principal: e.target.value }
                                        }))
                                    }
                                    placeholder="https://... o subí un archivo desde tu dispositivo"
                                    className={inputCls}
                                />
                                <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl cursor-pointer transition shrink-0 shadow-xs">
                                    <Upload className="w-4 h-4 text-rose-400" />
                                    {subiendoArchivo ? 'Subiendo...' : 'Subir Archivo'}
                                    <input
                                        type="file"
                                        accept="image/*,video/*"
                                        className="hidden"
                                        disabled={subiendoArchivo}
                                        onChange={e => {
                                            const f = e.target.files?.[0]
                                            if (f) {
                                                subirArchivoMultimedia(f, url =>
                                                    setCms(p => ({
                                                        ...p,
                                                        hero: {
                                                            ...p.hero,
                                                            imagen_principal: url
                                                        }
                                                    }))
                                                )
                                            }
                                        }}
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Tarjeta Flotante de Confianza (Glass Card) */}
                        <div className="pt-4 border-t border-stone-100">
                            <label className={labelCls}>
                                Tarjeta Flotante de Confianza (Espejo Glass en el Arco)
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <span className="text-[10px] font-bold text-stone-500 block mb-1">
                                        Emoji / Icono
                                    </span>
                                    <input
                                        type="text"
                                        value={cms.hero.badge_flotante_icono}
                                        onChange={e =>
                                            setCms(p => ({
                                                ...p,
                                                hero: {
                                                    ...p.hero,
                                                    badge_flotante_icono: e.target.value
                                                }
                                            }))
                                        }
                                        placeholder="💅"
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-stone-500 block mb-1">
                                        Título de la Tarjeta
                                    </span>
                                    <input
                                        type="text"
                                        value={cms.hero.badge_flotante_titulo}
                                        onChange={e =>
                                            setCms(p => ({
                                                ...p,
                                                hero: {
                                                    ...p.hero,
                                                    badge_flotante_titulo: e.target.value
                                                }
                                            }))
                                        }
                                        placeholder="100% Esterilizado"
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-stone-500 block mb-1">
                                        Subtítulo de la Tarjeta
                                    </span>
                                    <input
                                        type="text"
                                        value={cms.hero.badge_flotante_subtitulo}
                                        onChange={e =>
                                            setCms(p => ({
                                                ...p,
                                                hero: {
                                                    ...p.hero,
                                                    badge_flotante_subtitulo: e.target.value
                                                }
                                            }))
                                        }
                                        placeholder="Bioseguridad en autoclave"
                                        className={inputCls}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================================================
                2. TARIFARIO & TARJETA CUMPLEAÑOS
               ========================================================================= */}
            {subSeccion === 'servicios' && (
                <div className="space-y-6">
                    {/* Live Preview del encabezado y tarjeta de cumpleaños */}
                    <div className="bg-[#FAF6F2] border border-rose-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
                        <div className="flex items-center justify-between pb-3 border-b border-rose-200/60">
                            <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-rose-800">
                                <Eye className="w-4 h-4 text-rose-600" />
                                Vista Previa en Vivo: Tarifario & Cumpleaños
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setCms(p => ({
                                            ...p,
                                            servicios: {
                                                ...p.servicios,
                                                visible: !p.servicios.visible
                                            }
                                        }))
                                    }
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        cms.servicios.visible
                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                                    }`}
                                >
                                    {cms.servicios.visible ? 'Tarifario Visible' : 'Tarifario Oculto'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setCms(p => ({
                                            ...p,
                                            servicios: {
                                                ...p.servicios,
                                                mostrar_cumple: !p.servicios.mostrar_cumple
                                            }
                                        }))
                                    }
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        cms.servicios.mostrar_cumple
                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                            : 'bg-stone-200 text-stone-600'
                                    }`}
                                >
                                    {cms.servicios.mostrar_cumple
                                        ? 'Tarjeta Cumple Visible'
                                        : 'Tarjeta Cumple Oculta'}
                                </button>
                            </div>
                        </div>

                        {/* Encabezado Editorial de Tarifario */}
                        <div className="text-center max-w-xl mx-auto space-y-2">
                            <h2 className="font-editorial text-3xl sm:text-4xl font-bold text-[#231C19]">
                                {cms.servicios.titulo}{' '}
                                <span className="italic font-normal text-rose-gold-gradient">
                                    {cms.servicios.titulo_resaltado}
                                </span>
                            </h2>
                            <p className="text-xs sm:text-sm text-stone-600">
                                {cms.servicios.subtitulo}
                            </p>
                        </div>

                        {/* Tarjeta de Cumpleaños Estilizada */}
                        {cms.servicios.mostrar_cumple && (
                            <div className="max-w-xl mx-auto p-5 rounded-2xl bg-gradient-to-r from-rose-100/90 via-pink-50 to-amber-100/80 border border-rose-200/90 shadow-xs flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-rose-200 flex items-center justify-center text-2xl shrink-0">
                                    🎂
                                </div>
                                <div className="space-y-0.5">
                                    <h4 className="font-editorial font-bold text-base text-[#231C19]">
                                        {cms.servicios.titulo_cumple_resaltado}
                                    </h4>
                                    <p className="text-xs text-stone-600 leading-relaxed">
                                        {cms.servicios.texto_cumple}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Controles del Tarifario */}
                    <div className="bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
                        <h4 className="text-sm font-black text-stone-900 uppercase tracking-wider pb-3 border-b border-stone-100">
                            Textos del Encabezado del Tarifario
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className={labelCls}>Título Base (Serif)</label>
                                <input
                                    type="text"
                                    value={cms.servicios.titulo}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            servicios: { ...p.servicios, titulo: e.target.value }
                                        }))
                                    }
                                    placeholder="Lista de Precios &"
                                    className={inputCls}
                                />
                            </div>
                            <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-200/80">
                                <label className="block text-[11px] font-bold text-rose-900 mb-1.5 uppercase tracking-wider">
                                    Resaltado (Cursiva Oro Rosa)
                                </label>
                                <input
                                    type="text"
                                    value={cms.servicios.titulo_resaltado}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            servicios: {
                                                ...p.servicios,
                                                titulo_resaltado: e.target.value
                                            }
                                        }))
                                    }
                                    placeholder="Tratamientos Exclusivos"
                                    className="w-full bg-white border border-rose-300 rounded-xl px-3 py-2 text-xs font-bold text-rose-900 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Subtítulo Descriptivo</label>
                                <input
                                    type="text"
                                    value={cms.servicios.subtitulo}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            servicios: { ...p.servicios, subtitulo: e.target.value }
                                        }))
                                    }
                                    placeholder="Elegí el servicio ideal para tus manos."
                                    className={inputCls}
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-stone-100 space-y-3">
                            <h4 className="text-sm font-black text-stone-900 uppercase tracking-wider">
                                Tarjeta Promocional de Cumpleaños
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Título del Beneficio Cumpleaños</label>
                                    <input
                                        type="text"
                                        value={cms.servicios.titulo_cumple_resaltado}
                                        onChange={e =>
                                            setCms(p => ({
                                                ...p,
                                                servicios: {
                                                    ...p.servicios,
                                                    titulo_cumple_resaltado: e.target.value
                                                }
                                            }))
                                        }
                                        placeholder="¿Cumplís años este mes? 🎁"
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Detalle del Regalo o Descuento</label>
                                    <input
                                        type="text"
                                        value={cms.servicios.texto_cumple}
                                        onChange={e =>
                                            setCms(p => ({
                                                ...p,
                                                servicios: {
                                                    ...p.servicios,
                                                    texto_cumple: e.target.value
                                                }
                                            }))
                                        }
                                        placeholder="Presentando tu DNI tenés un 15% OFF o nail art simple de regalo."
                                        className={inputCls}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================================================
                3. GALERÍA LOOKBOOK
               ========================================================================= */}
            {subSeccion === 'lookbook' && (
                <div className="space-y-6">
                    <div className="bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
                        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                            <div>
                                <h4 className="text-sm font-black text-stone-900 uppercase tracking-wider">
                                    Sección Galería Lookbook
                                </h4>
                                <p className="text-xs text-stone-500">
                                    Controlá la visibilidad de la galería de fotos y reels de Instagram.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() =>
                                    setCms(p => ({
                                        ...p,
                                        galeria: {
                                            ...p.galeria,
                                            visible: !p.galeria.visible
                                        }
                                    }))
                                }
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    cms.galeria.visible
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}
                            >
                                {cms.galeria.visible ? 'Galería Visible' : 'Galería Oculta'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className={labelCls}>Título Base</label>
                                <input
                                    type="text"
                                    value={cms.galeria.titulo}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            galeria: { ...p.galeria, titulo: e.target.value }
                                        }))
                                    }
                                    placeholder="Nuestros Trabajos &"
                                    className={inputCls}
                                />
                            </div>
                            <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-200/80">
                                <label className="block text-[11px] font-bold text-rose-900 mb-1.5 uppercase tracking-wider">
                                    Resaltado (Cursiva Oro Rosa)
                                </label>
                                <input
                                    type="text"
                                    value={cms.galeria.titulo_resaltado}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            galeria: {
                                                ...p.galeria,
                                                titulo_resaltado: e.target.value
                                            }
                                        }))
                                    }
                                    placeholder="Inspiración Semanal"
                                    className="w-full bg-white border border-rose-300 rounded-xl px-3 py-2 text-xs font-bold text-rose-900 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Subtítulo</label>
                                <input
                                    type="text"
                                    value={cms.galeria.subtitulo}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            galeria: { ...p.galeria, subtitulo: e.target.value }
                                        }))
                                    }
                                    placeholder="Mirá los sets más pedidos por nuestras clientas."
                                    className={inputCls}
                                />
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-600 flex items-center justify-between">
                            <span>
                                📸 <strong>¿Querés subir o cambiar las fotos del carrusel o reels?</strong> Podés hacerlo en la pestaña <strong>Carrusel</strong> del menú superior.
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================================================
                4. AGENDA DE TURNOS
               ========================================================================= */}
            {subSeccion === 'agenda' && (
                <div className="space-y-6">
                    <div className="bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
                        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                            <div>
                                <h4 className="text-sm font-black text-stone-900 uppercase tracking-wider">
                                    Encabezado de la Agenda de Turnos
                                </h4>
                                <p className="text-xs text-stone-500">
                                    Textos que le dan la bienvenida a la clienta al momento de elegir fecha y horario.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() =>
                                    setCms(p => ({
                                        ...p,
                                        reserva: {
                                            ...p.reserva,
                                            visible: !p.reserva.visible
                                        }
                                    }))
                                }
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    cms.reserva.visible
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}
                            >
                                {cms.reserva.visible ? 'Agenda Visible' : 'Agenda Oculta'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Título de la Sección Agenda</label>
                                <input
                                    type="text"
                                    value={cms.reserva.titulo}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            reserva: { ...p.reserva, titulo: e.target.value }
                                        }))
                                    }
                                    placeholder="Agendá tu Cita"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Subtítulo Descriptivo</label>
                                <input
                                    type="text"
                                    value={cms.reserva.subtitulo}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            reserva: { ...p.reserva, subtitulo: e.target.value }
                                        }))
                                    }
                                    placeholder="Elegí día y horario disponible para tu atención personalizada."
                                    className={inputCls}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================================================
                5. NAVEGACIÓN & PIE DE PÁGINA (FOOTER)
               ========================================================================= */}
            {subSeccion === 'nav_footer' && (
                <div className="space-y-6">
                    <div className="bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
                        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                            <div>
                                <h4 className="text-sm font-black text-stone-900 uppercase tracking-wider">
                                    Barra Superior & Botón Flotante Móvil
                                </h4>
                                <p className="text-xs text-stone-500">
                                    Controlá los botones rápidos que acompañan a la clienta mientras navega.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setCms(p => ({
                                            ...p,
                                            navbar: { ...p.navbar, visible: !p.navbar.visible }
                                        }))
                                    }
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        cms.navbar.visible
                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                                    }`}
                                >
                                    {cms.navbar.visible ? 'Barra Visible' : 'Barra Oculta'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setCms(p => ({
                                            ...p,
                                            navbar: {
                                                ...p.navbar,
                                                mostrar_floating_cta: !p.navbar.mostrar_floating_cta
                                            }
                                        }))
                                    }
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        cms.navbar.mostrar_floating_cta
                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                            : 'bg-stone-200 text-stone-600'
                                    }`}
                                >
                                    {cms.navbar.mostrar_floating_cta
                                        ? 'Botón Flotante Activo'
                                        : 'Botón Flotante Desactivado'}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Texto Botón Barra Superior</label>
                                <input
                                    type="text"
                                    value={cms.navbar.texto_boton}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            navbar: { ...p.navbar, texto_boton: e.target.value }
                                        }))
                                    }
                                    placeholder="Reservar Turno"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>
                                    Texto Botón Flotante (En celulares)
                                </label>
                                <input
                                    type="text"
                                    value={cms.navbar.texto_floating_cta}
                                    onChange={e =>
                                        setCms(p => ({
                                            ...p,
                                            navbar: {
                                                ...p.navbar,
                                                texto_floating_cta: e.target.value
                                            }
                                        }))
                                    }
                                    placeholder="Agendar Cita Rápida"
                                    className={inputCls}
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-stone-100 space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-black text-stone-900 uppercase tracking-wider">
                                    Pie de Página (Footer)
                                </h4>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setCms(p => ({
                                            ...p,
                                            footer: { ...p.footer, visible: !p.footer.visible }
                                        }))
                                    }
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        cms.footer.visible
                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                                    }`}
                                >
                                    {cms.footer.visible ? 'Footer Visible' : 'Footer Oculto'}
                                </button>
                            </div>

                            {/* VISTA PREVIA EN VIVO DEL PIE DE PÁGINA */}
                            <div className="p-5 rounded-2xl bg-gradient-to-b from-[#FAF6F2] to-[#F3E9E2] border border-rose-200/80 space-y-3">
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-rose-800">
                                    <Eye className="w-3.5 h-3.5 text-rose-600" />
                                    Vista Previa en Vivo: Pie de Página
                                </span>

                                <div className="p-6 rounded-2xl bg-white/80 border border-rose-200/60 text-center space-y-3 shadow-xs">
                                    <div className="w-8 h-8 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
                                        <Sparkles className="w-3.5 h-3.5" />
                                    </div>
                                    <p className="font-editorial text-xl font-bold tracking-wider text-[#231C19]">
                                        {nombreNegocio || 'PINTADITAS NAILS'}{' '}
                                        <span className="font-sans font-light italic text-sm text-rose-600/90 tracking-normal">
                                            by Mili Tripolone
                                        </span>
                                    </p>
                                    <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-stone-600">
                                        <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-rose-200/80 shadow-xs">
                                            <MapPin className="w-3.5 h-3.5 text-rose-500" />
                                            {cms.footer.ubicacion || 'Bartolomé Mitre 155, B° 25 de Mayo • Lules, Tucumán'}
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-rose-200/80 shadow-xs">
                                            Lunes a Sábado • 08:30 a 20:00 hs
                                        </span>
                                    </div>
                                    {cms.footer.derechos && (
                                        <p className="text-xs text-stone-500 font-medium">
                                            {cms.footer.derechos}
                                        </p>
                                    )}
                                    <p className="text-[11px] text-stone-400 font-light tracking-wide">
                                        {cms.footer.copyright || '© 2026 Pintaditas Nails by Mili Tripolone • Todos los derechos reservados.'}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className={labelCls}>
                                        Dirección / Ubicación Mostrada
                                    </label>
                                    <input
                                        type="text"
                                        value={cms.footer.ubicacion}
                                        onChange={e =>
                                            setCms(p => ({
                                                ...p,
                                                footer: { ...p.footer, ubicacion: e.target.value }
                                            }))
                                        }
                                        placeholder="Bartolomé Mitre 155, B° 25 de Mayo • Lules, Tucumán"
                                        className={inputCls}
                                    />
                                    <span className="text-[10px] text-stone-400 mt-1 block">
                                        Genera el enlace directo a Google Maps para las clientas.
                                    </span>
                                </div>
                                <div>
                                    <label className={labelCls}>
                                        Subtítulo / Especialidad del Salón
                                    </label>
                                    <input
                                        type="text"
                                        value={cms.footer.derechos}
                                        onChange={e =>
                                            setCms(p => ({
                                                ...p,
                                                footer: { ...p.footer, derechos: e.target.value }
                                            }))
                                        }
                                        placeholder="Pintaditas Nails by Mili Tripolone • Estudio de Manicuría Profesional"
                                        className={inputCls}
                                    />
                                    <span className="text-[10px] text-stone-400 mt-1 block">
                                        Firma institucional del estudio de manicuría.
                                    </span>
                                </div>
                                <div>
                                    <label className={labelCls}>
                                        Copyright & Derechos Reservados
                                    </label>
                                    <input
                                        type="text"
                                        value={cms.footer.copyright || ''}
                                        onChange={e =>
                                            setCms(p => ({
                                                ...p,
                                                footer: { ...p.footer, copyright: e.target.value }
                                            }))
                                        }
                                        placeholder="© 2026 Pintaditas Nails. Todos los derechos reservados."
                                        className={inputCls}
                                    />
                                    <span className="text-[10px] text-stone-400 mt-1 block">
                                        Protección de propiedad intelectual de la marca y año en curso.
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
