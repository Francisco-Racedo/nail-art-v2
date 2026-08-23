export default function LoadingDashboard() {
    return (
        <div className="flex h-screen items-center justify-center bg-[#030614]">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 rounded-full border-4 border-cyan-500/30 border-t-cyan-400 animate-spin" style={{ filter: 'drop-shadow(0 0 8px rgba(6,182,212,0.5))' }}></div>
                <p className="text-cyan-400/80 font-medium text-sm tracking-widest animate-pulse">CARGANDO...</p>
            </div>
        </div>
    )
}
