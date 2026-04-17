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

// ──────────────────────────────────────────────────────────────
// POST /api/admin/trials
// Body: { action: 'block' | 'grant' | 'delete' | 'activate', userId: string }
// ──────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
    const admin = await verifyAdmin()
    if (!admin) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const { action, userId } = await request.json()

    if (!action || !userId) {
        return NextResponse.json({ error: 'action e userId são obrigatórios' }, { status: 400 })
    }

    const supabase = adminSupabase()

    try {
        switch (action) {

            // ── BLOQUEAR: expira trial imediatamente (1970-01-01)
            case 'block': {
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        plan: 'trial',                          // garante plan=trial para o middleware pegar
                        trial_expires_at: new Date(0).toISOString(), // 1970 = expirado
                    })
                    .eq('id', userId)

                if (error) throw error
                return NextResponse.json({ success: true, message: 'Usuário bloqueado com sucesso.' })
            }

            // ── LIBERAR ACESSO PRO
            case 'grant': {
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
                const { error } = await supabase
                    .from('profiles')
                    .delete()
                    .eq('id', userId)

                if (error) throw error
                return NextResponse.json({ success: true, message: 'Usuário excluído.' })
            }

            // ── ATIVAR TRIAL (+72h a partir de agora)
            case 'activate': {
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

            default:
                return NextResponse.json({ error: `Ação desconhecida: ${action}` }, { status: 400 })
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro interno'
        console.error('[admin/trials] Error:', message)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
