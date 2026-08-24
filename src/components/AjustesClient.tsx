'use client'

import React, { useRef, useState } from 'react'
import { Settings, Plus, Trash2, Edit2 } from 'lucide-react'
import { toast } from 'sonner'
import { updateConfig, addServicio, deleteServicio, editServicio } from '@/app/admin/dashboard/ajustes/actions'

interface Config {
    intervalo_minutos: number
    hora_inicio: string
    hora_fin: string
    // M-05: Datos del negocio ahora gestionables desde el panel
    nombre_negocio?: string
    whatsapp_numero?: string
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
    const [editingService, setEditingService] = useState<Servicio | null>(null)
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

    const handleSaveService = async (formData: FormData) => {
        const toastId = toast.loading(editingService ? 'Guardando edición...' : 'Añadiendo servicio...')
        try {
            if (!formData.get('nombre') || !formData.get('precio')) throw new Error('Faltan campos')
            if (editingService) {
                await editServicio(editingService.id, formData)
                toast.success('Servicio editado con éxito', { id: toastId })
            } else {
                await addServicio(formData)
                toast.success('Servicio guardado', { id: toastId })
            }
            setIsModalOpen(false)
            setEditingService(null)
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

    const openEditModal = (s: Servicio) => {
        setEditingService(s)
        setIsModalOpen(true)
    }

    const closeAndResetModal = () => {
        setIsModalOpen(false)
        setEditingService(null)
        formRef.current?.reset()
    }

    return (
        <div className="w-full relative">
            {/* Ajustes Tiempos */}
            <div className="bg-[#050b14]/60 backdrop-blur-[40px] rounded-[2rem] border border-indigo-500/10 p-6 md:p-8 mb-6 relative overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                <div className="absolute top-0 right-0 p-4 opacity-5"><Settings className="w-40 h-40 text-indigo-400" /></div>
                <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-indigo-600/10 blur-[80px] pointer-events-none rounded-full" />

                <h2 className="text-xl md:text-2xl font-bold text-white mb-6 relative z-10 flex items-center gap-2"><Settings className="w-6 h-6 text-cyan-400" /> Ajustes Globales</h2>
                <form action={handleSaveConfig} className="space-y-4 relative z-10 w-full max-w-md">
                    {/* M-05: Datos del negocio */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-indigo-200 mb-1.5 uppercase tracking-wide">Nombre del Negocio</label>
                            <input type="text" name="nombre_negocio" defaultValue={config?.nombre_negocio || 'Fran & Romy Nails'} maxLength={80} className="w-full bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-inner" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-indigo-200 mb-1.5 uppercase tracking-wide">Número WhatsApp (solo dígitos, sin +)</label>
                            <input type="text" name="whatsapp_numero" defaultValue={config?.whatsapp_numero || '5493813013850'} placeholder="5493812345678" className="w-full bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-inner" />
                        </div>
                    </div>
                    <div className="border-t border-indigo-500/10 my-4" />
                    <div>
                        <label className="block text-sm font-semibold text-indigo-200 mb-1.5 uppercase tracking-wide">Intervalo de Turnos (minutos)</label>
                        <input type="number" name="intervalo_minutos" defaultValue={config?.intervalo_minutos || 90} className="w-full bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-inner" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-indigo-200 mb-1.5 uppercase tracking-wide">Hora Inicio</label>
                            <input type="time" name="hora_inicio" defaultValue={config?.hora_inicio || '09:00'} className="w-full bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-inner" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-indigo-200 mb-1.5 uppercase tracking-wide">Hora Fin</label>
                            <input type="time" name="hora_fin" defaultValue={config?.hora_fin || '20:00'} className="w-full bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-inner" />
                        </div>
                    </div>
                    <button type="submit" className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-bold py-3 rounded-xl hover:from-indigo-500 hover:to-cyan-500 transition shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                        Guardar Configuración
                    </button>
                </form>
            </div>

            {/* Servicios Table */}
            <div className="bg-[#050b14]/60 backdrop-blur-[40px] rounded-[2rem] border border-indigo-500/10 p-6 md:p-8 relative overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                <div className="absolute top-1/2 right-10 w-40 h-40 bg-cyan-600/10 blur-[90px] pointer-events-none rounded-full" />
                <div className="flex justify-between items-center mb-6 relative z-10">
                    <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Servicios y Tarifas</h2>
                    <button onClick={() => setIsModalOpen(true)} className="bg-cyan-500 hover:bg-cyan-400 text-[#050b14] px-4 py-2 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)] transition flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Añadir
                    </button>
                </div>

                <div className="overflow-x-auto relative z-10">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-indigo-300 text-xs font-bold uppercase bg-indigo-950/40">
                                <th className="p-3 rounded-tl-xl tracking-wider">Nombre</th>
                                <th className="p-3 tracking-wider">Categoría</th>
                                <th className="p-3 tracking-wider">Precio</th>
                                <th className="p-3 text-right rounded-tr-xl">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {servicios.map((s) => (
                                <tr key={s.id} className="border-b border-indigo-500/10 last:border-0 hover:bg-indigo-900/20 transition">
                                    <td className="p-3 font-semibold text-slate-100">
                                        {s.icono && <span className="mr-2 opacity-80">{s.icono}</span>}
                                        {s.nombre}
                                        {s.destacado === 1 && <span className="text-[10px] bg-fuchsia-500/20 text-fuchsia-400 px-2 py-0.5 rounded-full ml-2 border border-fuchsia-500/30 uppercase tracking-widest shadow-[0_0_10px_rgba(217,70,239,0.2)]">Top</span>}
                                    </td>
                                    <td className="p-3 text-indigo-300 font-medium">{s.categoria}</td>
                                    <td className="p-3 font-bold text-cyan-400">${s.precio.toLocaleString('es-AR')}</td>
                                    <td className="p-3 text-right">
                                        <button onClick={() => openEditModal(s)} className="text-cyan-500/70 hover:text-cyan-400 hover:bg-cyan-950/40 p-2 rounded-lg transition border border-transparent hover:border-cyan-900/50">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDeleteService(s.id)} className="text-red-400/70 hover:text-red-400 hover:bg-red-950/40 p-2 rounded-lg transition border border-transparent hover:border-red-900/50 ml-1">
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
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-end md:items-center justify-center animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-indigo-950/20" onClick={closeAndResetModal} />
                    <div className="bg-[#050b14] border border-indigo-500/30 rounded-t-3xl md:rounded-[2rem] w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.8)] p-6 pb-32 md:p-8 md:pb-8 relative animate-in fade-in zoom-in-[0.98] slide-in-from-bottom-[100%] md:slide-in-from-bottom-0 md:zoom-in-95 duration-400 ease-out max-h-[85dvh] md:max-h-[90vh] overflow-y-auto overscroll-contain">
                        <h3 className="text-2xl font-bold mb-6 text-white tracking-tight flex items-center gap-3">
                            {editingService ? <Edit2 className="text-cyan-400" /> : <Plus className="text-cyan-400" />}
                            {editingService ? "Editar Servicio" : "Nuevo Servicio"}
                        </h3>
                        <form ref={formRef} action={handleSaveService} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-indigo-300 uppercase tracking-wide mb-1.5">Categoría</label>
                                <select name="categoria" defaultValue={editingService?.categoria || "Manos"} className="w-full bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none">
                                    <option value="Manos">Manos</option>
                                    <option value="Pies & Extras">Pies & Extras</option>
                                    <option value="Promos">Promos</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-indigo-300 uppercase tracking-wide mb-1.5">Nombre del Servicio *</label>
                                <input type="text" name="nombre" defaultValue={editingService?.nombre} placeholder="Ej: Semi con Deco básica" required className="w-full bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3 text-white placeholder-indigo-700 focus:ring-2 focus:ring-cyan-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-indigo-300 uppercase tracking-wide mb-1.5">Subtítulo Corto</label>
                                <input type="text" name="subtitulo" defaultValue={editingService?.subtitulo} placeholder="Ej: Uñas esculpidas en gel" className="w-full bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3 text-white placeholder-indigo-700 focus:ring-2 focus:ring-cyan-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-indigo-300 uppercase tracking-wide mb-1.5">Descripción</label>
                                <textarea name="descripcion" defaultValue={editingService?.descripcion} rows={2} className="w-full bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3 text-white placeholder-indigo-700 focus:ring-2 focus:ring-cyan-500 outline-none"></textarea>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-indigo-300 uppercase tracking-wide mb-1.5">Precio * (Sin $)</label>
                                    <input type="number" name="precio" defaultValue={editingService?.precio} placeholder="12000" required className="w-full bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3 text-white placeholder-indigo-700 focus:ring-2 focus:ring-cyan-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-indigo-300 uppercase tracking-wide mb-1.5">Emoji / Icono</label>
                                    <input type="text" name="icono" defaultValue={editingService?.icono} placeholder="💅" className="w-full bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3 text-white placeholder-indigo-700 focus:ring-2 focus:ring-cyan-500 outline-none" />
                                </div>
                            </div>
                            <div className="flex items-center gap-3 mt-6 p-4 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20">
                                <input type="checkbox" name="destacado" id="destacado" defaultChecked={editingService?.destacado === 1} className="w-5 h-5 accent-fuchsia-500 rounded focus:ring-0" />
                                <label htmlFor="destacado" className="font-semibold text-sm text-fuchsia-200">Resaltar con estado "Top" (Destacado)</label>
                            </div>
                            <div className="flex gap-3 pt-6 mt-4">
                                <button type="button" onClick={closeAndResetModal} className="flex-1 bg-indigo-950 text-indigo-200 border border-indigo-500/30 font-bold py-3.5 rounded-xl hover:bg-indigo-900 transition">Cancelar</button>
                                <button type="submit" className="flex-1 bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl border border-cyan-500/50 hover:from-cyan-500 hover:to-indigo-500 transition shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                                    {editingService ? "Actualizar" : "Guardar"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
