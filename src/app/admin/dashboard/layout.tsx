import { Toaster } from 'sonner'
import { redirect } from 'next/navigation'
import AdminNav from '@/components/AdminNav'
import RealtimeAdminListener from '@/components/admin/RealtimeAdminListener'
import { createClient as createServerClient } from '@/lib/supabase/server'

export default async function AdminDashboardLayout({
    children
}: {
    children: React.ReactNode
}) {
    // Defensa en profundidad: además de src/proxy.ts, verificamos sesión activa en el layout del servidor
    const supabase = await createServerClient()
    const {
        data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/admin/login')
    }

    return (
        <div className="h-[100dvh] w-full bg-gradient-to-br from-pink-100 via-orange-50 to-orange-100 text-stone-800 flex font-sans overflow-hidden">
            <Toaster theme="light" position="top-center" richColors />
            <RealtimeAdminListener />

            {/* Sidebar Desktop Component */}
            <AdminNav />

            {/* Main Content Area */}
            <main className="flex-1 w-full h-full overflow-y-auto overflow-x-hidden px-3 sm:px-6 md:px-10 pt-5 sm:pt-8 pb-28 md:pb-8 relative">
                <div className="max-w-6xl mx-auto w-full">{children}</div>
            </main>
        </div>
    )
}
