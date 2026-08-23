'use client'

import { useState } from 'react'
import { login } from '../actions'

export default function LoginPage() {
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError(null)
        const formData = new FormData(e.currentTarget)
        const result = await login(formData)
        if (result?.error) {
            setError(result.error)
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-rose-50 to-amber-50 flex items-center justify-center px-4">
            <div className="bg-white rounded-3xl shadow-xl border border-rose-100 p-10 w-full max-w-md">

                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-rose-400 to-amber-400 rounded-2xl shadow-lg mb-4">
                        <span className="text-3xl">💅</span>
                    </div>
                    <h1 className="text-2xl font-bold text-zinc-900 font-serif">Panel Administración</h1>
                    <p className="text-zinc-500 text-sm mt-1">Fran &amp; Romy Nails</p>
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
                            placeholder="admin@franyromy.com"
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-2">
                            Contraseña
                        </label>
                        <input
                            name="password"
                            type="password"
                            required
                            placeholder="••••••••"
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
                        />
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
