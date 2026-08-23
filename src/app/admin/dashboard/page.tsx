import { createClient as createServerClient } from '@/lib/supabase/server'
import AgendaCalendar from '@/components/AgendaCalendar'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AdminAgendaPage() {
    const supabase = await createServerClient()

    // Validar sesión estricta
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/admin/login')
    }

    // Fetch reservas ordenadas
    const { data: reservas, error } = await supabase
        .from('reservas')
        .select('*')
        .order('fecha', { ascending: true })
        .order('horario', { ascending: true })

    if (error) {
        console.error('Error fetching reservas:', error)
    }

    return (
        <div className="w-full animate-in fade-in duration-500">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-1">Tu Agenda</h2>
                <p className="text-zinc-400 text-sm">Gestiona todos los turnos confirmados por tus clientes.</p>
            </div>
            <AgendaCalendar initialReservas={reservas || []} />
        </div>
    )
}
