import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const body = await request.json().catch(() => ({}))
        const partnerRef = body.partner_ref || request.nextUrl.searchParams.get('ref') || null

        // Chamar a função do banco para ativar o trial
        const { data, error } = await supabase.rpc('activate_trial', {
            p_user_id: user.id,
            p_partner_ref: partnerRef,
            p_activated_by: 'auto'
        })

        if (error) {
            console.error('[trial/activate] DB error:', error)
            return NextResponse.json({ error: 'Erro ao ativar trial' }, { status: 500 })
        }

        if (!data.success) {
            return NextResponse.json({ error: data.error, details: data }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            expires_at: data.expires_at,
            hours: 24,
            message: 'Trial de 24h ativado com sucesso!'
        })
    } catch (err) {
        console.error('[trial/activate] Unexpected error:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
