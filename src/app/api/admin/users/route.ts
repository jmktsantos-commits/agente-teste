import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/utils/supabase/server'

function adminSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
}

async function verifyAdmin() {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
    if (profile?.role !== 'admin' && profile?.role !== 'affiliate') return null
    return user
}

// POST /api/admin/users
// Body: { action, ...fields }
export async function POST(request: NextRequest) {
    const admin = await verifyAdmin()
    if (!admin) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body

    const supabase = adminSupabase()

    try {
        switch (action) {

            // ── CRIAR USUÁRIO MANUALMENTE
            case 'create_user': {
                const { email, password, fullName, plan, role } = body

                if (!email || !password) {
                    return NextResponse.json({ error: 'Email e senha são obrigatórios.' }, { status: 400 })
                }

                // 1. Criar na auth.users
                const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                    email,
                    password,
                    email_confirm: true, // já confirma o email automaticamente
                    user_metadata: { full_name: fullName || '' },
                })

                if (authError) throw authError

                const userId = authData.user.id

                // 2. Calcular trial_expires_at se plano for trial
                const now = new Date()
                const trialExpiresAt = (plan === 'trial')
                    ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
                    : null

                // 3. Criar/atualizar profile
                const { error: profileError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: userId,
                        email,
                        full_name: fullName || '',
                        plan: plan || 'trial',
                        role: role || 'user',
                        status: 'active',
                        last_seen: null, // garante que não aparecerã como online
                        trial_activated_at: (plan === 'trial') ? now.toISOString() : null,
                        trial_activated_by: 'admin',
                        trial_expires_at: trialExpiresAt,
                    })

                if (profileError) throw profileError

                return NextResponse.json({
                    success: true,
                    userId,
                    message: `Usuário ${email} criado com sucesso.`,
                    trialExpiresAt,
                })
            }

            // ── GERAR LINK MÁGICO DE ACESSO (admin copia e envia pro usuário)
            case 'generate_magic_link': {
                const { email } = body
                if (!email) return NextResponse.json({ error: 'Email obrigatório.' }, { status: 400 })

                const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://agente-teste-pi.vercel.app'

                const { data, error } = await supabase.auth.admin.generateLink({
                    type: 'magiclink',
                    email,
                    options: {
                        redirectTo: `${siteUrl}/dashboard`,
                    }
                })

                if (error) throw error

                return NextResponse.json({
                    success: true,
                    magicLink: data.properties?.action_link,
                    email,
                    message: 'Link gerado! Copie e envie para o usuário acessar sem precisar de senha.',
                    expiresIn: '24 horas',
                })
            }

            // ── GERAR LINK DE REDEFINIÇÃO DE SENHA
            case 'reset_password_link': {
                const { email } = body
                if (!email) return NextResponse.json({ error: 'Email obrigatório.' }, { status: 400 })

                const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://agente-teste-pi.vercel.app'

                const { data, error } = await supabase.auth.admin.generateLink({
                    type: 'recovery',
                    email,
                    options: { redirectTo: `${siteUrl}/reset-password` }
                })

                if (error) throw error

                return NextResponse.json({
                    success: true,
                    resetLink: data.properties?.action_link,
                    email,
                    message: 'Link de redefinição de senha gerado.',
                })
            }

            default:
                return NextResponse.json({ error: `Ação desconhecida: ${action}` }, { status: 400 })
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro interno'
        console.error('[admin/users] Error:', message)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
