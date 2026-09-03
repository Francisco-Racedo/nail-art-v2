export function generarHorariosDisponibles(horaInicio: string, horaFin: string, intervaloMinutos: number | string): string[] {
    const horarios: string[] = []
    const [hi, mi] = horaInicio.split(':').map(Number)
    const [hf, mf] = horaFin.split(':').map(Number)

    // Fallback safe parses
    const intervalo = typeof intervaloMinutos === 'string' ? parseInt(intervaloMinutos, 10) : Math.max(1, intervaloMinutos || 60)
    const inicioMins = (hi || 0) * 60 + (mi || 0)
    const finMins = (hf || 0) * 60 + (mf || 0)

    let mins = inicioMins

    // <= ensures if end is 19:00 it allows generating the '19:00' slot itself if aligned.
    // If we only wanted strictly before, it would be <, but "jornada de 9 a 20hs, turnos de 1h" 
    // means 19:00 to 20:00 is the last shift. If 19:00 is the last shift it's correct.
    while (mins < finMins) {
        horarios.push(`${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`)
        mins += intervalo
    }

    return horarios
}
