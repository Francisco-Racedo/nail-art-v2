import { createServiceClient } from '@/lib/supabase/service'
import { construirFichasClientes, getConfigCompleta } from '@/lib/reservas-server'
import ClientesPanel from '@/components/admin/ClientesPanel'

export const dynamic = 'force-dynamic'

export default async function AdminClientesPage() {
    const supabase = createServiceClient()
    const [cfg, reservasRes] = await Promise.all([
        getConfigCompleta(),
        supabase.from('reservas').select('*').order('fecha', { ascending: false })
    ])

    const fichasMap = construirFichasClientes(reservasRes.data || [])
    const clientes = Array.from(fichasMap.values()).sort((a, b) => {
        if (a.esCumpleSemana !== b.esCumpleSemana) return a.esCumpleSemana ? -1 : 1
        return b.completados - a.completados
    })

    return (
        <div className="w-full animate-in fade-in duration-500">
            <div className="mb-6 pt-2 pb-6 border-b border-stone-200">
                <p className="text-rose-500 font-bold text-xs uppercase tracking-widest mb-2">
                    Fidelización y Cumpleaños
                </p>
                <h2 className="text-3xl font-black text-stone-900 mb-2">Ficha de Clientes</h2>
                <p className="text-stone-500 text-sm">
                    Historial de servicios realizados, ausencias y próximos cumpleaños para ofrecer
                    descuentos opcionales.
                </p>
            </div>

            <ClientesPanel clientes={clientes} nombreNegocio={cfg.nombre_negocio} />
        </div>
    )
}
