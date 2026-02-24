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

        // Step 1: Obtain lead matching either the email OR the user_id
        let leadId: string | null = null

        if (profile?.email) {
            // Priority 1: Linked directly to this user
            const { data: linked } = await service
                .from("crm_leads")
                .select("id")
                .eq("user_id", userId)
                .maybeSingle()

            if (linked) {
                leadId = linked.id
            } else {
                // Priority 2: Check matching email that's UNLINKED (from affiliate)
                const { data: unlinked } = await service
                    .from("crm_leads")
                    .select("id, user_id")
                    .ilike("email", profile.email)
                    .is("user_id", null)
                    .order("created_at", { ascending: true })
                    .limit(1)
                    .maybeSingle()

                if (unlinked) {
                    await service.from("crm_leads").update({ user_id: userId }).eq("id", unlinked.id)
                    leadId = unlinked.id
                }
            }
        }

        // Priority 3: No email, but has user_id already
        if (!leadId) {
            const { data: directLink } = await service
                .from("crm_leads")
                .select("id")
                .eq("user_id", userId)
                .maybeSingle()
            if (directLink) leadId = directLink.id
        }

        // Last resort: create a new lead
        if (!leadId) {
            const { data: newLead } = await service
                .from("crm_leads")
                .insert({
                    user_id: userId,
                    email: profile?.email || null,
                    full_name: profile?.full_name || "Visitante",
                    source: "site_chat",
                    status: "new",
                })
                .select("id")
                .single()

            if (newLead) leadId = newLead.id
        }

        if (!leadId) {
            return NextResponse.json({ error: "Could not resolve lead" }, { status: 500 })
        }

        // Find or create site_chat conversation for this lead
        let { data: conv } = await service
            .from("crm_conversations")
            .select("id")
            .eq("lead_id", leadId)
            .eq("channel", "site_chat")
            .maybeSingle()

        if (!conv) {
            const { data: newConv } = await service
                .from("crm_conversations")
                .insert({
                    lead_id: leadId,
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
            lead_id: leadId,
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
