'use server'

import { createClient as createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { guardarKvConfig, getConfigCompleta } from '@/lib/reservas-server'
import { CMSContenido, mergeCMSContenido } from '@/lib/cms-types'

const ConfigSchema = z
    .object({
        intervalo_minutos: z.coerce
            .number()
            .int()
            .min(15, 'El intervalo debe ser de al menos 15 minutos')
            .max(240, 'Máximo 240 minutos'),
        hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido'),
        hora_fin: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido'),
        nombre_negocio: z.string().min(2, 'El nombre del negocio es requerido').max(80),
        whatsapp_numero: z
            .string()
            .regex(
                /^\d{10,15}$/,
                'El número debe tener entre 10 y 15 dígitos sin símbolos especiales (sin +) ni espacios'
            )
    })
    .refine(
        d => {
            const [hInicio, mInicio] = d.hora_inicio.split(':').map(Number)
            const [hFin, mFin] = d.hora_fin.split(':').map(Number)
            const minStart = hInicio * 60 + mInicio
            const minEnd = hFin * 60 + mFin
            return minStart < minEnd
        },
        {
            message: 'La hora de fin debe ser posterior a la de inicio',
            path: ['hora_fin']
        }
    )

const ServicioSchema = z.object({
    categoria: z.enum(['Manos', 'Pies & Extras', 'Promos']),
    nombre: z
        .string()
        .min(3, 'El nombre debe tener al menos 3 caracteres')
        .max(100)
        .regex(/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-\.\/\+]+$/, 'El nombre contiene caracteres inválidos'),
    subtitulo: z.string().max(150).optional(),
    descripcion: z.string().max(500).optional(),
    precio: z.coerce
        .number()
        .positive('El precio debe ser un valor entero mayor a cero')
        .max(1_000_000),
    icono: z.string().max(10).optional(),
    destacado: z.number().int().min(0).max(1)
})

export async function updateConfig(formData: FormData) {
    const supabaseAuth = await createServerClient()
    const {
        data: { user }
    } = await supabaseAuth.auth.getUser()
    if (!user) throw new Error('No autorizado')

    const parsed = ConfigSchema.safeParse({
        intervalo_minutos: formData.get('intervalo_minutos'),
        hora_inicio: formData.get('hora_inicio'),
        hora_fin: formData.get('hora_fin'),
        nombre_negocio: (formData.get('nombre_negocio') as string)?.trim(),
        whatsapp_numero: (formData.get('whatsapp_numero') as string)?.trim()
    })
    if (!parsed.success) throw new Error(parsed.error.issues[0].message)

    // Usamos createServiceClient() luego de validar la sesión admin para evitar que RLS ignore el UPDATE silenciosamente
    const supabaseAdmin = createServiceClient()
    const { error } = await supabaseAdmin
        .from('config')
        .update(parsed.data)
        .neq('id', 0)

    if (error) {
        console.error('Supabase Error Update Config:', error)
        throw new Error('Error guardando configuración en la base de datos')
    }

    const minutosAuto = Number(formData.get('minutos_autoconfirmacion') ?? 10)
    const mesesVisibles = Number(formData.get('meses_visibles_cliente') ?? 3)
    const pagosHabilitados = formData.get('pagos_habilitados') === 'on' ? 'true' : 'false'

    await guardarKvConfig([
        { clave: 'nombre_negocio', valor: parsed.data.nombre_negocio },
        { clave: 'whatsapp_numero', valor: parsed.data.whatsapp_numero },
        {
            clave: 'minutos_autoconfirmacion',
            valor: String(isNaN(minutosAuto) ? 10 : Math.max(0, Math.min(120, minutosAuto)))
        },
        {
            clave: 'meses_visibles_cliente',
            valor: String(isNaN(mesesVisibles) ? 3 : Math.max(1, Math.min(12, mesesVisibles)))
        },
        { clave: 'pagos_habilitados', valor: pagosHabilitados },
        { clave: 'intervalo_minutos', valor: String(parsed.data.intervalo_minutos) },
        { clave: 'hora_inicio', valor: parsed.data.hora_inicio },
        { clave: 'hora_fin', valor: parsed.data.hora_fin }
    ])

    revalidatePath('/', 'layout')
    revalidatePath('/admin/dashboard', 'layout')
    revalidatePath('/admin/dashboard/ajustes')

    const updated = await getConfigCompleta()
    return { success: true, config: updated }
}

