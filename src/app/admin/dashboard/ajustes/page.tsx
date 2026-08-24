import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAnonClient } from '@/lib/supabase/client'
import AjustesClient from '@/components/AjustesClient'

export const dynamic = 'force-dynamic'

export default async function AdminAjustesPage() {
    const supabaseSession = await createServerClient()
    const supabaseAnon = createAnonClient()

    // C-03: Auth gestionada por el middleware — el cliente ya está validado aquí.
    // Usamos el cliente anónimo para SELECT porque las RLS policies pueden
    // estar restringiendo SELECT al rol anon exclusivamente.
    const [configRes, serviciosRes] = await Promise.all([
        supabaseAnon.from('config').select('*').single(),
        supabaseAnon.from('servicios').select('*').order('id', { ascending: true })
    ])

    if (configRes.error) console.error('Error config:', configRes.error)
    if (serviciosRes.error) console.error('Error servicios:', serviciosRes.error)

    return (
        <div className="w-full animate-in fade-in duration-500">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-1">Ajustes & Servicios</h2>
                <p className="text-zinc-400 text-sm">Configuración global y gestión de catálogo.</p>
            </div>

            <AjustesClient
                config={configRes.data || { intervalo_minutos: 90, hora_inicio: '09:00', hora_fin: '20:00' }}
                servicios={serviciosRes.data || []}
            />
        </div>
    )
}
