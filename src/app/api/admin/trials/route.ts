import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/utils/supabase/server'

// Service role client — bypassa RLS, pode atualizar qualquer perfil
function adminSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurado no servidor. Acesse as variáveis de ambiente no Railway/Vercel.')
    }

    return createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false }
    })
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

            // ── BLOQUEAR: expira trial + invalida sessão JWT imediatamente
            case 'block': {
                if (!userId) return NextResponse.json({ error: 'userId obrigatório' }, { status: 400 })

                // 1. Marcar trial como expirado no banco
                const { error: dbError } = await supabase
                    .from('profiles')
                    .update({
                        plan: 'trial',
                        trial_expires_at: new Date(0).toISOString(),
                    })
                    .eq('id', userId)

                if (dbError) throw dbError

                // 2. INVALIDAR SESSÃO: revoga todos os tokens JWT do usuário
                //    Isso expulsa ele imediatamente, mesmo que esteja navegando agora
                const { error: signOutError } = await supabase.auth.admin.signOut(userId, 'global')
                if (signOutError) {
                    console.warn('[admin/trials] Aviso: não foi possível invalidar sessão:', signOutError.message)
                    // Não lançar erro — o bloqueio no banco é suficiente para próximas visitas
                }

                return NextResponse.json({ success: true, message: 'Usuário bloqueado e sessão encerrada.' })
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

                // 1. Invalidar sessão antes de deletar
                await supabase.auth.admin.signOut(userId, 'global').catch(() => {})

                // 2. Deletar perfil
                const { error } = await supabase
                    .from('profiles')
                    .delete()
                    .eq('id', userId)

                if (error) throw error
                return NextResponse.json({ success: true, message: 'Usuário excluído.' })
            }

            // ── APROVAR USUÁRIO PENDENTE (status pending → active + trial 7 dias)
            case 'approve_user': {
                if (!userId) return NextResponse.json({ error: 'userId obrigatório' }, { status: 400 })

                const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        status: 'active',
                        plan: 'trial',
                        trial_expires_at: expiresAt,
                        trial_activated_at: new Date().toISOString(),
                        trial_activated_by: 'admin',
                    })
                    .eq('id', userId)

                if (error) throw error
                return NextResponse.json({
                    success: true,
                    expires_at: expiresAt,
                    message: 'Usuário aprovado. Trial de 7 dias ativado.'
                })
            }

            // ── ATIVAR TRIAL individual (+7 dias a partir de agora)
            case 'activate': {
                if (!userId) return NextResponse.json({ error: 'userId obrigatório' }, { status: 400 })
                const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
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
                return NextResponse.json({ success: true, expires_at: expiresAt, message: 'Trial ativado por 7 dias.' })
            }

            // ── FORÇAR LOGOUT SEM BLOQUEAR (apenas encerrar sessão)
            case 'force_logout': {
                if (!userId) return NextResponse.json({ error: 'userId obrigatório' }, { status: 400 })

                // Valida UUID antes de chamar admin.signOut
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
                if (!uuidRegex.test(userId)) {
                    return NextResponse.json({ error: `userId inválido: "${userId}" não é um UUID válido.` }, { status: 400 })
                }

                const { error } = await supabase.auth.admin.signOut(userId, 'global')

                if (error) {
                    // JWT/token inválido significa que o usuário já não tem sessão ativa
                    if (error.message.includes('invalid JWT') || error.message.includes('malformed')) {
                        return NextResponse.json({
                            success: true,
                            message: 'Usuário já sem sessão ativa (JWT inválido/expirado).',
                            detail: error.message
                        })
                    }
                    throw error
                }

                return NextResponse.json({ success: true, message: 'Sessão do usuário encerrada.' })
            }

            // ── BLOQUEAR TODOS com trial_activated_at > 7 dias atrás
            case 'block_all_overdue': {
                const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

                // Buscar IDs dos afetados para invalidar sessões
                const { data: affected } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('plan', 'trial')
                    .not('role', 'in', '("admin","affiliate")')
                    .lt('trial_activated_at', cutoff)

                // Bloquear no banco
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        plan: 'trial',
                        trial_expires_at: new Date(0).toISOString(),
                    })
                    .eq('plan', 'trial')
                    .not('role', 'in', '("admin","affiliate")')
                    .lt('trial_activated_at', cutoff)

                if (error) throw error

                // Invalidar sessões de todos
                const signOutResults = await Promise.allSettled(
                    (affected || []).map(u => supabase.auth.admin.signOut(u.id, 'global'))
                )
                const sessionsInvalidated = signOutResults.filter(r => r.status === 'fulfilled').length

                return NextResponse.json({
                    success: true,
                    blocked: affected?.length ?? 0,
                    sessionsInvalidated,
                    message: `${affected?.length ?? 0} usuários bloqueados e ${sessionsInvalidated} sessões encerradas.`
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
