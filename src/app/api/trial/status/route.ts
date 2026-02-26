import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('plan, trial_expires_at, trial_activated_at, partner_ref')
            .eq('id', user.id)
            .single()

        if (error || !profile) {
            return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
        }

        const now = new Date()
        const expiresAt = profile.trial_expires_at ? new Date(profile.trial_expires_at) : null
        const isTrialActive = profile.plan === 'trial' && expiresAt !== null && expiresAt > now
        const isTrialExpired = profile.plan === 'trial' && expiresAt !== null && expiresAt <= now

        const hoursRemaining = isTrialActive && expiresAt
            ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)))
            : 0

        const minutesRemaining = isTrialActive && expiresAt
            ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60)))
            : 0

        return NextResponse.json({
            plan: profile.plan,
            trial_active: isTrialActive,
            trial_expired: isTrialExpired,
            expires_at: profile.trial_expires_at,
            activated_at: profile.trial_activated_at,
            partner_ref: profile.partner_ref,
            hours_remaining: hoursRemaining,
            minutes_remaining: minutesRemaining,
        })
    } catch (err) {
        console.error('[trial/status] Unexpected error:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
