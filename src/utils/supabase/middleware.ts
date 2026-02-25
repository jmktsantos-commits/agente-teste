import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

// Paths que nunca redirecionam para login (acesso público)
const AUTH_FREE_PATHS = ['/login', '/registro', '/auth', '/reset-password']
const PUBLIC_EXACT_PATHS = ['/'] // Landing page — acesso público sem login


export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: { headers: request.headers },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return request.cookies.getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    response = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    const isAuthFreePath =
        PUBLIC_EXACT_PATHS.includes(request.nextUrl.pathname) ||
        AUTH_FREE_PATHS.some(p => request.nextUrl.pathname.startsWith(p))
    // API routes handle their own auth (service role) — never strip their session cookies
    const isApiRoute = request.nextUrl.pathname.startsWith('/api')

    if (isApiRoute) {
        return response // Pass through — don't touch API requests
    }

    // No session on a protected path → redirect to login
    if (!user && !isAuthFreePath) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // User authenticated — check profile status light-weight via JWT
    if (user) {
        // We previously queried the DB here on every request, which caused massive slowdowns.
        // Now, we only rely on the auth token validity in middleware.
        // If they are deleted or banned, Supabase Auth will revoke their token eventually,
        // or the specific protected pages/actions will catch them.
    }

    return response
}
