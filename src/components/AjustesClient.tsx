'use client'

import React, { useRef, useState } from 'react'
import { Settings, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { updateConfig, addServicio, deleteServicio } from '@/app/admin/dashboard/ajustes/actions'

interface Config {
    intervalo_minutos: number
    hora_inicio: string
    hora_fin: string
}

interface Servicio {
    id: number
    nombre: string
    categoria: string
    precio: number
    icono: string
    destacado: number
    subtitulo?: string
    descripcion?: string
}

export default function AjustesClient({ config, servicios }: { config: Config, servicios: Servicio[] }) {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const formRef = useRef<HTMLFormElement>(null)

    const handleSaveConfig = async (formData: FormData) => {
        const toastId = toast.loading('Guardando ajustes...')
        try {
            await updateConfig(formData)
            toast.success('Ajustes guardados correctamente', { id: toastId })
        } catch (e: any) {
            toast.error('Error al guardar', { id: toastId })
        }
    }

    const handleAddService = async (formData: FormData) => {
        const toastId = toast.loading('Añadiendo servicio...')
        try {
            if (!formData.get('nombre') || !formData.get('precio')) throw new Error('Faltan campos')
            await addServicio(formData)
            toast.success('Servicio guardado', { id: toastId })
            setIsModalOpen(false)
            formRef.current?.reset()
        } catch (e: any) {
            toast.error(e.message || 'Error guardando', { id: toastId })
        }
    }

    const handleDeleteService = async (id: number) => {
        const toastId = toast.loading('Borrando...')
        try {
            await deleteServicio(id)
            toast.success('Eliminado de la lista', { id: toastId })
        } catch (e) {
            toast.error('No se pudo borrar', { id: toastId })
        }
    }

    return (
        <div className="w-full">
            {/* Ajustes Tiempos */}
            <div className="bg-zinc-900/40 backdrop-blur-md rounded-[2rem] border border-zinc-800 p-6 md:p-8 mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><Settings className="w-32 h-32" /></div>

                <h2 className="text-xl md:text-2xl font-bold text-white mb-6 relative z-10">Ajustes Globales</h2>
                <form action={handleSaveConfig} className="space-y-4 relative z-10 w-full max-w-sm">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1.5">Intervalo de Turnos (minutos)</label>
                        <input type="number" name="intervalo_minutos" defaultValue={config?.intervalo_minutos || 90} className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Hora Inicio</label>
                            <input type="time" name="hora_inicio" defaultValue={config?.hora_inicio || '09:00'} className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Hora Fin</label>
                            <input type="time" name="hora_fin" defaultValue={config?.hora_fin || '20:00'} className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
                        </div>
                    </div>
                    <button type="submit" className="w-full mt-4 bg-amber-500 text-zinc-900 font-bold py-3 rounded-xl hover:bg-amber-400 transition shadow-[0_0_15px_rgba(229,193,88,0.2)]">
                        Guardar Configuración
                    </button>
                </form>
            </div>

            {/* Servicios Table */}
            <div className="bg-zinc-900/40 backdrop-blur-md rounded-[2rem] border border-zinc-800 p-6 md:p-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl md:text-2xl font-bold text-white">Servicios y Tarifas</h2>
                    <button onClick={() => setIsModalOpen(true)} className="bg-amber-500 hover:bg-amber-400 text-zinc-900 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Añadir
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-zinc-500 text-xs uppercase bg-zinc-800/30">
                                <th className="p-3 rounded-tl-xl font-semibold tracking-wider">Nombre</th>
                                <th className="p-3 font-semibold tracking-wider">Categoría</th>
                                <th className="p-3 font-semibold tracking-wider">Precio</th>
                                <th className="p-3 text-right rounded-tr-xl">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {servicios.map((s, idx) => (
                                <tr key={idx} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition">
                                    <td className="p-3 font-semibold text-zinc-200">
                                        {s.icono && <span className="mr-2">{s.icono}</span>}
                                        {s.nombre}
                                        {s.destacado === 1 && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full ml-2 border border-amber-500/30 uppercase tracking-widest">Destacado</span>}
                                    </td>
                                    <td className="p-3 text-zinc-400">{s.categoria}</td>
                                    <td className="p-3 font-bold text-amber-400">${s.precio.toLocaleString('es-AR')}</td>
                                    <td className="p-3 text-right">
                                        <button onClick={() => handleDeleteService(s.id)} className="text-red-400 hover:bg-red-950/40 p-2 rounded-lg transition border border-transparent hover:border-red-900/50 ml-1">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal / Dialog (Server Actions Form) */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center animate-in fade-in duration-200">
                    <div className="absolute inset-0" onClick={() => setIsModalOpen(false)} />
                    <div className="bg-zinc-900 border border-zinc-800 rounded-t-3xl md:rounded-3xl w-full max-w-lg shadow-2xl p-6 relative animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-0 md:zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-2xl font-bold mb-6 text-white tracking-tight">Adición de Servicio</h3>
                        <form ref={formRef} action={handleAddService} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Categoría</label>
                                <select name="categoria" className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-3 text-white focus:ring-2 focus:ring-amber-500">
                                    <option value="Manos">Manos</option>
                                    <option value="Pies & Extras">Pies & Extras</option>
                                    <option value="Promos">Promos</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Nombre del Servicio *</label>
                                <input type="text" name="nombre" placeholder="Ej: Semi con Deco básica" required className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-3 text-white focus:ring-2 focus:ring-amber-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Subtítulo Corto</label>
                                <input type="text" name="subtitulo" placeholder="Ej: Uñas esculpidas en gel" className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-3 text-white focus:ring-2 focus:ring-amber-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Descripción</label>
                                <textarea name="descripcion" rows={2} className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-3 text-white focus:ring-2 focus:ring-amber-500"></textarea>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1">Precio * (Sin $)</label>
                                    <input type="number" name="precio" placeholder="12000" required className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-3 text-white focus:ring-2 focus:ring-amber-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1">Emoji / Icono</label>
                                    <input type="text" name="icono" placeholder="💅" className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-3 text-white focus:ring-2 focus:ring-amber-500" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-6 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                                <input type="checkbox" name="destacado" id="destacado" className="w-5 h-5 accent-amber-500 rounded focus:ring-0" />
                                <label htmlFor="destacado" className="font-medium text-sm text-amber-200">Resaltar con la tarjeta color oro (Destacado)</label>
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-zinc-800/50 mt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-zinc-800 text-white font-bold py-3 rounded-xl hover:bg-zinc-700 transition">Cancelar</button>
                                <button type="submit" className="flex-1 bg-amber-500 text-zinc-900 font-bold py-3 rounded-xl hover:bg-amber-400 transition shadow-[0_0_15px_rgba(229,193,88,0.2)]">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
