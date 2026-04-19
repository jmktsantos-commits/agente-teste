import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Paths que nunca redirecionam para login (acesso público)
const AUTH_FREE_PATHS = ['/login', '/registro', '/auth', '/reset-password', '/ativar-trial', '/trial-expirado', '/aguardando-aprovacao']
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
            .select('plan, trial_expires_at, role, status')
            .eq('id', user.id)
            .single()

        // ── PERFIL INEXISTENTE: usuário tem sessão mas foi removido do banco
        //    → limpar cookies de sessão e redirecionar para login
        if (!profile) {
            // Tentar signOut via cookie client (melhor esforço)
            await supabase.auth.signOut()

            const url = request.nextUrl.clone()
            url.pathname = '/login'
            url.searchParams.set('error', 'conta_removida')

            // Criar resposta de redirect e limpar TODOS os cookies de autenticação
            const redirectResponse = NextResponse.redirect(url)
            // Limpar cookies do Supabase Auth para garantir que o JWT não seja reutilizado
            request.cookies.getAll().forEach(cookie => {
                if (cookie.name.startsWith('sb-') || cookie.name.includes('supabase')) {
                    redirectResponse.cookies.delete(cookie.name)
                }
            })
            return redirectResponse
        }

        // Admins e afiliados: acesso irrestrito
        const isAdmin = profile.role === 'admin' || profile.role === 'affiliate'
        if (isAdmin) return response

        // ── REGRA DE APROVACÃO ──────────────────────────────────────────────────
        // Bloqueia usuários não aprovados de DUAS formas:
        //  1) status='pending' (API set-pending funcionou)
        //  2) trial_expires_at IS NULL + sem plano pago (trigger criou com status='active' mas admin ainda não aprovou)
        const isPaid = profile.plan && PAID_PLANS.includes(profile.plan)
        const hasActiveTrial = !!profile.trial_expires_at
        const isPendingApproval = profile.status === 'pending' || (!hasActiveTrial && !isPaid)

        if (isPendingApproval) {
            const url = request.nextUrl.clone()
            url.pathname = '/aguardando-aprovacao'
            return NextResponse.redirect(url)
        }

        // Planos pagos: acesso irrestrito
        if (isPaid) return response

        const now = new Date()

        // Trial com data definida e expirado → BLOQUEADO
        if (profile.trial_expires_at) {
            const expiredAt = new Date(profile.trial_expires_at)
            if (expiredAt <= now) {
                const url = request.nextUrl.clone()
                url.pathname = '/trial-expirado'
                return NextResponse.redirect(url)
            }
        }
    }

    return response
}
