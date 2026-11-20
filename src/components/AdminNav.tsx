'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Image as ImageIcon, Settings, LogOut, Users, TrendingUp } from 'lucide-react'
import { logout } from '@/app/admin/actions'

export default function AdminNav() {
    const pathname = usePathname()

    const navItems = [
        { name: 'Agenda', href: '/admin/dashboard', icon: CalendarDays },
        { name: 'Rendimiento', href: '/admin/dashboard/rendimiento', icon: TrendingUp },
        { name: 'Clientes', href: '/admin/dashboard/clientes', icon: Users },
        { name: 'Carrusel', href: '/admin/dashboard/carrusel', icon: ImageIcon },
        { name: 'Ajustes', href: '/admin/dashboard/ajustes', icon: Settings },
    ]

    return (
        <>
            <aside className="hidden md:flex w-56 lg:w-60 bg-stone-900 border-r border-stone-800 h-full flex-col shrink-0 shadow-2xl relative z-20">
                <div className="p-8 pb-6 text-center flex flex-col items-center">
                    <div className="w-14 h-14 bg-gradient-to-tr from-rose-400 to-orange-400 rounded-[1.25rem] mb-4 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-rose-500/20">
                        PN
                    </div>
                    <h1 className="text-xl font-black tracking-tight text-white mb-0 uppercase leading-none font-sans drop-shadow-sm">Pintaditas <span className="text-rose-400">Nails</span></h1>
                    <p className="text-[10px] text-stone-500 font-bold mt-1.5 tracking-widest uppercase">Panel Administrador</p>
                </div>

                <nav className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 transition-all duration-300 ease-in-out px-4 py-3.5 rounded-xl border-l-[3px] ${isActive ? 'bg-stone-800 text-white shadow-sm font-bold border-rose-500' : 'border-transparent text-stone-400 font-medium hover:border-rose-400 hover:bg-stone-800/50 hover:text-stone-100'}`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? 'text-rose-400' : 'text-stone-500'}`} strokeWidth={isActive ? 2.5 : 2} />
                                <span className="text-sm tracking-wide">{item.name}</span>
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-6 border-t border-stone-800/50">
                    <form action={logout}>
                        <button type="submit" className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-stone-400 hover:text-rose-400 hover:bg-stone-800/80 transition px-4 py-3.5 rounded-xl border border-stone-800 hover:border-stone-700">
                            <LogOut className="w-4 h-4" />
                            Cerrar Sesión
                        </button>
                    </form>
                </div>
            </aside>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 w-full bg-stone-900 border-t border-stone-800 pb-safe z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.15)]">
                <div className="flex justify-around items-center px-1.5 py-2.5 pb-3">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex flex-col items-center gap-1 transition-all duration-300 ${isActive ? 'text-rose-400 scale-105 drop-shadow-sm' : 'text-stone-500 hover:text-stone-300'}`}
                            >
                                <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                                <span className={`text-[9.5px] tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>{item.name}</span>
                            </Link>
                        )
                    })}
                    <form action={logout}>
                        <button type="submit" className="flex flex-col items-center gap-1 transition-all duration-300 text-stone-500 hover:text-rose-400 p-1 rounded-lg">
                            <LogOut className="w-5 h-5" strokeWidth={2} />
                            <span className="text-[9.5px] font-medium">Salir</span>
                        </button>
                    </form>
                </div>
            </nav>
        </>
    )
}
