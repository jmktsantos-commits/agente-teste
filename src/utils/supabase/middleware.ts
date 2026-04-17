import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Paths que nunca redirecionam para login (acesso público)
const AUTH_FREE_PATHS = ['/login', '/registro', '/auth', '/reset-password', '/ativar-trial', '/trial-expirado']
const PUBLIC_EXACT_PATHS = ['/'] // Landing page — acesso público sem login

// Planos pagos — NUNCA bloqueados mesmo com trial expirado
const PAID_PLANS = ['starter', 'anual', 'black', 'paid', 'premium', 'active', 'vip', 'pro', 'monthly', 'annual']

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

    // API routes gerenciam a própria autenticação — não tocar
    const isApiRoute = request.nextUrl.pathname.startsWith('/api')
    if (isApiRoute) return response

    // Sem sessão em rota protegida → login
    if (!user && !isAuthFreePath) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // ── VERIFICAÇÃO DE ACESSO (trial expirado) ──────────────────────────────
    if (user && !isAuthFreePath) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('plan, trial_expires_at, role')
            .eq('id', user.id)
            .single()

        // Admins e afiliados: acesso irrestrito
        const isAdmin = profile?.role === 'admin' || profile?.role === 'affiliate'
        if (isAdmin) return response

        // Planos pagos: acesso irrestrito
        const isPaid = profile?.plan && PAID_PLANS.includes(profile.plan)
        if (isPaid) return response

        const now = new Date()

        // ── REGRA PRINCIPAL: qualquer usuário sem plano pago que tenha
        //    trial_expires_at definido e expirado → BLOQUEADO.
        //    Cobre: plan='trial', plan='free' (mudado após expiração), plan=null.
        if (profile?.trial_expires_at) {
            const expiredAt = new Date(profile.trial_expires_at)
            if (expiredAt <= now) {
                const url = request.nextUrl.clone()
                url.pathname = '/trial-expirado'
                return NextResponse.redirect(url)
            }
        }

        // ── REGRA EXTRA: plan='trial' sem data de expiração (trial "congelado")
        //    → bloqueia para forçar resolução administrativa
        if (profile?.plan === 'trial' && !profile?.trial_expires_at) {
            const url = request.nextUrl.clone()
            url.pathname = '/trial-expirado'
            return NextResponse.redirect(url)
        }
    }

    return response
}
