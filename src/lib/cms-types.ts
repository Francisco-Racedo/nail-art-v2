export type IconoAnimadoCMS =
    | 'sparkles'
    | 'crown'
    | 'gem'
    | 'heart'
    | 'star'
    | 'flame'
    | 'award'
    | 'gift'
    | 'shield'
    | 'clock'

export type AnimacionPremiumCMS =
    | 'fade_up'
    | 'zoom_luxury'
    | 'float_suave'
    | 'resplandor_dorado'

export type EstiloFondoCMS =
    | 'perla_editorial'
    | 'espresso_luxury'
    | 'rose_gold_glow'
    | 'cristal_minimal'

export interface PilarHeroCMS {
    id: string
    icono: IconoAnimadoCMS
    titulo: string
    subtitulo: string
}

export interface ItemSeccionPersonalizada {
    id: string
    icono: string
    titulo: string
    descripcion: string
}

export interface SeccionPersonalizada {
    id: string
    visible: boolean
    posicion: 'antes_servicios' | 'despues_servicios' | 'despues_reserva'
    estilo_fondo: EstiloFondoCMS
    animacion: AnimacionPremiumCMS
    icono_animado: IconoAnimadoCMS
    badge: string
    titulo: string
    titulo_resaltado: string
    descripcion: string
    media_tipo: 'ninguno' | 'imagen' | 'video'
    media_url: string
    boton_texto?: string
    boton_link?: string
    items?: ItemSeccionPersonalizada[]
}

export interface CMSContenido {
    navbar: {
        visible: boolean
        texto_boton: string
        mostrar_floating_cta: boolean
        texto_floating_cta: string
    }
    hero: {
        visible: boolean
        badge: string
        icono_badge: IconoAnimadoCMS
        titulo_parte1: string
        titulo_resaltado: string
        titulo_parte2: string
        cita_texto: string
        cita_destacado: string
        cita_final: string
        boton_primario: string
        boton_secundario: string
        media_principal_tipo: 'imagen' | 'video'
        imagen_principal: string
        imagen_secundaria: string
        badge_flotante_icono: string
        badge_flotante_titulo: string
        badge_flotante_subtitulo: string
        pilares: PilarHeroCMS[]
    }
    galeria: {
        visible: boolean
        badge: string
        titulo: string
        titulo_resaltado: string
        subtitulo: string
    }
    servicios: {
        visible: boolean
        badge: string
        titulo: string
        titulo_resaltado: string
        subtitulo: string
        titulo_manos: string
        icono_manos: string
        titulo_pies: string
        icono_pies: string
        mostrar_promos: boolean
        badge_promos: string
        titulo_promos: string
        titulo_promos_resaltado: string
        mostrar_cumple: boolean
        badge_cumple: string
        titulo_cumple: string
        titulo_cumple_resaltado: string
        texto_cumple: string
        boton_cumple: string
    }
    reserva: {
        visible: boolean
        badge: string
        titulo: string
        subtitulo: string
        texto_compromiso: string
        texto_boton_confirmar: string
    }
    footer: {
        visible: boolean
        ubicacion: string
        derechos: string
    }
    secciones_personalizadas: SeccionPersonalizada[]
}

