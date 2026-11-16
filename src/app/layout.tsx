import type { Metadata, Viewport } from "next"
import { Geist, Cormorant_Garamond } from "next/font/google"
import "./globals.css"
import Providers from "./providers"
import { getConfigCompleta } from "@/lib/reservas-server"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const cormorant = Cormorant_Garamond({
  variable: "--font-editorial",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
})

export const viewport: Viewport = {
  themeColor: "#f43f5e",
  width: "device-width",
  initialScale: 1,
}

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getConfigCompleta()
  const nombre = (cfg.nombre_negocio || "Pintitas Nails").toUpperCase()
  return {
    title: `${nombre} | MANICURA PROFESIONAL EN LULES, TUCUMÁN`,
    description:
      "Especialistas en Kapping, Uñas Esculpidas, Semipermanente y Pedi Spa en Lules. Reservá tu turno online.",
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: cfg.nombre_negocio || "Pintitas Nails",
    },
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" data-scroll-behavior="smooth" className={`${geistSans.variable} ${cormorant.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
