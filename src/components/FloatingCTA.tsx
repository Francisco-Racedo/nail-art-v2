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
        <div className={`fixed bottom-6 w-full flex justify-center z-50 px-4 pointer-events-none transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>
            <a
                href="#reserva"
                className="pointer-events-auto text-white font-bold text-sm md:text-base py-4 px-10 rounded-full shadow-xl transform transition duration-300 hover:scale-105 hover:-translate-y-1 flex items-center gap-2 border border-amber-300"
                style={{ background: 'linear-gradient(to right, #f59e0b, #d97706)' }}
            >
                💅 RESERVAR TURNO AHORA
            </a>
        </div>
    )
}
