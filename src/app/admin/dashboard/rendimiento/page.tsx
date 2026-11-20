import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdminUser } from '@/lib/auth-admin'
import RendimientoClient from '@/components/RendimientoClient'
import { getConfigCompleta, autoConfirmarPendientesVencidos } from '@/lib/reservas-server'

export const dynamic = 'force-dynamic'

export default async function AdminRendimientoPage() {
    const { authorized } = await requireAdminUser()
    if (!authorized) {
        redirect('/admin/login')
    }

    const supabase = createServiceClient()
    const configData = await getConfigCompleta()

    await autoConfirmarPendientesVencidos(configData.minutos_autoconfirmacion)

    const reservasRes = await supabase
        .from('reservas')
        .select('*')
        .order('fecha', { ascending: true })
        .order('horario', { ascending: true })

    if (reservasRes.error) {
        console.error('Error fetching reservas en Rendimiento:', reservasRes.error)
    }

    return (
        <div className="w-full">
            <RendimientoClient reservas={reservasRes.data || []} />
        </div>
    )
}
