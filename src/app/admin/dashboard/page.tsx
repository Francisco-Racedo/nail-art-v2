import { createClient as createServerClient } from '@/lib/supabase/server'
import AgendaCalendar from '@/components/AgendaCalendar'
import DashboardAnalytics from '@/components/DashboardAnalytics'

export const dynamic = 'force-dynamic'

export default async function AdminAgendaPage() {
    const supabase = await createServerClient()

    // C-03: La autenticación ya es gestionada por el middleware (src/middleware.ts).
    // Si la request llega hasta acá, el usuario ya está validado.
    // Se mantiene createServerClient() para usar las cookies del usuario
    // y que RLS de Supabase aplique correctamente.
    const [reservasRes, configRes] = await Promise.all([
        supabase
            .from('reservas')
            .select('*')
            .order('fecha', { ascending: true })
            .order('horario', { ascending: true }),
        supabase
            .from('config')
            .select('*')
            .limit(1)
            .single()
    ])

    if (reservasRes.error) {
        console.error('Error fetching reservas:', reservasRes.error)
    }

    // Provide safe defaults so it doesn't crash if config is empty
    const configData = configRes.data || {
        intervalo_minutos: 90,
        hora_inicio: '09:00',
        hora_fin: '20:00'
    }

    return (
        <div className="w-full lg:max-w-[70%] animate-in fade-in duration-500">
            <div className="mb-6 pt-2 pb-6 border-b border-stone-200">
                <p className="text-rose-500 font-bold text-xs uppercase tracking-widest mb-2">Gestión Operativa</p>
                <h2 className="text-3xl font-black text-stone-900 mb-2">Agenda y Turnos</h2>
                <p className="text-stone-500 text-sm">Disponibilidad, reservas, reprogramaciones y bloqueos profesionales.</p>
            </div>

            <DashboardAnalytics reservas={reservasRes.data || []} />

            <div className="mt-8">
                <AgendaCalendar
                    initialReservas={reservasRes.data || []}
                    config={configData}
                />
            </div>
        </div>
    )
}
