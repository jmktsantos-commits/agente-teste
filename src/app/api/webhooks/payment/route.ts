import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * POST /api/webhooks/payment
 *
 * Handles payment confirmation from Asaas, Kiwify or Hotmart.
 * On confirmation, creates a Supabase Auth user via invite email.
 *
 * Env vars required:
 *   WEBHOOK_SECRET          – token de autenticação do Asaas/Kiwify (campo "Token de autenticação")
 *   ASAAS_API_KEY           – chave de API do Asaas (para buscar dados do cliente)
 *   ASAAS_API_URL           – https://api.asaas.com/v3  (ou sandbox: https://sandbox.asaas.com/api/v3)
 *   NEXT_PUBLIC_SITE_URL    – https://agente-teste-three.vercel.app
 *   SUPABASE_SERVICE_ROLE_KEY – já configurado
 */

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? ""
const ASAAS_API_KEY = process.env.ASAAS_API_KEY ?? ""
const ASAAS_API_URL = process.env.ASAAS_API_URL ?? "https://api.asaas.com/v3"

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

// ── Asaas: busca email do cliente via API ──────────────────────────────────────
async function getAsaasCustomer(customerId: string): Promise<{ email: string; name: string } | null> {
    if (!ASAAS_API_KEY || !customerId) return null
    try {
        const res = await fetch(`${ASAAS_API_URL}/customers/${customerId}`, {
            headers: { access_token: ASAAS_API_KEY },
        })
        if (!res.ok) return null
        const data = await res.json()
        return { email: data.email, name: data.name ?? "Membro" }
    } catch {
        return null
    }
}

// ── Detecção de pagamento confirmado ──────────────────────────────────────────
function isPaymentConfirmed(body: any): boolean {
    const event: string = body?.event ?? body?.Event ?? body?.order_status ?? ""

    // Asaas events
    if (["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"].includes(event)) return true

    // Kiwify
    if (event === "paid" || body?.order_status === "paid") return true

    // Hotmart
    if (["PURCHASE_APPROVED", "PURCHASE_COMPLETE", "purchase.approved"].includes(event)) return true

    return false
}

// ── Extração do comprador ─────────────────────────────────────────────────────
async function extractBuyer(body: any): Promise<{ email: string; name: string } | null> {
    // ── Asaas format ──
    // { event: "PAYMENT_CONFIRMED", payment: { customer: "cus_xxx", ... } }
    if (body?.payment?.customer) {
        return await getAsaasCustomer(body.payment.customer)
    }

    // ── Kiwify format ──
    if (body?.Customer?.email) {
        return { email: body.Customer.email, name: body.Customer.full_name ?? body.Customer.name ?? "Membro" }
    }

    // ── Hotmart v2 ──
    if (body?.data?.buyer?.email) {
        return { email: body.data.buyer.email, name: body.data.buyer.name ?? "Membro" }
    }

    // ── Hotmart legacy ──
    if (body?.buyer?.email) {
        return { email: body.buyer.email, name: body.buyer.name ?? "Membro" }
    }

    return null
}

// ── Validação do token ────────────────────────────────────────────────────────
function isAuthorized(req: NextRequest, body: any): boolean {
    if (!WEBHOOK_SECRET) return true // no secret configured → allow all (dev mode)

    // Asaas: sends token in header "asaas-access-token" or query param "token"
    const asaasToken = req.headers.get("asaas-access-token") ?? req.nextUrl.searchParams.get("token")
    if (asaasToken === WEBHOOK_SECRET) return true

    // Kiwify: header "x-kiwify-token"
    const kiwifyToken = req.headers.get("x-kiwify-token")
    if (kiwifyToken === WEBHOOK_SECRET) return true

    // Hotmart: query param "hottok"
    const hottok = req.nextUrl.searchParams.get("hottok")
    if (hottok === WEBHOOK_SECRET) return true

    // Also check Authorization: Bearer <token>
    const authHeader = req.headers.get("authorization")
    if (authHeader === `Bearer ${WEBHOOK_SECRET}`) return true

    return false
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        console.log("[webhook] Received:", JSON.stringify(body).slice(0, 300))

        // Validate token
        if (!isAuthorized(req, body)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Only process confirmed payments
        if (!isPaymentConfirmed(body)) {
            console.log("[webhook] Skipped — event not a confirmed payment:", body?.event)
            return NextResponse.json({ ok: true, skipped: true, reason: "event not a confirmed payment" })
        }

        // Extract buyer info
        const buyer = await extractBuyer(body)
        if (!buyer?.email) {
            console.error("[webhook] Could not extract buyer email from payload")
            return NextResponse.json({ error: "Could not extract buyer info" }, { status: 400 })
        }

        const supabase = getServiceClient()

        // Check if user already exists
        const { data: existingUsers } = await supabase.auth.admin.listUsers()
        const already = existingUsers?.users?.find((u: { email?: string }) => u.email === buyer.email)

        if (already) {
            console.log(`[webhook] User already exists: ${buyer.email}`)
            return NextResponse.json({ ok: true, skipped: true, reason: "user already exists" })
        }

        // Send Supabase invite — user receives email with a secure link to set their password
        const { data: invite, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
            buyer.email,
            {
                data: { full_name: buyer.name, role: "user" },
                redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/reset-password`,
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

// Asaas verifica a URL com GET antes de salvar
export async function GET() {
    return NextResponse.json({ ok: true, service: "AviatorPro Payment Webhook v2 (Asaas)" })
}
