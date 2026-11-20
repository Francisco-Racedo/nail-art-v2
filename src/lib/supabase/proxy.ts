import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { esUsuarioAdminAutorizado } from '@/lib/auth-admin'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                }
            }
        }
    )

    const {
        data: { user }
    } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname
    const isApiAdmin = pathname.startsWith('/api/admin')
    const isLogin = pathname.startsWith('/admin/login')

    let isAuthorizedAdmin = false
    if (user) {
        const { autorizado } = await esUsuarioAdminAutorizado(user)
        isAuthorizedAdmin = autorizado
    }

    // Bloquear llamadas directas (cURL/Postman) a /api/admin/* sin sesión de administrador autorizado
    if (isApiAdmin && !isAuthorizedAdmin) {
        return NextResponse.json(
            { error: 'Acceso denegado: Se requiere sesión de administrador autorizado.' },
            { status: 401 }
        )
    }

    // Si no está autenticado como admin autorizado y quiere acceder a vistas /admin (excepto login), redirigir
    if (!isAuthorizedAdmin && pathname.startsWith('/admin') && !isLogin) {
        if (user) {
            await supabase.auth.signOut()
        }
        const url = request.nextUrl.clone()
        url.pathname = '/admin/login'
        return NextResponse.redirect(url)
    }

    // Si ya está autenticado como admin autorizado e intenta ir al login, redirigir al dashboard
    if (isAuthorizedAdmin && pathname === '/admin/login') {
        const url = request.nextUrl.clone()
        url.pathname = '/admin/dashboard'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
