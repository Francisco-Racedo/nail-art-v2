import { Toaster } from 'sonner'
import AdminNav from '@/components/AdminNav'

export default function AdminDashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-[#030614] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 overflow-x-hidden relative">
            <Toaster theme="dark" position="top-center" richColors />

            {/* Background Effects */}
            <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
            <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[150px] pointer-events-none" />
            <div className="fixed top-[40%] right-[10%] w-[30%] h-[30%] rounded-full bg-cyan-500/5 blur-[100px] pointer-events-none" />

            <AdminNav />
            <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-6 pb-28 md:pb-28 relative z-10">
                {children}
            </main>
        </div>
    )
}
