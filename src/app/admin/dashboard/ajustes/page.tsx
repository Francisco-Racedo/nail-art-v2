import { createServiceClient } from '@/lib/supabase/service'
import AjustesClient from '@/components/AjustesClient'
import { getConfigCompleta } from '@/lib/reservas-server'

export const dynamic = 'force-dynamic'

export default async function AdminAjustesPage() {
    const supabaseAdmin = createServiceClient()
    const [configData, serviciosRes] = await Promise.all([
        getConfigCompleta(),
        supabaseAdmin.from('servicios').select('*').order('id', { ascending: true })
    ])

    if (serviciosRes.error) console.error('Error servicios:', serviciosRes.error)

    return (
        <div className="w-full animate-in fade-in duration-500">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-stone-900 mb-1">Ajustes & Servicios</h2>
                <p className="text-stone-500 text-sm">
                    Configuración en tiempo real del negocio, horarios (turnos de 1h 30m), meses del
                    calendario y catálogo de servicios.
                </p>
            </div>

            <AjustesClient
                config={configData}
                servicios={serviciosRes.data || []}
            />
        </div>
    )
}
