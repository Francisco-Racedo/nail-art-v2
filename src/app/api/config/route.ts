import { NextResponse } from 'next/server'
import { getConfigCompleta, DEFAULT_CONFIG_COMPLETA } from '@/lib/reservas-server'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function GET() {
    try {
        const cfg = await getConfigCompleta()
        return NextResponse.json(cfg, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                Pragma: 'no-cache',
                Expires: '0'
            }
        })
    } catch {
        return NextResponse.json(DEFAULT_CONFIG_COMPLETA)
    }
}
