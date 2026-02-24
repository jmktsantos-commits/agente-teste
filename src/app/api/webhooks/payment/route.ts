import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

/**
 * POST /api/webhooks/payment
 *
 * Receives payment confirmation from Kiwify or Hotmart.
 * On confirmation, creates a Supabase Auth user and sends an invite email.
 *
 * Env vars required:
 *   WEBHOOK_SECRET     – secret token sent by Kiwify/Hotmart to validate the request
 *   SUPABASE_SERVICE_ROLE_KEY – already configured
 *
 * Kiwify webhook setup:
 *   Dashboard → Integrações → Webhooks → add URL: https://your-domain.com/api/webhooks/payment
 *   Set the secret token to match WEBHOOK_SECRET
 *
 * Hotmart webhook setup:
 *   Ferramentas → Webhooks → add URL: https://your-domain.com/api/webhooks/payment
 *   The secret (hottok) must match WEBHOOK_SECRET
 */

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? ""

// ── Helpers ───────────────────────────────────────────────────────────────────

function validateKiwify(req: NextRequest): boolean {
    const token = req.headers.get("x-kiwify-token") ?? req.nextUrl.searchParams.get("token")
    return !WEBHOOK_SECRET || token === WEBHOOK_SECRET
}

function validateHotmart(req: NextRequest): boolean {
    const hottok = req.nextUrl.searchParams.get("hottok")
    return !WEBHOOK_SECRET || hottok === WEBHOOK_SECRET
}

/** Extract buyer email + name from Kiwify or Hotmart payload */
function extractBuyer(body: any): { email: string; name: string } | null {
    // Kiwify format
    if (body?.Customer?.email) {
        return {
            email: body.Customer.email,
            name: body.Customer.full_name ?? body.Customer.name ?? "Membro",
        }
    }

    // Hotmart format (v2)
    if (body?.data?.buyer?.email) {
        return {
            email: body.data.buyer.email,
            name: body.data.buyer.name ?? "Membro",
        }
    }

    // Hotmart legacy format
    if (body?.buyer?.email) {
        return {
            email: body.buyer.email,
            name: body.buyer.name ?? "Membro",
        }
    }

    return null
}

/** Returns true if the event represents a confirmed/approved payment */
function isPaymentConfirmed(body: any): boolean {
    // Kiwify: order_status = "paid"
    if (body?.order_status === "paid") return true

    // Hotmart v2: event = "PURCHASE_APPROVED" or "PURCHASE_COMPLETE"
    const event: string = body?.event ?? body?.Event ?? ""
    if (["PURCHASE_APPROVED", "PURCHASE_COMPLETE", "purchase.approved"].includes(event)) return true

    return false
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()

        // Detect provider and validate secret
        const isKiwify = !!body?.Customer?.email || !!body?.order_status
        const isHotmart = !!body?.data?.buyer || !!body?.buyer

        if (isKiwify && !validateKiwify(req)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        if (isHotmart && !validateHotmart(req)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Only process confirmed payments
        if (!isPaymentConfirmed(body)) {
            return NextResponse.json({ ok: true, skipped: true, reason: "event not a confirmed payment" })
        }

        // Extract buyer info
        const buyer = extractBuyer(body)
        if (!buyer) {
            return NextResponse.json({ error: "Could not extract buyer info from payload" }, { status: 400 })
        }

        const supabase = createServiceClient()

        // Check if user already exists
        const { data: existingUsers } = await supabase.auth.admin.listUsers()
        const already = existingUsers?.users?.find((u: { email?: string }) => u.email === buyer.email)

        if (already) {
            // User already has an account — skip but return success
            console.log(`[webhook] User already exists: ${buyer.email}`)
            return NextResponse.json({ ok: true, skipped: true, reason: "user already exists" })
        }

        // Send invite email — Supabase sends a "confirm your account" link
        // The user clicks the link and is redirected to /reset-password to set their password
        const { data: invite, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
            buyer.email,
            {
                data: {
                    full_name: buyer.name,
                    role: "user",
                },
                redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
            }
        )

        if (inviteError) throw inviteError

        // Create profile row
        await supabase.from("profiles").upsert({
            id: invite.user.id,
            full_name: buyer.name,
            role: "user",
            created_at: new Date().toISOString(),
        })

        console.log(`[webhook] ✅ Invite sent to: ${buyer.email}`)

        return NextResponse.json({ ok: true, email: buyer.email })
    } catch (err: any) {
        console.error("[webhook] Error:", err.message)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

// Allow GET for webhook verification (Hotmart pings the URL to verify it)
export async function GET() {
    return NextResponse.json({ ok: true, service: "AviatorPro Payment Webhook" })
}
