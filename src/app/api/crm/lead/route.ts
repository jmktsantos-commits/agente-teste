import { NextRequest, NextResponse } from "next/server"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()

        // Validate required fields
        if (!body.full_name?.trim()) {
            return NextResponse.json(
                { success: false, error: "Campo obrigatório: full_name" },
                { status: 400 }
            )
        }

        // Normalize lead data
        const lead = {
            full_name: String(body.full_name).trim(),
            email: body.email ? String(body.email).trim().toLowerCase() : null,
            phone: body.phone ? String(body.phone).replace(/\D/g, "") : null,
            status: ["new", "contacted", "interested", "converted", "lost"].includes(body.status)
                ? body.status
                : "new",
            source: ["organic", "ads", "referral", "manual", "import"].includes(body.source)
                ? body.source
                : "manual",
            notes: body.notes || null,
            tags: Array.isArray(body.tags) ? body.tags : body.tags ? [body.tags] : [],
        }

        // Insert directly into Supabase via REST API
        const response = await fetch(`${SUPABASE_URL}/rest/v1/crm_leads`, {
            method: "POST",
            headers: {
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
                "Content-Type": "application/json",
                "Prefer": "return=representation",
            },
            body: JSON.stringify(lead),
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error("[API /crm/lead] Supabase error:", errorData)

            // Handle unique constraint violation gracefully
            const errMsg = String(errorData.message || errorData.details || "")
            if (errMsg.includes("duplicate key value") || errMsg.includes("crm_leads_email_unique_idx")) {
                return NextResponse.json(
                    { success: false, error: "Este e-mail já está cadastrado no sistema." },
                    { status: 409 }
                )
            }

            return NextResponse.json(
                { success: false, error: errorData.message || errorData.details || `Erro ${response.status}` },
                { status: response.status }
            )
        }

        const data = await response.json()
        const createdLead = Array.isArray(data) ? data[0] : data

        // Also notify n8n asynchronously (fire-and-forget) for any automation workflows
        const n8nUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL
        if (n8nUrl) {
            fetch(`${n8nUrl}/crm-lead`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...lead, id: createdLead?.id }),
            }).catch(() => {
                // Ignore n8n errors - lead is already saved in Supabase
            })
        }

        return NextResponse.json({ success: true, lead: createdLead }, { status: 201 })
    } catch (err: any) {
        console.error("[API /crm/lead] Error:", err)
        return NextResponse.json(
            { success: false, error: err.message || "Erro interno ao criar lead" },
            { status: 500 }
        )
    }
}
