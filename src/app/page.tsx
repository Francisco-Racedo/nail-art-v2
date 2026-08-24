import NavBar from '@/components/NavBar'
import HeroSection from '@/components/HeroSection'
import CarouselGaleria from '@/components/CarouselGaleria'
import ListaDePrecios from '@/components/ListaDePrecios'
import AgendadorTurnos from '@/components/AgendadorTurnos'
import FloatingCTA from '@/components/FloatingCTA'


export default function HomePage() {
  return (
    <main className="font-sans bg-[#FDF8F5]">
      <NavBar />
      <HeroSection />
      <CarouselGaleria />
      <ListaDePrecios />
      <AgendadorTurnos />
      <footer className="py-10 text-center border-t border-amber-100 text-zinc-400 text-sm bg-[#FDF8F5]">
        <p>💅 <strong>FRAN &amp; ROMY NAILS</strong> | Lules, Tucumán, Argentina</p>
        <p className="mt-1 text-xs">Todos los derechos reservados © 2026</p>
      </footer>
      <FloatingCTA />
    </main>
  )
}