export async function addServicio(formData: FormData) {
    const supabaseAuth = await createServerClient()
    const {
        data: { user }
    } = await supabaseAuth.auth.getUser()
    if (!user) throw new Error('No autorizado')

    const parsed = ServicioSchema.safeParse({
        categoria: formData.get('categoria'),
        nombre: (formData.get('nombre') as string)?.trim(),
        subtitulo: (formData.get('subtitulo') as string)?.trim() || undefined,
        descripcion: (formData.get('descripcion') as string)?.trim() || undefined,
        precio: formData.get('precio'),
        icono: (formData.get('icono') as string)?.trim() || undefined,
        destacado: formData.get('destacado') === 'on' ? 1 : 0
    })
    if (!parsed.success) throw new Error(parsed.error.issues[0].message)

    const supabaseAdmin = createServiceClient()
    const { data, error } = await supabaseAdmin
        .from('servicios')
        .insert([parsed.data])
        .select('*')
        .single()

    if (error) throw new Error('Error añadiendo servicio')

    revalidatePath('/', 'layout')
    revalidatePath('/admin/dashboard/ajustes')
    return { success: true, servicio: data }
}

export async function deleteServicio(id: number) {
    const supabaseAuth = await createServerClient()
    const {
        data: { user }
    } = await supabaseAuth.auth.getUser()
    if (!user) throw new Error('No autorizado')

    const parsedId = z.number().int().positive().safeParse(id)
    if (!parsedId.success) throw new Error('ID de servicio inválido')

    const supabaseAdmin = createServiceClient()
    const { error } = await supabaseAdmin
        .from('servicios')
        .delete()
        .eq('id', parsedId.data)

    if (error) throw new Error('Error eliminando servicio')

    revalidatePath('/', 'layout')
    revalidatePath('/admin/dashboard/ajustes')
    return { success: true, id: parsedId.data }
}

export async function editServicio(id: number, formData: FormData) {
    const supabaseAuth = await createServerClient()
    const {
        data: { user }
    } = await supabaseAuth.auth.getUser()
    if (!user) throw new Error('No autorizado')

    const parsedId = z.number().int().positive().safeParse(id)
    if (!parsedId.success) throw new Error('ID de servicio inválido')

    const parsed = ServicioSchema.safeParse({
        categoria: formData.get('categoria'),
        nombre: (formData.get('nombre') as string)?.trim(),
        subtitulo: (formData.get('subtitulo') as string)?.trim() || undefined,
        descripcion: (formData.get('descripcion') as string)?.trim() || undefined,
        precio: formData.get('precio'),
        icono: (formData.get('icono') as string)?.trim() || undefined,
        destacado: formData.get('destacado') === 'on' ? 1 : 0
    })
    if (!parsed.success) throw new Error(parsed.error.issues[0].message)

    const supabaseAdmin = createServiceClient()
    const { data, error } = await supabaseAdmin
        .from('servicios')
        .update(parsed.data)
        .eq('id', parsedId.data)
        .select('*')
        .single()

    if (error) throw new Error('Error editando servicio')

    revalidatePath('/', 'layout')
    revalidatePath('/admin/dashboard/ajustes')
    return { success: true, servicio: data }
}

export async function guardarCMSContenido(cmsData: CMSContenido) {
    const supabaseAuth = await createServerClient()
    const {
        data: { user }
    } = await supabaseAuth.auth.getUser()
    if (!user) throw new Error('No autorizado')

    const merged = mergeCMSContenido(cmsData)
    await guardarKvConfig([{ clave: 'cms_contenido', valor: JSON.stringify(merged) }])

    revalidatePath('/', 'layout')
    revalidatePath('/admin/dashboard/ajustes')
    return { success: true, cms: merged }
}

