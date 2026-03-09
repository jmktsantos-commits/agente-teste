import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Este endpoint é chamado pelo cron (Vercel Cron ou externo) com Bearer token
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const now = new Date()
    const results: { type: string; userId: string; status: string }[] = []

    try {
        // Buscar todos os usuários com plan = 'trial'
        const { data: trialUsers, error } = await supabase
            .from('profiles')
            .select('id, email, full_name, trial_expires_at, trial_activated_at')
            .eq('plan', 'trial')
            .not('trial_expires_at', 'is', null)

        if (error) throw error

        for (const user of (trialUsers || [])) {
            const expiresAt = new Date(user.trial_expires_at)
            const activatedAt = new Date(user.trial_activated_at)
            const hoursSinceActivation = (now.getTime() - activatedAt.getTime()) / (1000 * 60 * 60)
            const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)

            // Verificar quais notificações já foram enviadas para este usuário
            const { data: sentNotifs } = await supabase
                .from('trial_notifications')
                .select('notification_type')
                .eq('user_id', user.id)

            const sentTypes = new Set((sentNotifs || []).map((n: { notification_type: string }) => n.notification_type))

            let notifType: string | null = null
            let messageSubject = ''
            let messageBody = ''

            // T+36h: Meio do trial
            if (hoursSinceActivation >= 36 && !sentTypes.has('half_way') && hoursUntilExpiry > 0) {
                notifType = 'half_way'
                messageSubject = '⏰ Você está na metade do seu teste gratuito!'
                messageBody = `Olá ${user.full_name || 'usuário'}! Você já usou 36h do seu teste de 72h. Aproveite ao máximo! Seu acesso expira em ${Math.ceil(hoursUntilExpiry)}h.`
            }
            // T-1h: Falta 1 hora
            else if (hoursUntilExpiry <= 1 && hoursUntilExpiry > 0 && !sentTypes.has('one_hour_left')) {
                notifType = 'one_hour_left'
                messageSubject = '🚨 Seu teste gratuito expira em 1 hora!'
                messageBody = `${user.full_name || 'Usuário'}, seu acesso gratuito expira em menos de 1 hora. Ative seu plano agora para continuar recebendo as melhores previsões!`
            }
            // T+73-74h: Expirou
            else if (hoursUntilExpiry <= 0 && !sentTypes.has('expired') && hoursSinceActivation <= 74) {
                notifType = 'expired'
                messageSubject = '🔒 Seu teste gratuito expirou — Ative agora!'
                messageBody = `${user.full_name || 'Usuário'}, seu teste de 72h chegou ao fim. Ative seu plano hoje e ganhe acesso às previsões de hoje ainda! Clique aqui para ver os planos.`
            }
            // T+96h: Follow-up (1 dia após expirar)
            else if (hoursSinceActivation >= 96 && !sentTypes.has('48h_follow_up')) {
                notifType = '48h_follow_up'
                messageSubject = '📊 Perdendo as melhores previsões de hoje?'
                messageBody = `${user.full_name || 'Usuário'}, você testou nossa plataforma e agora está perdendo as previsões de hoje. Temos uma oferta especial para você ativar agora!`
            }
            // T+120h: Última chance (2 dias após expirar)
            else if (hoursSinceActivation >= 120 && !sentTypes.has('72h_follow_up')) {
                notifType = '72h_follow_up'
                messageSubject = '⚡ Última chance — Oferta especial por tempo limitado!'
                messageBody = `${user.full_name || 'Usuário'}, essa é nossa última mensagem. Temos uma oferta exclusiva de boas-vindas que expira em breve. Ative agora!`
            }

            if (notifType) {
                // Registrar notificação como enviada (mesmo em falha, para não repetir)
                await supabase.from('trial_notifications').insert({
                    user_id: user.id,
                    notification_type: notifType,
                    channel: 'email',
                    status: 'sent'
                })

                // Disparar webhook n8n com os dados para enviar o email/WhatsApp
                const webhookUrl = process.env.N8N_TRIAL_WEBHOOK_URL
                if (webhookUrl) {
                    await fetch(webhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            user_id: user.id,
                            email: user.email,
                            full_name: user.full_name,
                            notification_type: notifType,
                            subject: messageSubject,
                            body: messageBody,
                            trial_expires_at: user.trial_expires_at,
                            hours_since_activation: Math.round(hoursSinceActivation),
                        })
                    }).catch(err => console.error('[cron/trial] Webhook error:', err))
                }

                results.push({ type: notifType, userId: user.id, status: 'sent' })
            }
        }

        return NextResponse.json({
            success: true,
            processed: trialUsers?.length || 0,
            notifications_sent: results.length,
            results
        })
    } catch (err) {
        console.error('[cron/trial-notifications] Error:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
