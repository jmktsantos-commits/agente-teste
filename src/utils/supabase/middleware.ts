import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Paths que nunca redirecionam para login (acesso público)
const AUTH_FREE_PATHS = ['/login', '/registro', '/auth', '/reset-password', '/ativar-trial', '/trial-expirado']
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

    // Verificar se trial expirou (evitar loop: ignorar se já está em /trial-expirado)
    if (user && !isAuthFreePath && !request.nextUrl.pathname.startsWith('/trial-expirado')) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('plan, trial_expires_at')
            .eq('id', user.id)
            .single()

        const now = new Date()
        const trialExpired = profile?.trial_expires_at && new Date(profile.trial_expires_at) < now

        const shouldBlock =
            // Caso 1: still marked as 'trial' but expired
            (profile?.plan === 'trial' && trialExpired) ||
            // Caso 2: plan voltou para 'free' mas já teve trial expirado (não assinou)
            (profile?.plan === 'free' && trialExpired)

        if (shouldBlock) {
            const url = request.nextUrl.clone()
            url.pathname = '/trial-expirado'
            return NextResponse.redirect(url)
        }
    }

    return response
}
