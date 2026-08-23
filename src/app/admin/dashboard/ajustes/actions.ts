'use server'

import { createClient as createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateConfig(formData: FormData) {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autorizado')

    const configs = {
        intervalo_minutos: formData.get('intervalo_minutos') as string,
        hora_inicio: formData.get('hora_inicio') as string,
        hora_fin: formData.get('hora_fin') as string
    }

    const { error } = await supabase.from('config').upsert({ id: 1, ...configs })
    if (error) throw new Error('Error guardando configuración')

    revalidatePath('/')
    revalidatePath('/admin/dashboard/ajustes')
    return { success: true }
}

export async function addServicio(formData: FormData) {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autorizado')

    const data = {
        categoria: formData.get('categoria') as string,
        nombre: formData.get('nombre') as string,
        subtitulo: formData.get('subtitulo') as string,
        descripcion: formData.get('descripcion') as string,
        precio: Number(formData.get('precio')),
        icono: formData.get('icono') as string,
        destacado: formData.get('destacado') === 'on' ? 1 : 0
    }

    const { error } = await supabase.from('servicios').insert([data])
    if (error) throw new Error('Error añadiendo servicio')

    revalidatePath('/')
    revalidatePath('/admin/dashboard/ajustes')
    return { success: true }
}

export async function deleteServicio(id: number) {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autorizado')

    const { error } = await supabase.from('servicios').delete().eq('id', id)
    if (error) throw new Error('Error eliminando servicio')

    revalidatePath('/')
    revalidatePath('/admin/dashboard/ajustes')
    return { success: true }
}
