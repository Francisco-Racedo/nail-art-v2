import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdminUser } from '@/lib/auth-admin'

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
        const { authorized } = await requireAdminUser()

        if (!authorized) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const customName = (formData.get('fileName') as string | null)?.trim()

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

        const safeCustom = customName
            ? customName.replace(/[^a-zA-Z0-9.\-_]/g, '')
            : null
        const fileName =
            safeCustom && /\.(jpg|jpeg|png|webp|gif|mp4|webm|mov)$/i.test(safeCustom)
                ? safeCustom
                : `cms-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${allowedExt}`

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const supabaseAdmin = createServiceClient()
        const { error } = await supabaseAdmin.storage
            .from('carousel')
            .upload(fileName, buffer, {
                cacheControl: '3600',
                contentType: rawType,
                upsert: true
            })

        if (error) {
            console.error('Upload error:', error)
            return NextResponse.json({ error: 'No se pudo subir el archivo' }, { status: 500 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/carousel/${fileName}`

        return NextResponse.json({ success: true, url: publicUrl, fileName })
    } catch (e) {
        console.error('POST /api/admin/upload error:', e)
        return NextResponse.json({ error: 'Error al procesar archivo' }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const { authorized } = await requireAdminUser()
        if (!authorized) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const fileName = String(body?.fileName || '').trim()

        if (
            !fileName ||
            fileName.includes('..') ||
            fileName.includes('/') ||
            fileName.includes('\\')
        ) {
            return NextResponse.json(
                { error: 'Nombre de archivo inválido' },
                { status: 400 }
            )
        }

        const supabaseAdmin = createServiceClient()
        const { error } = await supabaseAdmin.storage
            .from('carousel')
            .remove([fileName])

        if (error) {
            console.error('Delete storage error:', error)
            return NextResponse.json(
                { error: 'No se pudo eliminar el archivo' },
                { status: 500 }
            )
        }

        return NextResponse.json({ success: true, deleted: fileName })
    } catch (e) {
        console.error('DELETE /api/admin/upload error:', e)
        return NextResponse.json(
            { error: 'Error al eliminar el archivo' },
            { status: 500 }
        )
    }
}
