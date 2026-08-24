import { createClient as createServerClient } from '@/lib/supabase/server'
import AgendaCalendar from '@/components/AgendaCalendar'

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
            .select('intervalo_minutos')
            .limit(1)
            .single()
    ])

    if (reservasRes.error) {
        console.error('Error fetching reservas:', reservasRes.error)
    }

    const intervaloMinutos = Number(configRes.data?.intervalo_minutos) || 90

    return (
        <div className="w-full animate-in fade-in duration-500">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-1">Tu Agenda</h2>
                <p className="text-zinc-400 text-sm">Gestioná todos los turnos confirmados por tus clientes.</p>
            </div>
            <AgendaCalendar initialReservas={reservasRes.data || []} intervaloMinutos={intervaloMinutos} />
        </div>
    )
}
