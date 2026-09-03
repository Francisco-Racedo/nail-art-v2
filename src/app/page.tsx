import NavBar from '@/components/NavBar'
import HeroSection from '@/components/HeroSection'
import CarouselGaleria from '@/components/CarouselGaleria'
import ListaDePrecios from '@/components/ListaDePrecios'
import AgendadorTurnos from '@/components/AgendadorTurnos'
import FloatingCTA from '@/components/FloatingCTA'

export default function HomePage() {
  return (
    <main className="font-sans bg-gradient-to-br from-rose-100 via-fuchsia-50 to-orange-100 p-2 sm:p-4 md:p-8 lg:p-12 min-h-screen">
      <div className="bg-[#FCFAF8] rounded-[2rem] sm:rounded-[2.5rem] md:rounded-[4rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden max-w-7xl mx-auto relative border border-white/60 backdrop-blur-sm">
        <NavBar />
        <HeroSection />
        <CarouselGaleria />
        <ListaDePrecios />
        <AgendadorTurnos />
        <footer className="py-10 text-center border-t border-amber-100/30 text-stone-400 text-sm bg-[#FCFAF8]">
          <p>💅 <strong>FRAN &amp; ROMY NAILS</strong> | Lules, Tucumán, Argentina</p>
          <p className="mt-1 text-xs font-light">Todos los derechos reservados © 2026</p>
        </footer>
      </div>
      <FloatingCTA />
    </main>
  )
}
