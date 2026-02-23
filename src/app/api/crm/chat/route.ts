import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

// GET /api/crm/chat?user_id=xxx  — get or create conversation + messages for a user
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const userId = searchParams.get("user_id")

        if (!userId) {
            return NextResponse.json({ error: "user_id required" }, { status: 400 })
        }

        const service = getServiceClient()

        // Get the user's email from profiles — needed for email-based lead matching
        const { data: profile } = await service
            .from("profiles")
            .select("email, full_name")
            .eq("id", userId)
            .maybeSingle()

        // Step 1: Find lead by email (covers ALL cases: affiliate-created and direct)
        // We prefer email matching so affiliate leads are always found first.
        let lead: { id: string } | null = null

        if (profile?.email) {
            // Priority 1: Find a lead that is ALREADY linked to this user_id
            const { data: linkedLead } = await service
                .from("crm_leads")
                .select("id, user_id, affiliate_id")
                .ilike("email", profile.email)
                .eq("user_id", userId)
                .maybeSingle()

            if (linkedLead) {
                lead = { id: linkedLead.id }
            } else {
                // Priority 2: Find the oldest UNLINKED lead (e.g. affiliate ghost lead)
                const { data: unlinkedLead } = await service
                    .from("crm_leads")
                    .select("id, user_id, affiliate_id")
                    .ilike("email", profile.email)
                    .is("user_id", null)
                    .order("created_at", { ascending: true })
                    .limit(1)
                    .maybeSingle()

                if (unlinkedLead) {
                    // Link user_id since it's the first time the user logged in
                    await service
                        .from("crm_leads")
                        .update({ user_id: userId })
                        .eq("id", unlinkedLead.id)
                    lead = { id: unlinkedLead.id }
                }
            }
        }

        // Step 2: Fall back to direct user_id match (if email match failed or profile is missing)
        if (!lead) {
            const { data: leadByUserId } = await service
                .from("crm_leads")
                .select("id")
                .eq("user_id", userId)
                .maybeSingle()
            lead = leadByUserId
        }

        // Step 3: Create new lead using UPSERT — ON CONFLICT prevents race condition duplicates
        if (!lead) {
            // INSERT ... ON CONFLICT DO NOTHING handles concurrent requests safely
            await service
                .from("crm_leads")
                .insert({
                    user_id: userId,
                    email: profile?.email || null,
                    full_name: profile?.full_name || "Visitante",
                    source: "site_chat",
                    status: "new",
                })
                .select("id")
            // The unique constraint on user_id means only the first insert wins

            // Now fetch whichever lead won (ours or the concurrent one)
            const { data: resolvedLead } = await service
                .from("crm_leads")
                .select("id")
                .eq("user_id", userId)
                .maybeSingle()
            lead = resolvedLead
        }

        if (!lead) {
            return NextResponse.json({ error: "Could not resolve lead" }, { status: 500 })
        }

        // Find or create site_chat conversation for this lead
        let { data: conv } = await service
            .from("crm_conversations")
            .select("id")
            .eq("lead_id", lead.id)
            .eq("channel", "site_chat")
            .maybeSingle()

        if (!conv) {
            const { data: newConv } = await service
                .from("crm_conversations")
                .insert({
                    lead_id: lead.id,
                    channel: "site_chat",
                    status: "open",
                    last_message_at: new Date().toISOString(),
                })
                .select("id")
                .single()
            conv = newConv
        }

        if (!conv) {
            return NextResponse.json({ error: "Could not create conversation" }, { status: 500 })
        }

        // Load messages
        const { data: messages } = await service
            .from("crm_messages")
            .select("*")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: true })

        return NextResponse.json({
            lead_id: lead.id,
            conversation_id: conv.id,
            messages: messages || [],
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

// POST /api/crm/chat — send a message as the lead (inbound)
export async function POST(req: NextRequest) {
    try {
        const { user_id, conversation_id, content } = await req.json()

        if (!user_id || !conversation_id || !content) {
            return NextResponse.json({ error: "user_id, conversation_id, content required" }, { status: 400 })
        }

        const service = getServiceClient()

        const { data: msg, error } = await service
            .from("crm_messages")
            .insert({
                conversation_id,
                direction: "inbound",
                content,
                content_type: "text",
            })
            .select()
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Update conversation timestamp
        await service
            .from("crm_conversations")
            .update({ last_message_at: new Date().toISOString() })
            .eq("id", conversation_id)

        return NextResponse.json({ message: msg })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
