import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Paths que nunca redirecionam para login (acesso público)
const AUTH_FREE_PATHS = ['/login', '/registro', '/auth', '/reset-password', '/ativar-trial']
const PUBLIC_EXACT_PATHS = ['/'] // Landing page — acesso público sem login

// Planos que NÃO devem ser bloqueados mesmo com trial expirado
const PAID_PLANS = ['starter', 'anual', 'black', 'paid', 'premium', 'active', 'vip']

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

    // Verificar se trial expirou — só bloqueia plano 'trial' expirado
    // Nunca bloqueia: admins, usuários com plano pago, ou usuários free sem trial
    if (user && !isAuthFreePath) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('plan, trial_expires_at, role')
            .eq('id', user.id)
            .single()

        // Admins e usuários com plano pago nunca são bloqueados
        const isAdmin = profile?.role === 'admin' || profile?.role === 'affiliate'
        const isPaid = profile?.plan && PAID_PLANS.includes(profile.plan)

        if (!isAdmin && !isPaid) {
            const now = new Date()
            const trialExpired = profile?.trial_expires_at && new Date(profile.trial_expires_at) < now

            // Só bloqueia quem ainda tem plan='trial' expirado
            // Usuários com plan='free' podem ter vindo de outros fluxos — não bloquear automaticamente
            const shouldBlock = profile?.plan === 'trial' && trialExpired

            if (shouldBlock) {
                return NextResponse.redirect('https://agente-teste-three.vercel.app/')
            }
        }
    }

    return response
}
