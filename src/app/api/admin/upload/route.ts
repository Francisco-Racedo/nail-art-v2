import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: Request) {
    try {
        const supabaseAuth = await createServerClient()
        const {
            data: { user }
        } = await supabaseAuth.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File | null
        if (!file) {
            return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
        }

        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
        const fileName = `cms-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const supabaseAdmin = createServiceClient()
        const { error } = await supabaseAdmin.storage
            .from('carousel')
            .upload(fileName, buffer, {
                contentType: file.type || 'application/octet-stream',
                upsert: true
            })

        if (error) {
            console.error('Upload error:', error)
            return NextResponse.json({ error: 'No se pudo subir el archivo' }, { status: 500 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/carousel/${fileName}`

        return NextResponse.json({ success: true, url: publicUrl })
    } catch (e) {
        console.error('POST /api/admin/upload error:', e)
        return NextResponse.json({ error: 'Error al procesar archivo' }, { status: 500 })
    }
}
