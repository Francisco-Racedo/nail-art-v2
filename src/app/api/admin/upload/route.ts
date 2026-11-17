import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const ALLOWED_MIME_TYPES: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov'
}

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB máximo

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

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: 'El archivo supera el tamaño máximo permitido (25 MB)' },
                { status: 400 }
            )
        }

        const rawType = (file.type || '').toLowerCase().trim()
        const allowedExt = ALLOWED_MIME_TYPES[rawType]

        if (!allowedExt) {
            return NextResponse.json(
                {
                    error:
                        'Tipo de archivo no permitido. Solo se aceptan imágenes (JPG, PNG, WebP) o videos (MP4, WebM, MOV).'
                },
                { status: 400 }
            )
        }

        const fileName = `cms-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${allowedExt}`

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const supabaseAdmin = createServiceClient()
        const { error } = await supabaseAdmin.storage
            .from('carousel')
            .upload(fileName, buffer, {
                contentType: rawType,
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
