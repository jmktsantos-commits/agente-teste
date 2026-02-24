import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * POST /api/webhooks/payment
 *
 * Handles payment confirmation from Asaas, Kiwify or Hotmart.
 * On confirmation, creates a Supabase Auth user via invite email.
 *
 * Env vars:
 *   WEBHOOK_SECRET          – token de autenticação do webhook Asaas/Kiwify
 *   ASAAS_API_KEY           – chave de API do Asaas
 *   ASAAS_API_URL           – https://api.asaas.com/v3  (ou sandbox: https://sandbox.asaas.com/api/v3)
 *   NEXT_PUBLIC_SITE_URL    – https://agente-teste-three.vercel.app
 */

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? ""
const ASAAS_API_KEY = process.env.ASAAS_API_KEY ?? ""
// Try configured URL, then try both environments automatically
const ASAAS_API_URL = process.env.ASAAS_API_URL ?? ""

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

// ── Asaas: fetch customer email (tries configured URL then both envs) ──────────
async function getAsaasCustomer(customerId: string): Promise<{ email: string; name: string } | null> {
    if (!ASAAS_API_KEY || !customerId) {
        console.error("[webhook] ASAAS_API_KEY not set or no customerId")
        return null
    }

    // Build list of URLs to try
    const urlsToTry = [
        ASAAS_API_URL,
        "https://sandbox.asaas.com/api/v3",
        "https://api.asaas.com/v3",
    ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i) // deduplicate

    for (const baseUrl of urlsToTry) {
        try {
            console.log(`[webhook] Trying Asaas customer at ${baseUrl}/customers/${customerId}`)
            const res = await fetch(`${baseUrl}/customers/${customerId}`, {
                headers: {
                    "access_token": ASAAS_API_KEY,
                    "Content-Type": "application/json",
                },
            })
            if (res.ok) {
                const data = await res.json()
                if (data?.email) {
                    console.log(`[webhook] Found customer at ${baseUrl}: ${data.email}`)
                    return { email: data.email, name: data.name ?? "Membro" }
                }
            } else {
                console.warn(`[webhook] Asaas ${baseUrl} returned ${res.status}`)
            }
        } catch (e: any) {
            console.warn(`[webhook] Asaas fetch failed at ${baseUrl}:`, e.message)
        }
    }
    return null
}

// ── Is this a confirmed payment event? ───────────────────────────────────────
function isPaymentConfirmed(body: any): boolean {
    const event: string = (body?.event ?? body?.Event ?? "").toString()
    if (["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"].includes(event)) return true
    if (body?.order_status === "paid" || event === "paid") return true
    if (["PURCHASE_APPROVED", "PURCHASE_COMPLETE", "purchase.approved"].includes(event)) return true
    return false
}

// ── Extract buyer from payload ────────────────────────────────────────────────
async function extractBuyer(body: any): Promise<{ email: string; name: string } | null> {
    // Asaas: { event: "PAYMENT_CONFIRMED", payment: { customer: "cus_xxx" } }
    const customerId = body?.payment?.customer
    if (customerId) {
        console.log(`[webhook] Asaas customer ID: ${customerId}`)
        return await getAsaasCustomer(customerId)
    }

    // Kiwify: { Customer: { email, full_name } }
    if (body?.Customer?.email) {
        return { email: body.Customer.email, name: body.Customer.full_name ?? body.Customer.name ?? "Membro" }
    }

    // Hotmart v2: { data: { buyer: { email, name } } }
    if (body?.data?.buyer?.email) {
        return { email: body.data.buyer.email, name: body.data.buyer.name ?? "Membro" }
    }

    // Hotmart legacy: { buyer: { email, name } }
    if (body?.buyer?.email) {
        return { email: body.buyer.email, name: body.buyer.name ?? "Membro" }
    }

    console.error("[webhook] Could not determine buyer from body:", JSON.stringify(body).slice(0, 400))
    return null
}

// ── Token validation (permissive — allows if no secret set) ─────────────────
function isAuthorized(req: NextRequest): boolean {
    if (!WEBHOOK_SECRET) return true

    const checks = [
        req.headers.get("asaas-access-token"),
        req.headers.get("x-kiwify-token"),
        req.headers.get("x-webhook-token"),
        req.headers.get("authorization")?.replace("Bearer ", ""),
        req.nextUrl.searchParams.get("token"),
        req.nextUrl.searchParams.get("hottok"),
        req.nextUrl.searchParams.get("accessToken"),
    ]

    const ok = checks.some(v => v === WEBHOOK_SECRET)
    if (!ok) console.warn("[webhook] Authorization failed. Received tokens:", checks.filter(Boolean))
    return ok
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    let body: any = {}
    try {
        body = await req.json()
        const event = body?.event ?? body?.order_status ?? "unknown"
        console.log(`[webhook] Received event: "${event}" | payload: ${JSON.stringify(body).slice(0, 500)}`)

        if (!isAuthorized(req)) {
            console.error("[webhook] Unauthorized request")
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        if (!isPaymentConfirmed(body)) {
            console.log(`[webhook] Skipped — not a payment confirmation: "${event}"`)
            return NextResponse.json({ ok: true, skipped: true, reason: "event not a confirmed payment" })
        }

        const buyer = await extractBuyer(body)
        if (!buyer?.email) {
            return NextResponse.json({ error: "Could not extract buyer email" }, { status: 400 })
        }

        const supabase = getServiceClient()

        // Check if already exists
        const { data: existingUsers } = await supabase.auth.admin.listUsers()
        const already = existingUsers?.users?.find((u: { email?: string }) => u.email === buyer.email)
        if (already) {
            console.log(`[webhook] User already exists: ${buyer.email}`)
            return NextResponse.json({ ok: true, skipped: true, reason: "user already exists" })
        }

        // Send invite
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://agente-teste-three.vercel.app"
        const { data: invite, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
            buyer.email,
            {
                data: { full_name: buyer.name, role: "user" },
                redirectTo: `${siteUrl}/reset-password`,
            }
        )
        if (inviteError) {
            console.error("[webhook] Supabase invite error:", inviteError.message)
            throw inviteError
        }

        // Upsert profile
        await supabase.from("profiles").upsert({
            id: invite.user.id,
            full_name: buyer.name,
            role: "user",
            created_at: new Date().toISOString(),
        })

        console.log(`[webhook] ✅ Invite sent to: ${buyer.email}`)
        return NextResponse.json({ ok: true, email: buyer.email })

    } catch (err: any) {
        console.error("[webhook] Fatal error:", err.message)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

// Asaas verifica o endpoint com GET ao salvar o webhook
export async function GET() {
    return NextResponse.json({ ok: true, service: "AviatorPro Payment Webhook v3" })
}
