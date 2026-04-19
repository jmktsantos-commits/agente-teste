import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/utils/supabase/server'

export async function GET() {
    try {
        // Verificar se é admin
        const supabaseServer = await createServerClient()
        const { data: { user } } = await supabaseServer.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { data: selfProfile } = await supabaseServer
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (selfProfile?.role !== 'admin') {
            return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })
        }

        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!url || !key) return NextResponse.json({ error: 'Configuração ausente' }, { status: 500 })

        const adminSupabase = createClient(url, key, {
            auth: { autoRefreshToken: false, persistSession: false }
        })

        // Buscar profiles sem trial ativo (candidatos a pendentes)
        const { data: profiles } = await adminSupabase
            .from('profiles')
            .select('id, email, full_name, plan, status, role, trial_expires_at, id_1para1, partner_ref, created_at')
            .is('trial_expires_at', null)
            .not('role', 'in', '("admin","affiliate")')
            .order('created_at', { ascending: false })
            .limit(200)

        if (!profiles || profiles.length === 0) {
            return NextResponse.json({ users: [] })
        }

        // Enriquecer com metadados do auth (phone, birth_date, etc.)
        const enriched = await Promise.all(
            profiles.map(async (profile) => {
                try {
                    const { data: authUser } = await adminSupabase.auth.admin.getUserById(profile.id)
                    const meta = authUser?.user?.user_metadata || {}
                    return {
                        ...profile,
                        phone: meta.phone || null,
                        birth_date: meta.birth_date || null,
                        first_name: meta.first_name || null,
                        last_name: meta.last_name || null,
                        id_1para1: meta.id_1para1 || profile.id_1para1 || null,
                        btag: meta.btag || profile.partner_ref || null,
                        last_sign_in: authUser?.user?.last_sign_in_at || null,
                    }
                } catch {
                    return { ...profile, phone: null, birth_date: null, first_name: null, last_name: null, btag: null, last_sign_in: null }
                }
            })
        )

        return NextResponse.json({ users: enriched })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro interno'
        console.error('[admin/pending-users]', message)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
