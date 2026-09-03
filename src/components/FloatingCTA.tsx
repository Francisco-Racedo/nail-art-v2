'use client'

import { useEffect, useState } from 'react'

export default function FloatingCTA() {
    const [visible, setVisible] = useState(true)

    useEffect(() => {
        const reserva = document.getElementById('reserva')
        if (!reserva) return
        const obs = new IntersectionObserver(
            ([e]) => setVisible(!e.isIntersecting),
            { threshold: 0.1 }
        )
        obs.observe(reserva)
        return () => obs.disconnect()
    }, [])

    return (
        <div className={`fixed bottom-6 left-0 w-full flex justify-center z-50 px-4 pointer-events-none transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>
            <a
                href="#reserva"
                className="pointer-events-auto bg-[#2C2421] text-[#FCFAF8] tracking-widest font-semibold text-xs py-4 px-10 rounded-full shadow-2xl shadow-[#2C2421]/20 transform transition duration-300 hover:scale-[1.03] hover:-translate-y-1 flex items-center gap-3 border border-transparent"
            >
                RESERVAR TURNO AHORA
            </a>
        </div>
    )
}
