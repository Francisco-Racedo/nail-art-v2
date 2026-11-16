'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { login } from '../actions'

export default function LoginPage() {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError(null)
        const formData = new FormData(e.currentTarget)
        const result = await login(formData)
        if (result?.error) {
            setError(result.error)
            setLoading(false)
        } else if (result?.success) {
            // Redirección controlada en el cliente para garantizar la navegación
            router.push('/admin/dashboard')
        }
    }

    return (
        <div className="min-h-[100dvh] bg-gradient-to-br from-rose-50 to-amber-50 flex items-center justify-center px-4 py-8">
            <div className="bg-white rounded-3xl shadow-xl border border-rose-100 p-6 sm:p-10 w-full max-w-md">

                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-rose-400 to-amber-400 rounded-2xl shadow-lg mb-4">
                        <span className="text-3xl">💅</span>
                    </div>
                    <h1 className="text-2xl font-bold text-zinc-900 font-serif">Panel Administración</h1>
                    <p className="text-zinc-500 text-sm mt-1">Pintitas Nails</p>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 text-sm">
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-2">
                            Email
                        </label>
                        <input
                            name="email"
                            type="email"
                            required
                            autoComplete="email"
                            placeholder="admin@franyromy.com"
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-2">
                            Contraseña
                        </label>
                        <div className="relative">
                            <input
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                autoComplete="current-password"
                                placeholder="••••••••"
                                className="w-full px-4 py-3 pr-12 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                className="absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400 hover:text-zinc-600 transition"
                                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            >
                                {showPassword
                                    ? <EyeOff className="w-5 h-5" />
                                    : <Eye className="w-5 h-5" />
                                }
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold py-3 rounded-xl transition duration-300 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Ingresando...' : 'Ingresar al Panel'}
                    </button>
                </form>

                <p className="text-center text-xs text-zinc-400 mt-8">
                    Acceso exclusivo para administradoras
                </p>
            </div>
        </div>
    )
}
