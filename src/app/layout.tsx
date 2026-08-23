import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import Providers from "./providers"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Fran & Romy Nails | Manicuría Profesional en Lules, Tucumán",
  description: "Especialistas en Kapping, Uñas Esculpidas, Semipermanente y Pedi Spa en Lules. Reservá tu turno online.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
