import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/utils/supabase/server'

// Service role client — bypassa RLS, pode atualizar qualquer perfil
function adminSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

// Verifica se o chamador é admin
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

// POST /api/admin/trials
// Body: { action: string, userId?: string }
export async function POST(request: NextRequest) {
    const admin = await verifyAdmin()
    if (!admin) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { action, userId } = body

    if (!action) {
        return NextResponse.json({ error: 'action é obrigatório' }, { status: 400 })
    }

    const supabase = adminSupabase()

    try {
        switch (action) {

            // ── BLOQUEAR individualmente: expira trial imediatamente
            case 'block': {
                if (!userId) return NextResponse.json({ error: 'userId obrigatório' }, { status: 400 })
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        plan: 'trial',
                        trial_expires_at: new Date(0).toISOString(),
                    })
                    .eq('id', userId)

                if (error) throw error
                return NextResponse.json({ success: true, message: 'Usuário bloqueado com sucesso.' })
            }

            // ── LIBERAR ACESSO PRO
            case 'grant': {
                if (!userId) return NextResponse.json({ error: 'userId obrigatório' }, { status: 400 })
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        plan: 'pro',
                        trial_expires_at: null,
                        trial_activated_at: null,
                    })
                    .eq('id', userId)

                if (error) throw error
                return NextResponse.json({ success: true, message: 'Acesso PRO liberado.' })
            }

            // ── EXCLUIR USUÁRIO
            case 'delete': {
                if (!userId) return NextResponse.json({ error: 'userId obrigatório' }, { status: 400 })
                const { error } = await supabase
                    .from('profiles')
                    .delete()
                    .eq('id', userId)

                if (error) throw error
                return NextResponse.json({ success: true, message: 'Usuário excluído.' })
            }

            // ── ATIVAR TRIAL individual (+72h a partir de agora)
            case 'activate': {
                if (!userId) return NextResponse.json({ error: 'userId obrigatório' }, { status: 400 })
                const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        plan: 'trial',
                        trial_expires_at: expiresAt,
                        trial_activated_at: new Date().toISOString(),
                        trial_activated_by: 'admin',
                    })
                    .eq('id', userId)

                if (error) throw error
                return NextResponse.json({ success: true, expires_at: expiresAt, message: 'Trial ativado por 72h.' })
            }

            // ── BLOQUEAR TODOS com trial_activated_at > 72h atrás
            //    (ativação mais antiga que 72h = deveria estar expirado)
            case 'block_all_overdue': {
                const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()

                const { error, count } = await supabase
                    .from('profiles')
                    .update({
                        plan: 'trial',
                        trial_expires_at: new Date(0).toISOString(),
                    })
                    .eq('plan', 'trial')
                    .not('role', 'in', '("admin","affiliate")')
                    .lt('trial_activated_at', cutoff)

                if (error) throw error
                return NextResponse.json({
                    success: true,
                    blocked: count ?? 0,
                    message: `Usuários com trial vencido foram bloqueados.`
                })
            }

            default:
                return NextResponse.json({ error: `Ação desconhecida: ${action}` }, { status: 400 })
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro interno'
        console.error('[admin/trials] Error:', message)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
