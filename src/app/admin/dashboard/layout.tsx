import { Toaster } from 'sonner'
import AdminNav from '@/components/AdminNav'

export default function AdminDashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="h-screen w-full bg-gradient-to-br from-pink-100 via-orange-50 to-orange-100 text-stone-800 flex font-sans overflow-hidden">
            <Toaster theme="light" position="top-center" richColors />

            {/* Sidebar Desktop Component */}
            <AdminNav />

            {/* Main Content Area */}
            <main className="flex-1 w-full h-full overflow-y-auto px-5 md:px-10 pt-8 pb-28 md:pb-8 relative z-10">
                <div className="max-w-6xl mx-auto w-full">
                    {children}
                </div>
            </main>
        </div>
    )
}
