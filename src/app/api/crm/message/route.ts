import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

// POST /api/crm/message — admin sends a message to a lead (outbound)
export async function POST(req: NextRequest) {
    try {
        const { conversation_id, content } = await req.json()

        if (!conversation_id || !content?.trim()) {
            return NextResponse.json({ error: "conversation_id and content are required" }, { status: 400 })
        }

        const service = getServiceClient()

        // Insert outbound message
        const { data: msg, error } = await service
            .from("crm_messages")
            .insert({
                conversation_id,
                direction: "outbound",
                content: content.trim(),
                content_type: "text",
            })
            .select()
            .single()

        if (error) throw error

        // Update conversation timestamp
        await service
            .from("crm_conversations")
            .update({ last_message_at: new Date().toISOString() })
            .eq("id", conversation_id)

        // Broadcast to the lead's Realtime channel
        // Using service client with admin privileges to push the broadcast
        const channel = service.channel(`lead_chat_msgs:${conversation_id}`)

        // Need to subscribe before sending broadcast
        await new Promise<void>((resolve) => {
            channel.subscribe((status) => {
                if (status === "SUBSCRIBED") resolve()
            })
        })

        await channel.send({
            type: "broadcast",
            event: "new_message",
            payload: { message: msg },
        })

        service.removeChannel(channel)

        return NextResponse.json({ message: msg })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
