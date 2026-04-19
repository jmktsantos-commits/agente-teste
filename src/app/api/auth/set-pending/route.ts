import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Rota chamada logo após o cadastro para garantir status = 'pending'
// e last_seen = null — independente do que o trigger fizer
export async function POST(request: NextRequest) {
    try {
        const { userId, id1para1 } = await request.json()
        if (!userId) return NextResponse.json({ error: 'userId obrigatório' }, { status: 400 })

        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!url || !key) return NextResponse.json({ error: 'Configuração ausente' }, { status: 500 })

        const supabase = createClient(url, key, {
            auth: { autoRefreshToken: false, persistSession: false }
        })

        // Aguarda até o profile existir (trigger pode demorar ms)
        let profile = null
        for (let i = 0; i < 5; i++) {
            const { data } = await supabase
                .from('profiles')
                .select('id, status')
                .eq('id', userId)
                .single()
            if (data) { profile = data; break }
            await new Promise(r => setTimeout(r, 300))
        }

        // Força status=pending, last_seen=null, e salva o ID 1PARA1
        const updateData: Record<string, unknown> = {
            status: 'pending',
            last_seen: null,
            plan: 'trial',
        }
        if (id1para1) updateData['id_1para1'] = id1para1

        const { error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', userId)

        if (error) throw error

        return NextResponse.json({ success: true, wasStatus: profile?.status })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro interno'
        console.error('[auth/set-pending]', message)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
