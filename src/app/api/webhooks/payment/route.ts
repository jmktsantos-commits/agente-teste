import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? ""
const ASAAS_API_KEY = process.env.ASAAS_API_KEY ?? ""
const ASAAS_API_URL = process.env.ASAAS_API_URL ?? ""

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

// ── Asaas: busca cliente nas URLs de sandbox e produção ───────────────────────
async function getAsaasCustomer(customerId: string): Promise<{ email: string; name: string } | null> {
    const urlsToTry = [
        ASAAS_API_URL,
        "https://sandbox.asaas.com/api/v3",
        "https://api.asaas.com/v3",
    ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i)

    for (const baseUrl of urlsToTry) {
        try {
            console.log(`[webhook] GET ${baseUrl}/customers/${customerId}`)
            const res = await fetch(`${baseUrl}/customers/${customerId}`, {
                headers: { "access_token": ASAAS_API_KEY, "Content-Type": "application/json" },
            })
            const text = await res.text()
            console.log(`[webhook] Asaas response ${res.status}: ${text.slice(0, 200)}`)
            if (res.ok) {
                const data = JSON.parse(text)
                if (data?.email) return { email: data.email, name: data.name ?? "Membro" }
            }
        } catch (e: any) {
            console.warn(`[webhook] Asaas fetch error at ${baseUrl}:`, e.message)
        }
    }
    return null
}

// ── Detecta pagamento confirmado ──────────────────────────────────────────────
function isPaymentConfirmed(body: any): boolean {
    const event: string = (body?.event ?? body?.Event ?? "").toString()
    if (["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"].includes(event)) return true
    if (body?.order_status === "paid" || event === "paid") return true
    if (["PURCHASE_APPROVED", "PURCHASE_COMPLETE", "purchase.approved"].includes(event)) return true
    return false
}

// ── Extrai e-mail do comprador ─────────────────────────────────────────────────
async function extractBuyer(body: any): Promise<{ email: string; name: string } | null> {
    // Asaas: { payment: { customer: "cus_xxx", customerEmail: "...", ... } }
    const payment = body?.payment ?? {}

    // Às vezes o Asaas sandbox inclui o email diretamente no objeto payment
    if (payment?.customerEmail) {
        console.log(`[webhook] Email direto do campo payment.customerEmail: ${payment.customerEmail}`)
        return { email: payment.customerEmail, name: payment.customerName ?? "Membro" }
    }

    // Tenta buscar via API usando customer ID
    if (payment?.customer) {
        console.log(`[webhook] Customer ID: ${payment.customer}`)
        if (!ASAAS_API_KEY) {
            console.error("[webhook] ASAAS_API_KEY está VAZIO — não é possível buscar o cliente")
            return null
        }
        return await getAsaasCustomer(payment.customer)
    }

    // Kiwify: { Customer: { email, full_name } }
    if (body?.Customer?.email) {
        return { email: body.Customer.email, name: body.Customer.full_name ?? "Membro" }
    }

    // Hotmart v2
    if (body?.data?.buyer?.email) {
        return { email: body.data.buyer.email, name: body.data.buyer.name ?? "Membro" }
    }

    console.error("[webhook] Não encontrei e-mail no payload. payment:", JSON.stringify(payment))
    return null
}

// ── Validação de token ────────────────────────────────────────────────────────
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
    return checks.some(v => v === WEBHOOK_SECRET)
}

// ── Handler principal ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    let body: any = {}
    try {
        body = await req.json()
        const event = body?.event ?? body?.order_status ?? "unknown"

        // Loga diagnóstico de ambiente e payload completo
        console.log(`[webhook] ===== NOVA CHAMADA =====`)
        console.log(`[webhook] Event: "${event}"`)
        console.log(`[webhook] ASAAS_API_KEY definido: ${!!ASAAS_API_KEY} (len=${ASAAS_API_KEY.length})`)
        console.log(`[webhook] ASAAS_API_URL: "${ASAAS_API_URL}"`)
        console.log(`[webhook] Payload completo: ${JSON.stringify(body).slice(0, 800)}`)

        if (!isAuthorized(req)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        if (!isPaymentConfirmed(body)) {
            console.log(`[webhook] Ignorado — não é confirmação de pagamento: "${event}"`)
            return NextResponse.json({ ok: true, skipped: true, reason: `event not a confirmed payment: ${event}` })
        }

        const buyer = await extractBuyer(body)
        if (!buyer?.email) {
            console.error("[webhook] Falha ao extrair email do comprador")
            return NextResponse.json({ error: "Could not extract buyer email" }, { status: 400 })
        }

        const supabase = getServiceClient()

        const { data: existingUsers } = await supabase.auth.admin.listUsers()
        const already = existingUsers?.users?.find((u: { email?: string }) => u.email === buyer.email)
        if (already) {
            console.log(`[webhook] Usuário já existe: ${buyer.email}`)
            return NextResponse.json({ ok: true, skipped: true, reason: "user already exists" })
        }

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://agente-teste-three.vercel.app"
        const { data: invite, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
            buyer.email,
            {
                data: { full_name: buyer.name, role: "user" },
                redirectTo: `${siteUrl}/reset-password`,
            }
        )
        if (inviteError) throw inviteError

        await supabase.from("profiles").upsert({
            id: invite.user.id,
            full_name: buyer.name,
            role: "user",
            created_at: new Date().toISOString(),
        })

        console.log(`[webhook] ✅ Convite enviado para: ${buyer.email}`)
        return NextResponse.json({ ok: true, email: buyer.email })

    } catch (err: any) {
        console.error("[webhook] Erro fatal:", err.message)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function GET() {
    return NextResponse.json({ ok: true, service: "AviatorPro Payment Webhook v4" })
}
