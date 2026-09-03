'use server'

import { createClient as createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// O-06: Esquemas Zod para validación server-side de cada Server Action
const ConfigSchema = z.object({
    intervalo_minutos: z.coerce.number().int().min(1, 'El intervalo debe ser mayor a 0').max(240, 'Máximo 240 minutos'),
    hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido'),
    hora_fin: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido'),
    nombre_negocio: z.string().min(2, 'El nombre del negocio es requerido').max(80),
    whatsapp_numero: z.string().regex(/^\d{10,15}$/, 'El número debe tener entre 10 y 15 dígitos sin símbolos especiales (sin +) ni espacios'),
}).refine((d) => {
    const [hInicio, mInicio] = d.hora_inicio.split(':').map(Number);
    const [hFin, mFin] = d.hora_fin.split(':').map(Number);
    const minStart = (hInicio * 60) + mInicio;
    const minEnd = (hFin * 60) + mFin;
    return minStart < minEnd;
}, {
    message: 'La hora de fin debe ser posterior a la de inicio',
    path: ['hora_fin'],
})

const ServicioSchema = z.object({
    categoria: z.enum(['Manos', 'Pies & Extras', 'Promos']),
    nombre: z.string()
        .min(3, 'El nombre debe tener al menos 3 caracteres')
        .max(100)
        .regex(/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-\.]+$/, "El nombre contiene caracteres inválidos"),
    subtitulo: z.string().max(150).optional(),
    descripcion: z.string().max(500).optional(),
    precio: z.coerce.number().positive('El precio debe ser un valor entero mayor a cero').max(1_000_000),
    icono: z.string().max(10).optional(),
    destacado: z.number().int().min(0).max(1),
})

export async function updateConfig(formData: FormData) {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autorizado')

    const parsed = ConfigSchema.safeParse({
        intervalo_minutos: formData.get('intervalo_minutos'),
        hora_inicio: formData.get('hora_inicio'),
        hora_fin: formData.get('hora_fin'),
        nombre_negocio: formData.get('nombre_negocio'),
        whatsapp_numero: formData.get('whatsapp_numero'),
    })
    if (!parsed.success) throw new Error(parsed.error.issues[0].message)

    // Al usar .neq('id', 0) nos aseguramos de actualizar la única fila de configuración
    // sin importar su ID real, evitando errores silenciosos si RLS bloquea el SELECT previo.
    const { error } = await supabase.from('config').update(parsed.data).neq('id', 0)
    if (error) {
        console.error('Supabase Error Update Config:', error)
        throw new Error('Error guardando configuración')
    }

    revalidatePath('/')
    revalidatePath('/admin/dashboard/ajustes')
    return { success: true }
}

export async function addServicio(formData: FormData) {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autorizado')

    const parsed = ServicioSchema.safeParse({
        categoria: formData.get('categoria'),
        nombre: formData.get('nombre'),
        subtitulo: formData.get('subtitulo') || undefined,
        descripcion: formData.get('descripcion') || undefined,
        precio: formData.get('precio'),
        icono: formData.get('icono') || undefined,
        destacado: formData.get('destacado') === 'on' ? 1 : 0,
    })
    if (!parsed.success) throw new Error(parsed.error.issues[0].message)

    const { error } = await supabase.from('servicios').insert([parsed.data])
    if (error) throw new Error('Error añadiendo servicio')

    revalidatePath('/')
    revalidatePath('/admin/dashboard/ajustes')
    return { success: true }
}

export async function deleteServicio(id: number) {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autorizado')

    const parsedId = z.number().int().positive().safeParse(id)
    if (!parsedId.success) throw new Error('ID de servicio inválido')

    const { error } = await supabase.from('servicios').delete().eq('id', parsedId.data)
    if (error) throw new Error('Error eliminando servicio')

    revalidatePath('/')
    revalidatePath('/admin/dashboard/ajustes')
    return { success: true }
}

export async function editServicio(id: number, formData: FormData) {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autorizado')

    const parsedId = z.number().int().positive().safeParse(id)
    if (!parsedId.success) throw new Error('ID de servicio inválido')

    const parsed = ServicioSchema.safeParse({
        categoria: formData.get('categoria'),
        nombre: formData.get('nombre'),
        subtitulo: formData.get('subtitulo') || undefined,
        descripcion: formData.get('descripcion') || undefined,
        precio: formData.get('precio'),
        icono: formData.get('icono') || undefined,
        destacado: formData.get('destacado') === 'on' ? 1 : 0,
    })
    if (!parsed.success) throw new Error(parsed.error.issues[0].message)

    const { error } = await supabase.from('servicios').update(parsed.data).eq('id', parsedId.data)
    if (error) throw new Error('Error editando servicio')

    revalidatePath('/')
    revalidatePath('/admin/dashboard/ajustes')
    return { success: true }
}
