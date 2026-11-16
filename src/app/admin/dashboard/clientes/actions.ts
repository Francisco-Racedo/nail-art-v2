'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
    obtenerFichasCRM,
    guardarKvConfig,
    EtiquetaCliente
} from '@/lib/reservas-server'
import { normalizarCelular } from '@/lib/utils'

export async function guardarFichaClienteAction(input: {
    keyOriginal?: string
    nombre: string
    celular: string
    email?: string
    fecha_nacimiento?: string
    notas_tecnicas?: string
    etiqueta?: EtiquetaCliente
    reservaIds?: number[]
}) {
    const supabaseAuth = await createServerClient()
    const {
        data: { user }
    } = await supabaseAuth.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    const nombre = (input.nombre || '').trim()
    if (nombre.length < 2) {
        return { error: 'El nombre debe tener al menos 2 caracteres.' }
    }

    const celular = (input.celular || '').replace(/\D/g, '').trim()
    const email = (input.email || '').trim()
    const fechaNac = (input.fecha_nacimiento || '').trim()
    const notas = (input.notas_tecnicas || '').trim()
    const etiqueta = input.etiqueta || 'frecuente'

    const fichas = await obtenerFichasCRM()
    const celNorm = normalizarCelular(celular)
    const finalKey =
        input.keyOriginal ||
        (celNorm ? celNorm : `nombre:${nombre.toLowerCase()}`)

    fichas[finalKey] = {
        key: finalKey,
        nombre,
        celular,
        email: email || undefined,
        fecha_nacimiento: fechaNac || undefined,
        notas_tecnicas: notas || undefined,
        etiqueta,
        oculto: false
    }

    await guardarKvConfig([
        { clave: 'clientes_crm', valor: JSON.stringify(fichas) }
    ])

    // Si la clienta ya tenía turnos en la tabla reservas, actualizamos también sus datos allí
    if (Array.isArray(input.reservaIds) && input.reservaIds.length > 0) {
        const supabaseAdmin = createServiceClient()
        await supabaseAdmin
            .from('reservas')
            .update({
                nombre,
                celular: celular || null,
                email: email || null,
                fecha_nacimiento: fechaNac || null
            })
            .in('id', input.reservaIds)
    }

    revalidatePath('/admin/dashboard/clientes')
    revalidatePath('/admin/dashboard')
    return { success: true }
}

export async function eliminarFichaClienteAction(input: {
    key: string
    reservaIds?: number[]
    borrarReservas?: boolean
}) {
    const supabaseAuth = await createServerClient()
    const {
        data: { user }
    } = await supabaseAuth.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    const fichas = await obtenerFichasCRM()

    if (
        input.borrarReservas &&
        Array.isArray(input.reservaIds) &&
        input.reservaIds.length > 0
    ) {
        const supabaseAdmin = createServiceClient()
        await supabaseAdmin
            .from('reservas')
            .delete()
            .in('id', input.reservaIds)
        delete fichas[input.key]
    } else {
        fichas[input.key] = {
            ...(fichas[input.key] || {
                key: input.key,
                nombre: '',
                celular: ''
            }),
            oculto: true
        }
    }

    await guardarKvConfig([
        { clave: 'clientes_crm', valor: JSON.stringify(fichas) }
    ])

    revalidatePath('/admin/dashboard/clientes')
    revalidatePath('/admin/dashboard')
    return { success: true }
}
