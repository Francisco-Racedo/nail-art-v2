import { createClient as createServerClient } from '@/lib/supabase/server'
import AgendaCalendar from '@/components/AgendaCalendar'
import DashboardAnalytics from '@/components/DashboardAnalytics'
import { getConfigCompleta, autoConfirmarPendientesVencidos } from '@/lib/reservas-server'

export const dynamic = 'force-dynamic'

export default async function AdminAgendaPage() {
    const supabase = await createServerClient()
    const configData = await getConfigCompleta()

    // Ejecutar auto-confirmación de turnos pendientes que hayan superado la ventana máxima (10 min)
    await autoConfirmarPendientesVencidos(configData.minutos_autoconfirmacion)

    const reservasRes = await supabase
        .from('reservas')
        .select('*')
        .order('fecha', { ascending: true })
        .order('horario', { ascending: true })

    if (reservasRes.error) {
        console.error('Error fetching reservas:', reservasRes.error)
    }

    return (
        <div className="w-full animate-in fade-in duration-500">
            <div className="mb-6 pt-2 pb-6 border-b border-stone-200">
                <p className="text-rose-500 font-bold text-xs uppercase tracking-widest mb-2">
                    Gestión Operativa
                </p>
                <h2 className="text-3xl font-black text-stone-900 mb-2">Agenda y Turnos</h2>
                <p className="text-stone-500 text-sm">
                    Turnos de 1h 30m (08:30 a 20:00), confirmación en máx.{' '}
                    {configData.minutos_autoconfirmacion} min, reprogramaciones e imprevistos.
                </p>
            </div>

            <div className="mt-2">
                <AgendaCalendar
                    initialReservas={reservasRes.data || []}
                    config={configData}
                />
            </div>
        </div>
    )
}
