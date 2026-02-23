import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

// POST /api/crm/popup — create a new popup
export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()
        const body = await req.json()

        const {
            type,
            content,
            image_url,
            link_url,
            title,
            target = "all",
            target_lead_ids,
            position = "bottom-right",
            scheduled_at,
        } = body

        if (type === "text" && !content?.trim()) {
            return NextResponse.json({ error: "Conteúdo obrigatório para pop-up de texto." }, { status: 400 })
        }
        if (type === "image" && !image_url?.trim()) {
            return NextResponse.json({ error: "URL da imagem obrigatória para pop-up de imagem." }, { status: 400 })
        }

        const isScheduled = scheduled_at && new Date(scheduled_at) > new Date()
        const status = isScheduled ? "scheduled" : "active"

        // Use RPC to bypass PostgREST schema cache (avoids 'position column not found' error)
        const { data, error } = await supabase.rpc("create_site_popup", {
            payload: {
                type,
                content: content?.trim() || null,
                image_url: image_url?.trim() || null,
                link_url: link_url?.trim() || null,
                title: title?.trim() || null,
                target,
                target_lead_ids: target === "specific" ? target_lead_ids : null,
                position: position || "bottom-right",
                status,
                scheduled_at: scheduled_at || null,
            }
        })

        if (error) throw error
        return NextResponse.json(data)
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

// GET /api/crm/popup — list popups. With ?activeOnly=true, returns only active ones (for site display)
export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient()
        const activeOnly = new URL(req.url).searchParams.get("activeOnly") === "true"

        // Auto-activate any scheduled popups whose time has passed
        await supabase
            .from("site_popups")
            .update({ status: "active" })
            .eq("status", "scheduled")
            .lte("scheduled_at", new Date().toISOString())

        let query = supabase
            .from("site_popups")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(100)

        if (activeOnly) {
            query = query.eq("status", "active")
        }

        const { data, error } = await query
        if (error) throw error
        return NextResponse.json(data)
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

// PATCH /api/crm/popup — update popup status
export async function PATCH(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { id, status } = await req.json()
        const { error } = await supabase
            .from("site_popups")
            .update({ status })
            .eq("id", id)
        if (error) throw error
        return NextResponse.json({ ok: true })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
