/**
 * Módulo de pagos con Mercado Pago (Seña 50%).
 * Mantenido intacto detrás del interruptor de pagos (`PAGOS_HABILITADOS` / `configuracion.pagos_habilitados`).
 * Para reactivar el cobro de seña, basta con activar el interruptor en Ajustes o en variables de entorno.
 */

export interface PreferenciaMPInput {
    tituloServicio: string
    montoSena: number
    origin: string
    externalReference?: string
}

export interface PreferenciaMPResult {
    preferenceId: string
    initPoint: string
}

export function isPagosHabilitadosEnv(): boolean {
    return process.env.PAGOS_HABILITADOS === 'true' || process.env.NEXT_PUBLIC_PAGOS_HABILITADOS === 'true'
}

export function validarOrigenSeguro(origin?: string | null): string {
    const defaultUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pintaditas-nails.vercel.app'
    if (!origin) return defaultUrl
    try {
        const parsed = new URL(origin)
        if (
            parsed.hostname === 'localhost' ||
            parsed.hostname === '127.0.0.1' ||
            parsed.hostname.endsWith('vercel.app') ||
            parsed.hostname.includes('pintaditas')
        ) {
            return parsed.origin
        }
    } catch {
        // Formato inválido
    }
    return defaultUrl
}

export async function crearPreferenciaMercadoPago(
    input: PreferenciaMPInput
): Promise<PreferenciaMPResult> {
    const token = process.env.MP_ACCESS_TOKEN || ''
    if (!token) {
        throw new Error('Falta Token de Mercado Pago (MP_ACCESS_TOKEN)')
    }

    const safeOrigin = validarOrigenSeguro(input.origin)

    const mpPayload = {
        items: [
            {
                title: `Seña Turno: ${input.tituloServicio}`,
                quantity: 1,
                unit_price: input.montoSena,
                currency_id: 'ARS'
            }
        ],
        ...(input.externalReference ? { external_reference: input.externalReference } : {}),
        back_urls: {
            success: `${safeOrigin}/reserva/estado`,
            pending: `${safeOrigin}/reserva/estado`,
            failure: `${safeOrigin}/reserva/estado`
        },
        auto_return: 'approved'
    }

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(mpPayload)
    })

    if (!mpRes.ok) {
        throw new Error('No se pudo generar link de pago en Mercado Pago')
    }

    const mpData = await mpRes.json()
    return {
        preferenceId: mpData.id,
        initPoint: mpData.init_point
    }
}
