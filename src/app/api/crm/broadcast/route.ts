import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Service role client — bypasses RLS so admin can send to all leads
function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

export async function POST(req: NextRequest) {
    try {
        const supabase = getServiceClient()

        const { leadIds, channel, content } = await req.json() as {
            leadIds: string[]
            channel: "site_chat" | "whatsapp" | "email" | "whatsapp_official"
            content: string
        }

        if (!leadIds?.length || !channel || !content?.trim()) {
            return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 })
        }

        // ── WhatsApp Business Cloud via n8n ──────────────────────────────────
        if (channel === "whatsapp_official") {
            const { data: leads, error: leadsErr } = await supabase
                .from("crm_leads")
                .select("id, phone")
                .in("id", leadIds)

            if (leadsErr) return NextResponse.json({ error: leadsErr.message }, { status: 500 })

            const phoneNumbers = (leads ?? [])
                .filter(l => l.phone)
                .map(l => l.phone!)

            if (phoneNumbers.length === 0) {
                return NextResponse.json({ error: "Nenhum lead com telefone cadastrado", sent: 0, failed: leadIds.length }, { status: 422 })
            }

            const n8nRes = await fetch(N8N_WA_WEBHOOK, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phoneNumbers, message: content }),
            }).catch(() => null)

            const n8nData = n8nRes ? await n8nRes.json().catch(() => ({})) : {}
            const sent = n8nData.sent ?? phoneNumbers.length
            const failed = n8nData.failed ?? 0

            return NextResponse.json({ sent, failed, channel: "whatsapp_official", n8n: n8nData })
        }

        // ── Standard CRM channels (site_chat, whatsapp, email) ───────────────
        const results: { leadId: string; success: boolean; error?: string }[] = []

        for (const leadId of leadIds) {
            try {
                const { data: existing } = await supabase
                    .from("crm_conversations")
                    .select("id")
                    .eq("lead_id", leadId)
                    .eq("channel", channel)
                    .limit(1)
                    .maybeSingle()

                let conversationId: string

                if (existing) {
                    conversationId = existing.id
                } else {
                    const { data: created, error: createErr } = await supabase
                        .from("crm_conversations")
                        .insert({
                            lead_id: leadId,
                            channel,
                            status: "open",
                            last_message_at: new Date().toISOString(),
                        })
                        .select("id")
                        .single()

                    if (createErr || !created) throw createErr ?? new Error("Failed to create conversation")
                    conversationId = created.id
                }

                const { error: msgErr } = await supabase
                    .from("crm_messages")
                    .insert({
                        conversation_id: conversationId,
                        direction: "outbound",
                        content,
                        content_type: "text",
                    })

                if (msgErr) throw msgErr

                await supabase
                    .from("crm_conversations")
                    .update({ last_message_at: new Date().toISOString() })
                    .eq("id", conversationId)

                results.push({ leadId, success: true })
            } catch (err: any) {
                results.push({ leadId, success: false, error: err?.message })
            }
        }

        const sent = results.filter(r => r.success).length
        const failed = results.filter(r => !r.success).length
        return NextResponse.json({ sent, failed, results })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