export const DEFAULT_CMS_CONTENIDO: CMSContenido = {
    navbar: {
        visible: true,
        texto_boton: 'Reservar',
        mostrar_floating_cta: true,
        texto_floating_cta: 'RESERVAR TURNO AHORA'
    },
    hero: {
        visible: true,
        badge: 'Boutique Nail Studio • Lules, Tucumán',
        icono_badge: 'crown',
        titulo_parte1: 'El Arte de la',
        titulo_resaltado: 'Perfección & Delicadeza',
        titulo_parte2: 'en tus Manos.',
        cita_texto:
            'Mirarte las manos cada mañana y sentir que tu estilo habla por vos. Combinamos',
        cita_destacado: 'técnica de alta precisión, salud ungueal y diseño de autor',
        cita_final: 'en sesiones exclusivas dedicadas solo a vos.',
        boton_primario: 'Agendar mi Turno',
        boton_secundario: 'Descubrir Servicios',
        media_principal_tipo: 'imagen',
        imagen_principal: '/img/nail-1.png',
        imagen_secundaria: '/img/hero-secondary.png',
        badge_flotante_icono: '💅',
        badge_flotante_titulo: 'Acabado Mirror & Gel',
        badge_flotante_subtitulo: 'Calidad de Salón VIP',
        pilares: [
            {
                id: 'p1',
                icono: 'shield',
                titulo: 'Bioseguridad',
                subtitulo: 'Esterilización total'
            },
            {
                id: 'p2',
                icono: 'clock',
                titulo: 'Sesiones de 2 hs',
                subtitulo: 'Dedicación sin prisa'
            },
            {
                id: 'p3',
                icono: 'heart',
                titulo: 'Larga Duración',
                subtitulo: '15 a 21 días intactas'
            }
        ]
    },
    galeria: {
        visible: true,
        badge: 'Portfolio & Lookbook',
        titulo: 'Nuestros Últimos',
        titulo_resaltado: 'Diseños de Autor',
        subtitulo: 'Deslizá para inspirarte con trabajos reales realizados en nuestro estudio.'
    },
    servicios: {
        visible: true,
        badge: 'Menú de Experiencias',
        titulo: 'Lista de',
        titulo_resaltado: 'Tarifas & Cuidado',
        subtitulo:
            'Tocá cualquier servicio para conocer el detalle del protocolo. Precios actualizados en tiempo real.',
        titulo_manos: 'Servicios Base (Lisas)',
        icono_manos: '💅',
        titulo_pies: 'Servicios con 2 Decos Simples',
        icono_pies: '✨',
        mostrar_promos: true,
        badge_promos: 'Personalizá tu Diseño',
        titulo_promos: 'Adicionales,',
        titulo_promos_resaltado: 'Nail Art & Arreglos',
        mostrar_cumple: true,
        badge_cumple: 'Atención Especial a Clientas',
        titulo_cumple: '¡Celebramos tu',
        titulo_cumple_resaltado: 'Día Especial!',
        texto_cumple:
            'Al registrar tu fecha de nacimiento cuando agendás tu turno, nuestro sistema nos avisa en tu día especial para mimarte en el salón. 🥂✨',
        boton_cumple: 'Reservar mi cita'
    },
    reserva: {
        visible: true,
        badge: 'Reserva Online en Tiempo Real',
        titulo: 'Agenda tu Turno',
        subtitulo:
            'Seleccioná el día en el calendario y tu bloque de 2 horas disponible (Lunes a Sábado de 10:00 a 20:00 hs).',
        texto_compromiso:
            'Si asistís con un trabajo realizado por otra profesional y debemos retirarlo, el retiro se cobra aparte según el material (Semi $3.000, Capping $4.000, Soft Gel $4.500). Recibimos Efectivo y Transferencia.',
        texto_boton_confirmar: 'Confirmar Reserva'
    },
    footer: {
        visible: true,
        ubicacion: 'Bartolomé Mitre 155, B° 25 de Mayo • Lules, Tucumán',
        derechos: 'Pintaditas Nails by Mili Tripolone • Estudio de Manicuría Profesional'
    },
    secciones_personalizadas: []
}

export function mergeCMSContenido(raw?: string | Partial<CMSContenido> | null): CMSContenido {
    if (!raw) return DEFAULT_CMS_CONTENIDO
    try {
        const parsed: any = typeof raw === 'string' ? JSON.parse(raw) : raw
        if (!parsed || typeof parsed !== 'object') return DEFAULT_CMS_CONTENIDO
        return {
            navbar: { ...DEFAULT_CMS_CONTENIDO.navbar, ...(parsed.navbar || {}) },
            hero: {
                ...DEFAULT_CMS_CONTENIDO.hero,
                ...(parsed.hero || {}),
                pilares: Array.isArray(parsed.hero?.pilares)
                    ? parsed.hero.pilares
                    : DEFAULT_CMS_CONTENIDO.hero.pilares
            },
            galeria: { ...DEFAULT_CMS_CONTENIDO.galeria, ...(parsed.galeria || {}) },
            servicios: { ...DEFAULT_CMS_CONTENIDO.servicios, ...(parsed.servicios || {}) },
            reserva: { ...DEFAULT_CMS_CONTENIDO.reserva, ...(parsed.reserva || {}) },
            footer: { ...DEFAULT_CMS_CONTENIDO.footer, ...(parsed.footer || {}) },
            secciones_personalizadas: Array.isArray(parsed.secciones_personalizadas)
                ? parsed.secciones_personalizadas
                : []
        }
    } catch {
        return DEFAULT_CMS_CONTENIDO
    }
}
