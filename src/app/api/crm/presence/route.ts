import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerClient } from "@/utils/supabase/server"
import { createClient } from "@supabase/supabase-js"

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createServerClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 })
        }

        const service = getServiceClient()

        // Check if lead exists for this user
        const { data: existing } = await service
            .from("crm_leads")
            .select("id")
            .eq("user_id", user.id)
            .single()

        if (existing) {
            // Update last_seen_at
            await service
                .from("crm_leads")
                .update({ last_seen_at: new Date().toISOString() })
                .eq("user_id", user.id)
        } else {
            // Auto-create lead record for this user if missing
            const name = user.user_metadata?.full_name
                || user.user_metadata?.name
                || user.email?.split("@")[0]
                || "Usuário"

            await service
                .from("crm_leads")
                .insert({
                    user_id: user.id,
                    full_name: name,
                    email: user.email,
                    phone: user.user_metadata?.phone || null,
                    source: "organic",
                    status: "new",
                    last_seen_at: new Date().toISOString(),
                })
        }

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error("[presence] Error:", err)
        return NextResponse.json({ success: false, error: err.message }, { status: 500 })
    }
}
