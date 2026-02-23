import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

export async function POST(req: NextRequest) {
    try {
        const { lead_id, channel = "site_chat" } = await req.json()

        if (!lead_id) {
            return NextResponse.json({ error: "lead_id required" }, { status: 400 })
        }

        const service = getServiceClient()

        // Check if conversation already exists
        const { data: existing } = await service
            .from("crm_conversations")
            .select("id")
            .eq("lead_id", lead_id)
            .eq("channel", channel)
            .single()

        if (existing) {
            return NextResponse.json({ conversation: existing })
        }

        // Create new conversation
        const { data, error } = await service
            .from("crm_conversations")
            .insert({
                lead_id,
                channel,
                status: "open",
                last_message_at: new Date().toISOString(),
            })
            .select()
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ conversation: data })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
