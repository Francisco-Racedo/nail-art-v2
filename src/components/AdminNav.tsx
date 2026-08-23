'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Image as ImageIcon, Settings } from 'lucide-react'
import { logout } from '@/app/admin/actions'

export default function AdminNav() {
    const pathname = usePathname()

    const navItems = [
        { name: 'Agenda', href: '/admin/dashboard', icon: CalendarDays },
        { name: 'Carrusel', href: '/admin/dashboard/carrusel', icon: ImageIcon },
        { name: 'Ajustes', href: '/admin/dashboard/ajustes', icon: Settings },
    ]

    return (
        <>
            <header className="sticky top-0 z-40 bg-[rgba(5,9,20,0.7)] backdrop-blur-[30px] border-b border-indigo-500/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto w-full relative">
                    <div className="absolute top-[-20px] left-[10%] w-[150px] h-[50px] bg-cyan-500/20 blur-[50px] pointer-events-none" />
                    <div className="relative z-10">
                        <h1 className="text-xl font-bold tracking-tight text-white mb-0 uppercase leading-none font-sans drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">Panel <span style={{ background: 'linear-gradient(to right, #8b5cf6, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Pro</span></h1>
                        <p className="text-[10px] text-cyan-400/80 font-medium mt-1 tracking-widest uppercase">Admin System</p>
                    </div>
                    <div className="flex items-center gap-4 relative z-10">
                        <form action={logout}>
                            <button type="submit" className="text-xs font-semibold text-indigo-300 hover:text-white transition bg-indigo-950/40 hover:bg-indigo-900/60 px-4 py-1.5 rounded-full border border-indigo-800/50 shadow-[0_0_15px_rgba(79,70,229,0.15)]">Cerrar Sesión</button>
                        </form>
                        <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold border border-indigo-400/30 shadow-[0_0_15px_rgba(99,102,241,0.5)]" style={{ background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)' }}>
                            A
                        </div>
                    </div>
                </div>
            </header>

            <nav className="fixed bottom-0 w-full bg-[rgba(5,11,20,0.85)] backdrop-blur-2xl border-t border-indigo-500/10 pb-safe z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
                <div className="flex justify-around items-center px-2 py-3 max-w-lg mx-auto pb-4 md:pb-3 relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/10 to-transparent pointer-events-none" />
                    {navItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link key={item.name} href={item.href} className={`flex flex-col items-center gap-1.5 transition-all duration-300 relative z-10 ${isActive ? 'text-cyan-400 scale-110 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]' : 'text-slate-500 hover:text-indigo-300'}`}>
                                <item.icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                                <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.name}</span>
                            </Link>
                        )
                    })}
                </div>
            </nav>
        </>
    )
}
