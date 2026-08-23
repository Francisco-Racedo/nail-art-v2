'use client'

export default function NavBar() {
    return (
        <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-amber-100/50">
            <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                <span className="text-xl font-bold text-zinc-900" style={{ fontFamily: 'serif' }}>
                    FRAN &amp; ROMY NAILS
                </span>
                <div className="hidden md:flex gap-6 text-sm font-medium text-zinc-600">
                    <a href="#servicios" className="hover:text-amber-600 transition">Servicios</a>
                    <a href="#promos" className="hover:text-amber-600 transition">Promos</a>
                    <a href="#reserva" className="hover:text-amber-600 transition">Reservar</a>
                </div>
            </div>
        </nav>
    )
}
