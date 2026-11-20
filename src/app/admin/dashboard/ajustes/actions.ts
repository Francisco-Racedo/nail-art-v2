'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { guardarKvConfig, getConfigCompleta } from '@/lib/reservas-server'
import { CMSContenido, mergeCMSContenido } from '@/lib/cms-types'
import {
    requireAdminUser,
    obtenerAdminsAutorizados,
    guardarAdminsAutorizados,
    AdminAutorizado
} from '@/lib/auth-admin'

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
    categoria: z.enum([
        'Servicios Base (Lisas)',
        'Con 2 Decos Simples',
        'Adicionales & Nail Art',
        'Manos',
        'Pies & Extras',
        'Promos'
    ]),
    nombre: z
        .string()
        .min(3, 'El nombre debe tener al menos 3 caracteres')
        .max(100)
        .regex(
            /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-\.\/\+(),$]+$/,
            'El nombre contiene caracteres inválidos'
        ),
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
    const { authorized } = await requireAdminUser()
    if (!authorized) throw new Error('No autorizado')

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
    const { authorized } = await requireAdminUser()
    if (!authorized) throw new Error('No autorizado')

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
    const { authorized } = await requireAdminUser()
    if (!authorized) throw new Error('No autorizado')

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
    const { authorized } = await requireAdminUser()
    if (!authorized) throw new Error('No autorizado')

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
    const { authorized } = await requireAdminUser()
    if (!authorized) throw new Error('No autorizado')

    const merged = mergeCMSContenido(cmsData)
    await guardarKvConfig([{ clave: 'cms_contenido', valor: JSON.stringify(merged) }])

    revalidatePath('/', 'layout')
    revalidatePath('/admin/dashboard/ajustes')
    return { success: true, cms: merged }
}

export async function obtenerEstadoAdminsAction() {
    const { authorized, user, adminInfo } = await requireAdminUser()
    if (!authorized || !user) {
        return { error: 'No autorizado' }
    }

    const esSoporte = adminInfo?.rol === 'soporte'
    if (!esSoporte) {
        // Si ingresa la Dueña del salón, solo visualiza las opciones normales de Ajustes
        return {
            success: true,
            esSoporte: false,
            actualEmail: (user.email || '').toLowerCase(),
            actualRol: 'duena' as const,
            admins: []
        }
    }

    const lista = await obtenerAdminsAutorizados()
    return {
        success: true,
        esSoporte: true,
        actualEmail: (user.email || '').toLowerCase(),
        actualRol: 'soporte' as const,
        admins: lista
    }
}

export async function guardarAdminCuentaAction(input: {
    email: string
    password?: string
    rol: 'duena' | 'soporte'
    nombre?: string
}) {
    const { authorized, adminInfo } = await requireAdminUser()
    if (!authorized || adminInfo?.rol !== 'soporte') {
        return {
            error: 'Acción reservada exclusivamente para el Administrador de Soporte Técnico.'
        }
    }

    const emailClean = (input.email || '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
        return { error: 'Ingresá un correo electrónico válido.' }
    }

    const pwd = (input.password || '').trim()
    if (pwd && pwd.length < 6) {
        return { error: 'La contraseña debe tener al menos 6 caracteres.' }
    }

    try {
        const supabaseAdmin = createServiceClient()
        const { data: usersData, error: listError } =
            await supabaseAdmin.auth.admin.listUsers()

        if (listError) {
            return { error: 'Error al consultar usuarios en Supabase Auth.' }
        }

        const existingUser = (usersData?.users || []).find(
            u => (u.email || '').toLowerCase() === emailClean
        )

        if (existingUser) {
            if (pwd) {
                const { error: updErr } =
                    await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
                        password: pwd,
                        email_confirm: true
                    })
                if (updErr) {
                    return {
                        error: `No se pudo actualizar la contraseña: ${updErr.message}`
                    }
                }
            }
        } else {
            if (!pwd) {
                return {
                    error: 'Para registrar un nuevo administrador debés asignarle una contraseña inicial (mín. 6 caracteres).'
                }
            }
            const { error: createErr } =
                await supabaseAdmin.auth.admin.createUser({
                    email: emailClean,
                    password: pwd,
                    email_confirm: true
                })
            if (createErr) {
                return {
                    error: `No se pudo crear la cuenta en Supabase: ${createErr.message}`
                }
            }
        }

        const listaActual = await obtenerAdminsAutorizados()
        const nuevoItem: AdminAutorizado = {
            email: emailClean,
            rol: input.rol === 'duena' ? 'duena' : 'soporte',
            nombre:
                (input.nombre || '').trim() ||
                (input.rol === 'duena'
                    ? 'Dueña del Salón'
                    : 'Administrador de Soporte Técnico'),
            updatedAt: new Date().toISOString()
        }

        const resto = listaActual.filter(a => a.email !== emailClean)
        const nuevaLista = [...resto, nuevoItem]
        await guardarAdminsAutorizados(nuevaLista)

        revalidatePath('/admin/dashboard/ajustes')
        return {
            success: true,
            admins: nuevaLista,
            mensaje: existingUser
                ? `Cuenta de ${emailClean} actualizada en la lista de administradores autorizados.`
                : `Cuenta de ${emailClean} creada y habilitada para ingresar al panel.`
        }
    } catch (e: any) {
        return {
            error: e?.message || 'Error al gestionar la cuenta de administrador.'
        }
    }
}

export async function revocarAdminCuentaAction(emailTarget: string) {
    const { authorized, user, adminInfo } = await requireAdminUser()
    if (!authorized || !user || adminInfo?.rol !== 'soporte') {
        return {
            error: 'Acción reservada exclusivamente para el Administrador de Soporte Técnico.'
        }
    }

    const targetClean = (emailTarget || '').trim().toLowerCase()
    const currentClean = (user.email || '').trim().toLowerCase()

    if (targetClean === currentClean) {
        return {
            error: 'Por seguridad no podés revocar el acceso de la cuenta con la que tenés la sesión iniciada actualmente.'
        }
    }

    const listaActual = await obtenerAdminsAutorizados()
    const nuevaLista = listaActual.filter(a => a.email !== targetClean)

    if (nuevaLista.length === 0) {
        return { error: 'Debe quedar al menos 1 administrador autorizado en el sistema.' }
    }

    await guardarAdminsAutorizados(nuevaLista)
    revalidatePath('/admin/dashboard/ajustes')
    return {
        success: true,
        admins: nuevaLista
    }
}

