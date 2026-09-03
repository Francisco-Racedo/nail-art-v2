'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const credentials = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signInWithPassword(credentials)

    if (error) {
        return { error: 'Credenciales incorrectas. Verificá tu email y contraseña.' }
    }

    revalidatePath('/', 'layout')
    // Devolvemos success para que el cliente haga la redirección con router.push()
    return { success: true }
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/admin/login')
}

export async function reprogramarTurno(turnoId: number, nuevaFecha: string, nuevaHora: string) {
    try {
        const supabase = await createClient()

        // 🚨 SEGURIDAD ZERO-TRUST: Validamos que exista una sesión activa
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { error: 'No autorizado' }
        }

        // BLINDAR EL UPDATE CONTRA UTC
        const fechaStrict = nuevaFecha.substring(0, 10)

        const { data: ocupados } = await supabase
            .from('reservas')
            .select('id')
            .eq('fecha', fechaStrict)
            .eq('horario', nuevaHora.length === 5 ? nuevaHora + ':00' : nuevaHora) // ensure HH:mm:ss format for db
            .neq('id', turnoId)

        if (ocupados && ocupados.length > 0) {
            return { error: 'Ese horario acaba de ser reservado por alguien más. Por favor elige otro.' }
        }

        const { error } = await supabase
            .from('reservas')
            .update({ fecha: fechaStrict, horario: nuevaHora.length === 5 ? nuevaHora + ':00' : nuevaHora, reprogramado: true })
            .eq('id', turnoId)

        if (error) {
            console.error('SUPABASE UPDATE ERROR:', error)
            return { error: `Error DB: ${error.message}` }
        }

        revalidatePath('/', 'layout')

        return { success: true }
    } catch (e: unknown) {
        console.error('Error de red/servidor en reprogramarTurno:', e)
        return { error: 'Fallo interno del servidor' }
    }
}
