import { createServiceClient } from '@/lib/supabase/service'
import {
    construirFichasClientes,
    getConfigCompleta,
    obtenerFichasCRM
} from '@/lib/reservas-server'
import { generarHorariosDisponibles } from '@/lib/utils'
import ClientesPanel from '@/components/admin/ClientesPanel'

export const dynamic = 'force-dynamic'

export default async function AdminClientesPage() {
    const supabase = createServiceClient()
    const [cfg, reservasRes, fichasCRM, serviciosRes] = await Promise.all([
        getConfigCompleta(),
        supabase.from('reservas').select('*').order('fecha', { ascending: false }),
        obtenerFichasCRM(),
        supabase.from('servicios').select('*').order('id', { ascending: true })
    ])

    const fichasMap = construirFichasClientes(reservasRes.data || [], fichasCRM)
    const clientes = Array.from(fichasMap.values()).sort((a, b) => {
        if (a.esCumpleHoy !== b.esCumpleHoy) return a.esCumpleHoy ? -1 : 1
        if (a.esCumpleSemana !== b.esCumpleSemana) return a.esCumpleSemana ? -1 : 1
        if (a.necesitaService !== b.necesitaService) return a.necesitaService ? -1 : 1
        return b.completados - a.completados
    })

    const horariosBase = generarHorariosDisponibles(
        cfg.hora_inicio,
        cfg.hora_fin,
        cfg.intervalo_minutos
    )

    return (
        <div className="w-full animate-in fade-in duration-500">
            <div className="mb-6 pt-2 pb-6 border-b border-stone-200">
                <p className="text-rose-500 font-bold text-xs uppercase tracking-widest mb-2">
                    CRM de Manicuría • Fidelización y Cumpleaños
                </p>
                <h2 className="text-3xl font-black text-stone-900 mb-2">
                    Cartera y Ficha de Clientas
                </h2>
                <p className="text-stone-500 text-sm">
                    Historial de servicios, ficha técnica de uñas, alertas de service (+18 días),
                    cumpleaños y asignación rápida de turnos.
                </p>
            </div>

            <ClientesPanel
                clientes={clientes}
                nombreNegocio={cfg.nombre_negocio}
                horariosBase={horariosBase}
                servicios={serviciosRes.data || []}
            />
        </div>
    )
}
