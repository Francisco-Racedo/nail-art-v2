import type { User } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export interface AdminAutorizado {
    email: string
    rol: 'duena' | 'soporte'
    nombre: string
    updatedAt: string
}

const DEFAULT_SOPORTE_EMAIL = 'franciscor829@gmail.com'

function getEnvAllowedEmails(): string[] {
    const raw = process.env.ADMIN_ALLOWED_EMAILS || process.env.ADMIN_EMAIL || ''
    return raw
        .split(',')
        .map(e => e.trim().toLowerCase())
        .filter(Boolean)
}

export async function obtenerAdminsAutorizados(): Promise<AdminAutorizado[]> {
    try {
        const supabaseAdmin = createServiceClient()
        const { data } = await supabaseAdmin
            .from('configuracion')
            .select('valor')
            .eq('clave', 'admins_autorizados')
            .maybeSingle()

        let list: AdminAutorizado[] = []
        if (data?.valor) {
            try {
                const parsed = JSON.parse(data.valor)
                if (Array.isArray(parsed)) {
                    list = parsed
                        .filter(item => item && typeof item.email === 'string')
                        .map(item => {
                            const em = item.email.trim().toLowerCase()
                            const forcedRol =
                                em === DEFAULT_SOPORTE_EMAIL
                                    ? 'soporte'
                                    : item.rol === 'duena'
                                      ? 'duena'
                                      : 'soporte'
                            return {
                                email: em,
                                rol: forcedRol,
                                nombre:
                                    item.nombre ||
                                    (forcedRol === 'duena'
                                        ? 'Dueña del Salón'
                                        : 'Soporte Técnico'),
                                updatedAt: item.updatedAt || new Date().toISOString()
                            }
                        })
                }
            } catch {}
        }

        // Asegurar que el correo de soporte técnico principal y los de variables de entorno estén incluidos
        const emailsSet = new Set(list.map(a => a.email))
        if (!emailsSet.has(DEFAULT_SOPORTE_EMAIL)) {
            list.push({
                email: DEFAULT_SOPORTE_EMAIL,
                rol: 'soporte',
                nombre: 'Administrador de Soporte Técnico',
                updatedAt: new Date().toISOString()
            })
            emailsSet.add(DEFAULT_SOPORTE_EMAIL)
        }

        for (const envEmail of getEnvAllowedEmails()) {
            if (!emailsSet.has(envEmail)) {
                list.push({
                    email: envEmail,
                    rol: 'duena',
                    nombre: 'Administradora Autorizada',
                    updatedAt: new Date().toISOString()
                })
                emailsSet.add(envEmail)
            }
        }

        return list
    } catch {
        return [
            {
                email: DEFAULT_SOPORTE_EMAIL,
                rol: 'soporte',
                nombre: 'Administrador de Soporte Técnico',
                updatedAt: new Date().toISOString()
            }
        ]
    }
}

export async function guardarAdminsAutorizados(
    lista: AdminAutorizado[]
): Promise<void> {
    const supabaseAdmin = createServiceClient()
    await supabaseAdmin
        .from('configuracion')
        .upsert(
            [{ clave: 'admins_autorizados', valor: JSON.stringify(lista) }],
            { onConflict: 'clave' }
        )
}

export async function esUsuarioAdminAutorizado(
    user: User | null
): Promise<{ autorizado: boolean; adminInfo?: AdminAutorizado }> {
    if (!user || !user.email) {
        return { autorizado: false }
    }

    const emailNorm = user.email.trim().toLowerCase()
    const supabaseAdmin = createServiceClient()

    const { data: row } = await supabaseAdmin
        .from('configuracion')
        .select('valor')
        .eq('clave', 'admins_autorizados')
        .maybeSingle()

    const lista = await obtenerAdminsAutorizados()
    const encontrado = lista.find(a => a.email === emailNorm)

    if (encontrado) {
        // Si aún no estaba persistido en la tabla configuracion, lo persistimos
        if (!row?.valor) {
            await guardarAdminsAutorizados(lista).catch(() => {})
        }
        return { autorizado: true, adminInfo: encontrado }
    }

    // Si la clave 'admins_autorizados' todavía no existía en la BD (primera migración en vivo),
    // registramos al administrador actualmente logueado para no bloquear su sesión activa,
    // cerrando inmediatamente la lista blanca para cualquier usuario futuro no autorizado.
    if (!row?.valor) {
        const nuevoAdmin: AdminAutorizado = {
            email: emailNorm,
            rol: 'soporte',
            nombre: 'Administrador Principal',
            updatedAt: new Date().toISOString()
        }
        const nuevaLista = [...lista, nuevoAdmin]
        await guardarAdminsAutorizados(nuevaLista).catch(() => {})
        return { autorizado: true, adminInfo: nuevoAdmin }
    }

    return { autorizado: false }
}

export async function requireAdminUser(): Promise<{
    authorized: boolean
    user: User | null
    adminInfo?: AdminAutorizado
}> {
    try {
        const supabase = await createServerClient()
        const {
            data: { user },
            error
        } = await supabase.auth.getUser()

        if (error || !user) {
            return { authorized: false, user: null }
        }

        const { autorizado, adminInfo } = await esUsuarioAdminAutorizado(user)
        if (!autorizado) {
            return { authorized: false, user: null }
        }

        return { authorized: true, user, adminInfo }
    } catch {
        return { authorized: false, user: null }
    }
}

/**
 * Extracción endurecida de IP del cliente para Rate Limiting en entornos Serverless (Vercel / Reverse Proxy).
 * Prioriza cabeceras inyectadas por la plataforma (x-vercel-forwarded-for / x-real-ip)
 * para impedir que un atacante falsifique X-Forwarded-For con IPs aleatorias.
 */
export function extractClientIp(request: Request): string {
    const vercelIp = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()
    if (vercelIp) return vercelIp

    const realIp = request.headers.get('x-real-ip')?.trim()
    if (realIp) return realIp

    const xff = request.headers.get('x-forwarded-for')
    if (xff) {
        const parts = xff
            .split(',')
            .map(p => p.trim())
            .filter(Boolean)
        // Tomamos el último salto registrado por el proxy para mitigar spoofing al inicio del header
        if (parts.length > 0) {
            return parts[parts.length - 1]
        }
    }

    return '127.0.0.1'
}
