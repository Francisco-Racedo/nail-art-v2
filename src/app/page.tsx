import NavBar from '@/components/NavBar'
import HeroSection from '@/components/HeroSection'
import CarouselGaleria from '@/components/CarouselGaleria'
import ListaDePrecios from '@/components/ListaDePrecios'
import AgendadorTurnos from '@/components/AgendadorTurnos'
import FloatingCTA from '@/components/FloatingCTA'
import SeccionesPersonalizadas from '@/components/SeccionesPersonalizadas'
import { getConfigCompleta } from '@/lib/reservas-server'
import { MapPin, Clock, Sparkles } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
    const cfg = await getConfigCompleta()
    const nombreNegocio = cfg.nombre_negocio || 'Pintitas Nails'
    const cms = cfg.cms

    return (
        <main className="font-sans bg-gradient-to-br from-[#F9ECE6] via-[#FDF8F5] to-[#F5E4DC] p-2 sm:p-4 md:p-6 lg:p-10 min-h-screen">
            <div className="bg-[#FAF6F2] rounded-[2rem] sm:rounded-[2.75rem] md:rounded-[3.5rem] shadow-[0_35px_80px_-20px_rgba(90,45,55,0.22)] overflow-hidden max-w-7xl mx-auto relative border border-white/80">
                <NavBar initialNombre={nombreNegocio} />
                <HeroSection initialNombre={nombreNegocio} />
                <CarouselGaleria />

                {/* Secciones personalizadas creadas por el dueño antes de Servicios */}
                <SeccionesPersonalizadas
                    secciones={cms.secciones_personalizadas}
                    posicion="antes_servicios"
                />

                <ListaDePrecios />

                {/* Secciones personalizadas creadas por el dueño después de Servicios */}
                <SeccionesPersonalizadas
                    secciones={cms.secciones_personalizadas}
                    posicion="despues_servicios"
                />

                <AgendadorTurnos />

                {/* Secciones personalizadas creadas por el dueño después de Reserva */}
                <SeccionesPersonalizadas
                    secciones={cms.secciones_personalizadas}
                    posicion="despues_reserva"
                />

                {cms.footer.visible && (
                    <footer className="py-14 px-6 text-center border-t border-rose-200/50 bg-gradient-to-b from-[#FAF6F2] to-[#F3E9E2] text-stone-600">
                        <div className="max-w-3xl mx-auto flex flex-col items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shadow-sm">
                                <Sparkles className="w-4 h-4" />
                            </div>
                            <p className="font-editorial text-2xl sm:text-3xl font-bold tracking-wider text-[#231C19]">
                                {nombreNegocio.toUpperCase()}
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm font-medium text-stone-600">
                                {cms.footer.ubicacion && (
                                    <span className="inline-flex items-center gap-1.5 bg-white/80 px-3.5 py-1.5 rounded-full border border-rose-200/60">
                                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                                        {cms.footer.ubicacion}
                                    </span>
                                )}
                                <span className="inline-flex items-center gap-1.5 bg-white/80 px-3.5 py-1.5 rounded-full border border-rose-200/60">
                                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                                    Lunes a Sábado • {cfg.hora_inicio} a {cfg.hora_fin} hs
                                </span>
                            </div>
                            {cms.footer.derechos && (
                                <p className="mt-2 text-xs text-stone-400 font-light tracking-wide">
                                    {cms.footer.derechos}
                                </p>
                            )}
                        </div>
                    </footer>
                )}
            </div>
            <FloatingCTA />
        </main>
    )
}
