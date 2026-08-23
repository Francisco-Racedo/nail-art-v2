'use client'

export default function HeroSection() {
    return (
        <header className="relative min-h-[100vh] flex flex-col items-center justify-center pt-28 pb-32 overflow-hidden"
            style={{
                backgroundColor: '#FDF8F5',
                backgroundImage: 'radial-gradient(#d4af37 0.5px, transparent 0.5px), radial-gradient(#d4af37 0.5px, #FDF8F5 0.5px)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 10px 10px',
            }}>

            {/* Imagen + Título superpuesto */}
            <div className="relative w-full max-w-lg mb-8 flex justify-center items-center mt-6 px-4" style={{ height: 350 }}>
                <div
                    className="absolute w-64 h-64 md:w-80 md:h-80 rounded-[2.5rem] shadow-2xl border-4 border-white left-2 md:left-8 flex items-center justify-center overflow-hidden"
                    style={{ animation: 'slideInLeft 2.7s cubic-bezier(0.2, 0.8, 0.2, 1) forwards' }}
                >
                    <img src="/img/hero.png" alt="Manos y uñas perfectas" className="w-full h-full object-cover" />
                </div>
                <h1
                    className="absolute z-10 text-[3.2rem] md:text-7xl text-white text-right font-bold leading-[0.9] drop-shadow-2xl right-4 md:right-8"
                    style={{
                        fontFamily: 'serif',
                        animation: 'slideInRight 2.7s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
                        textShadow: '0px 4px 20px rgba(0,0,0,0.8), 0 2px 5px rgba(0,0,0,0.5)',
                    }}
                >
                    FRAN<br /><span className="text-amber-300">&amp;</span> ROMY<br />NAILS
                </h1>
            </div>

            {/* Subtítulo */}
            <div className="flex flex-col items-center text-center px-6 mt-4 z-10"
                style={{ animation: 'fadeUp 1.5s ease forwards', animationDelay: '1.2s', opacity: 0 }}>
                <span className="inline-block px-4 py-1 mb-4 text-xs font-semibold tracking-wider uppercase bg-rose-100 text-rose-800 rounded-full border border-rose-200 shadow-sm">
                    ✨ Zona Lules
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-4" style={{ fontFamily: 'serif' }}>
                    Manicuría Profesional de{' '}
                    <br />
                    <span className="text-[2.5rem] md:text-5xl mt-2 inline-block font-bold"
                        style={{ background: 'linear-gradient(to right, #C59B27, #E5C158, #C59B27)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                        Alta Gama
                    </span>
                </h2>
                <p className="text-zinc-600 max-w-md mx-auto mb-8">
                    Especialistas en Kapping, Esculpidas y Semipermanente. Relájate mientras cuidamos de tus manos y pies.
                </p>
                <a href="#servicios" className="text-rose-600 font-bold border-b-2 border-rose-300 pb-1 hover:text-rose-800 transition">
                    Ver Catálogo de Servicios ↓
                </a>
            </div>

            <style>{`
        @keyframes slideInLeft {
          0% { transform: translateX(-40px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInRight {
          0% { transform: translateX(40px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeUp {
          0% { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
        </header>
    )
}
