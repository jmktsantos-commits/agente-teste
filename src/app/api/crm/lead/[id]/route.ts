import { NextRequest, NextResponse } from "next/server"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id
        if (!id) {
            return NextResponse.json({ success: false, error: "ID obrigatório" }, { status: 400 })
        }

        const body = await req.json()

        // Only allow updating specific fields
        const allowedFields = ["status", "notes", "tags", "email", "phone", "full_name", "source"]
        const updates: Record<string, any> = {}
        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updates[field] = body[field]
            }
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ success: false, error: "Nenhum campo para atualizar" }, { status: 400 })
        }

        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/crm_leads?id=eq.${id}`,
            {
                method: "PATCH",
                headers: {
                    "apikey": SUPABASE_SERVICE_KEY,
                    "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
                    "Content-Type": "application/json",
                    "Prefer": "return=representation",
                },
                body: JSON.stringify(updates),
            }
        )

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            return NextResponse.json(
                { success: false, error: errorData.message || `Erro ${response.status}` },
                { status: response.status }
            )
        }

        const data = await response.json()
        return NextResponse.json({ success: true, lead: Array.isArray(data) ? data[0] : data })
    } catch (err: any) {
        console.error("[API /crm/lead/[id]] Error:", err)
        return NextResponse.json(
            { success: false, error: err.message || "Erro interno" },
            { status: 500 }
        )
    }
}
