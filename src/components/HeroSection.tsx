'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

export default function HeroSection() {
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])

    const titleWords = ["Revelando", "el", "Arte", "en", "tus", "Manos"]

    return (
        <header className="relative w-full max-w-[1400px] mx-auto pt-12 md:pt-20 px-6 md:px-12 mb-20 font-sans bg-gradient-to-br from-[#FDF8F5] via-[#FDF8F5] md:via-[#E8B4B8]/40 to-[#D4A373]/30 rounded-[3rem] shadow-xl overflow-hidden border border-[#D4A373]/20">

            {/* Contenedor Estructural Principal */}
            <div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-12 items-center">

                {/* 2. Bloque de Texto (Izquierda/Arriba) */}
                <div className="relative z-10 w-full pb-8 lg:pb-0">
                    {mounted ? (
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={{
                                hidden: {},
                                visible: { transition: { staggerChildren: 0.15 } }
                            }}
                            className="flex flex-col items-center text-center lg:items-start lg:text-left"
                        >
                            <motion.span
                                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                                className="text-[#D4A373] uppercase tracking-[0.3em] font-semibold text-[10px] md:text-sm mb-4 block"
                            >
                                Luxury Manicure Studio
                            </motion.span>

                            {/* Título Teatral animado por palabra */}
                            <h1 className="text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.05] tracking-tight mb-6 text-[#2C2421]" style={{ fontFamily: 'serif' }}>
                                {titleWords.map((word, i) => (
                                    <motion.span
                                        key={i}
                                        className="inline-block mr-3 lg:mr-4"
                                        variants={{
                                            hidden: { opacity: 0, y: 40, filter: "blur(10px)" },
                                            visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring", damping: 12, stiffness: 100 } }
                                        }}
                                    >
                                        {word}
                                    </motion.span>
                                ))}
                            </h1>

                            <motion.p
                                variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.8 } } }}
                                className="text-[#2C2421]/80 text-sm sm:text-base font-medium leading-[1.8] mb-8 max-w-[90%] md:max-w-md"
                            >
                                "Quieres mirarte las manos por la mañana y pensar que tu estilo de vida es increíble; de eso se trata vivir una experiencia beauty. <strong className="font-extrabold text-[#2C2421]">Se trata de creer en vos misma</strong> y de saber que mereces destacar. No se me ocurre nada más emocionante que embellecer tu día a día."
                                <span className="font-light italic block mt-2 text-[#2C2421]/60">- Fran & Romy</span>
                            </motion.p>

                            {/* CTAs ocultos por solicitud */}
                        </motion.div>
                    ) : (
                        <div className="opacity-0 h-[400px]"></div>
                    )}
                </div>

                {/* 3. Bloque de Imágenes (Derecha/Abajo) */}
                {mounted && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4, duration: 1, ease: "easeOut" }}
                        className="relative w-full h-[450px] lg:h-[650px] mt-8 lg:mt-0 max-w-sm sm:max-w-md lg:max-w-none mx-auto"
                    >
                        {/* Imagen Principal Animada */}
                        <motion.div
                            initial={{ y: 0 }}
                            animate={{ y: [0, -10, 0] }}
                            whileHover={{ y: -20, transition: { duration: 0.4 } }}
                            transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
                            className="absolute inset-0 w-full h-full rounded-t-full rounded-bl-[4rem] rounded-br-2xl lg:rounded-bl-[6rem] lg:rounded-br-[4rem] border-8 border-white overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.15)] bg-stone-100 cursor-pointer hover:shadow-2xl hover:shadow-rose-900/30 transition-shadow"
                        >
                            <img
                                src="/img/nail-1.png"
                                alt="Fondo Trabajos Premium"
                                className="w-full h-full object-cover"
                                onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1519014816548-bf5fe059c98b?auto=format&fit=crop&w=600&q=80" }}
                            />
                        </motion.div>

                        {/* Imagen Superpuesta: Flotación Inversa */}
                        <motion.div
                            initial={{ y: 0 }}
                            animate={{ y: [0, 15, 0] }}
                            whileHover={{ y: -10, scale: 1.05, transition: { duration: 0.3 } }}
                            transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                            className="absolute -bottom-8 -right-4 lg:-left-12 lg:bottom-10 w-[55%] aspect-[3/4] rounded-[2rem] border-[6px] lg:border-8 border-white overflow-hidden shadow-2xl z-20 bg-stone-100 cursor-pointer hover:shadow-3xl hover:shadow-rose-900/40"
                        >
                            <img
                                src="/img/hero-secondary.png"
                                alt="Detalle de trabajo"
                                className="w-full h-full object-cover"
                                onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=600&q=80" }}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </div>
        </header>
    )
}
