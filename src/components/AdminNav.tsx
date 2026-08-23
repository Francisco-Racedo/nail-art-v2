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
            <header className="sticky top-0 z-40 bg-[rgba(15,15,18,0.8)] backdrop-blur-2xl border-b border-white/5 shadow-lg">
                <div className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto w-full">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-white mb-0 uppercase leading-none font-serif">Panel <span style={{ background: 'linear-gradient(to right, #C59B27, #E5C158, #C59B27)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Pro</span></h1>
                        <p className="text-xs text-zinc-400 font-medium mt-1">Fran & Romy Nails</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <form action={logout}>
                            <button type="submit" className="text-xs font-bold text-red-400 hover:text-red-300 transition mr-2 bg-red-950/30 px-3 py-1.5 rounded-full border border-red-900/50">Salir</button>
                        </form>
                        <div className="h-10 w-10 rounded-full flex items-center justify-center text-zinc-900 font-bold border-2 border-zinc-800 shadow-[0_0_15px_rgba(229,193,88,0.3)] ring-2 ring-zinc-900" style={{ background: 'linear-gradient(135deg, #E5C158, #C59B27)' }}>
                            FR
                        </div>
                    </div>
                </div>
            </header>

            <nav className="fixed bottom-0 w-full bg-[rgba(15,15,18,0.85)] backdrop-blur-2xl border-t border-white/5 pb-safe z-50">
                <div className="flex justify-around items-center px-2 py-3 max-w-lg mx-auto pb-4 md:pb-3">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link key={item.name} href={item.href} className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${isActive ? 'text-amber-400 scale-110 drop-shadow-[0_0_8px_rgba(229,193,88,0.5)]' : 'text-zinc-500 hover:text-amber-200'}`}>
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
