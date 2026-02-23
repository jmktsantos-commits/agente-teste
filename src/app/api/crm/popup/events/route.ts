import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

// POST /api/crm/popup/events — record a view or click event
export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { popup_id, event_type } = await req.json()

        if (!popup_id || !event_type) {
            return NextResponse.json({ error: "popup_id and event_type required" }, { status: 400 })
        }

        const userAgent = req.headers.get("user-agent") || null

        await supabase.from("popup_events").insert({ popup_id, event_type, user_agent: userAgent })

        return NextResponse.json({ ok: true })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

// GET /api/crm/popup/events — aggregate stats per popup
export async function GET() {
    try {
        const supabase = await createClient()

        // Get all popups with their event counts
        const { data: popups, error: popupsError } = await supabase
            .from("site_popups")
            .select("id, type, title, content, image_url, position, status, created_at")
            .order("created_at", { ascending: false })
            .limit(50)

        if (popupsError) throw popupsError

        // Get aggregated event counts
        const { data: events, error: eventsError } = await supabase
            .from("popup_events")
            .select("popup_id, event_type")

        if (eventsError) throw eventsError

        // Aggregate in JS
        const statsMap: Record<string, { views: number; clicks: number }> = {}
        for (const e of events || []) {
            if (!statsMap[e.popup_id]) statsMap[e.popup_id] = { views: 0, clicks: 0 }
            if (e.event_type === "view") statsMap[e.popup_id].views++
            if (e.event_type === "click") statsMap[e.popup_id].clicks++
        }

        const result = (popups || []).map(p => ({
            ...p,
            views: statsMap[p.id]?.views ?? 0,
            clicks: statsMap[p.id]?.clicks ?? 0,
            ctr: statsMap[p.id]?.views
                ? Math.round((statsMap[p.id].clicks / statsMap[p.id].views) * 100)
                : 0,
        }))

        return NextResponse.json(result)
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
