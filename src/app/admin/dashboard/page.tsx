import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '../actions'

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/admin/login')
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-zinc-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">💅</span>
                        <div>
                            <h1 className="font-bold text-zinc-900 leading-tight">Panel Administración</h1>
                            <p className="text-xs text-zinc-500">Fran &amp; Romy Nails</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-medium text-zinc-800">{user.email}</p>
                            <p className="text-xs text-zinc-500">Administradora</p>
                        </div>
                        <form action={logout}>
                            <button
                                type="submit"
                                className="text-sm text-zinc-500 hover:text-red-600 border border-zinc-200 hover:border-red-300 px-4 py-2 rounded-xl transition"
                            >
                                Cerrar sesión
                            </button>
                        </form>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

                    {/* Stat Card */}
                    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
                        <p className="text-sm text-zinc-500 mb-1">Reservas Activas</p>
                        <p className="text-3xl font-bold text-zinc-900">—</p>
                        <p className="text-xs text-amber-600 mt-1">📅 Módulo en construcción</p>
                    </div>

                    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
                        <p className="text-sm text-zinc-500 mb-1">Fotos en Carrusel</p>
                        <p className="text-3xl font-bold text-zinc-900">—</p>
                        <p className="text-xs text-rose-500 mt-1">🖼️ Módulo en construcción</p>
                    </div>

                    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
                        <p className="text-sm text-zinc-500 mb-1">Sistema</p>
                        <p className="text-3xl font-bold text-green-600">✓</p>
                        <p className="text-xs text-green-600 mt-1">Autenticación OK</p>
                    </div>
                </div>

                {/* Welcome Banner */}
                <div className="bg-gradient-to-br from-rose-50 to-amber-50 border border-rose-100 rounded-2xl p-8 text-center">
                    <div className="text-5xl mb-4">🚀</div>
                    <h2 className="text-2xl font-bold text-zinc-900 mb-2">¡Fase 2 Completada!</h2>
                    <p className="text-zinc-600 max-w-md mx-auto">
                        La autenticación con <strong>Supabase Auth + JWT</strong> ya está funcionando.
                        Las Fases 3, 4 y 5 migrarán el resto de los módulos (Agenda, Carrusel y Servicios).
                    </p>
                </div>
            </main>
        </div>
    )
}
