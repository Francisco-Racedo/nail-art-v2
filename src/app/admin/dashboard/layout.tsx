import { Toaster } from 'sonner'
import AdminNav from '@/components/AdminNav'

export default function AdminDashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-amber-500/30">
            <Toaster theme="dark" position="top-center" richColors />
            <AdminNav />
            <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-6 pb-28 md:pb-28 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />
                <div className="relative z-10">
                    {children}
                </div>
            </main>
        </div>
    )
}
