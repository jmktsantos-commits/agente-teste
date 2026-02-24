import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? ""
const ASAAS_API_KEY = process.env.ASAAS_API_KEY ?? ""

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

// ── Busca pagamento pelo ID (inclui email do cliente) ─────────────────────────
async function fetchPaymentFromAsaas(paymentId: string): Promise<{ email: string; name: string } | null> {
    const bases = [
        "https://sandbox.asaas.com/api/v3",
        "https://api.asaas.com/v3",
    ]
    if (process.env.ASAAS_API_URL) bases.unshift(process.env.ASAAS_API_URL)

    for (const base of [...new Set(bases)]) {
        try {
            // Busca o pagamento para ter o customer ID
            const res = await fetch(`${base}/payments/${paymentId}`, {
                headers: { "access_token": ASAAS_API_KEY },
            })
            const text = await res.text()
            console.log(`[webhook] payments/${paymentId} → ${res.status}: ${text.slice(0, 300)}`)
            if (!res.ok) continue

            const pay = JSON.parse(text)

            // Asaas às vezes inclui o email diretamente no pagamento
            if (pay.customer?.email) return { email: pay.customer.email, name: pay.customer.name ?? "Membro" }

            // Caso o campo customer seja apenas uma string com o ID
            if (pay.customer) {
                const cRes = await fetch(`${base}/customers/${pay.customer}`, {
                    headers: { "access_token": ASAAS_API_KEY },
                })
                if (cRes.ok) {
                    const cData = await cRes.json()
                    if (cData.email) return { email: cData.email, name: cData.name ?? "Membro" }
                }
            }
        } catch (e: any) {
            console.warn(`[webhook] Erro ao buscar ${base}/payments/${paymentId}:`, e.message)
        }
    }
    return null
}

// ── Detecta pagamento confirmado ──────────────────────────────────────────────
function isPaymentConfirmed(event: string): boolean {
    return ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PURCHASE_APPROVED", "PURCHASE_COMPLETE", "purchase.approved"].includes(event)
}

// ── Validação de token ─────────────────────────────────────────────────────────
function isAuthorized(req: NextRequest): boolean {
    if (!WEBHOOK_SECRET) return true
    const tokens = [
        req.headers.get("asaas-access-token"),
        req.headers.get("x-kiwify-token"),
        req.headers.get("x-webhook-token"),
        req.headers.get("authorization")?.replace("Bearer ", ""),
        req.nextUrl.searchParams.get("token"),
        req.nextUrl.searchParams.get("accessToken"),
    ]
    return tokens.some(t => t === WEBHOOK_SECRET)
}

// ── Handler principal ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    // Sempre retorna 200 para evitar penalizações do Asaas
    try {
        const body = await req.json()
        const event: string = body?.event ?? body?.Event ?? body?.order_status ?? "unknown"

        console.log(`[webhook] ===== EVENTO: "${event}" =====`)
        console.log(`[webhook] ASAAS_API_KEY definido: ${!!ASAAS_API_KEY} (len=${ASAAS_API_KEY.length})`)
        console.log(`[webhook] Payload: ${JSON.stringify(body).slice(0, 800)}`)

        if (!isAuthorized(req)) {
            console.error("[webhook] Token inválido")
            return NextResponse.json({ ok: true, skipped: true, reason: "unauthorized" })
        }

        if (!isPaymentConfirmed(event)) {
            console.log(`[webhook] Ignorado: "${event}" não é confirmação de pagamento`)
            return NextResponse.json({ ok: true, skipped: true, reason: `not a payment: ${event}` })
        }

        // Extrai buyer
        let buyer: { email: string; name: string } | null = null

        // Asaas: tenta pelo payment ID
        const paymentId: string | undefined = body?.payment?.id
        if (paymentId && ASAAS_API_KEY) {
            console.log(`[webhook] Buscando payment ${paymentId} via Asaas API`)
            buyer = await fetchPaymentFromAsaas(paymentId)
        }

        // Fallback: customerEmail no payload
        if (!buyer && body?.payment?.customerEmail) {
            buyer = { email: body.payment.customerEmail, name: body.payment.customerName ?? "Membro" }
        }

        // Fallback: Kiwify
        if (!buyer && body?.Customer?.email) {
            buyer = { email: body.Customer.email, name: body.Customer.full_name ?? "Membro" }
        }

        // Fallback: Hotmart
        if (!buyer && body?.data?.buyer?.email) {
            buyer = { email: body.data.buyer.email, name: body.data.buyer.name ?? "Membro" }
        }

        if (!buyer?.email) {
            console.error(`[webhook] Não foi possível extrair email. ASAAS_API_KEY=${!!ASAAS_API_KEY}, paymentId=${paymentId}`)
            // Retorna 200 mesmo assim para não gerar penalização no Asaas
            return NextResponse.json({ ok: true, skipped: true, reason: "could not extract email — check ASAAS_API_KEY env var" })
        }

        const supabase = getServiceClient()
        const { data: existingUsers } = await supabase.auth.admin.listUsers()
        const already = existingUsers?.users?.find((u: { email?: string }) => u.email === buyer!.email)
        if (already) {
            console.log(`[webhook] Usuário já existe: ${buyer.email}`)
            return NextResponse.json({ ok: true, skipped: true, reason: "user already exists" })
        }

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://agente-teste-three.vercel.app"
        const { data: invite, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(buyer.email, {
            data: { full_name: buyer.name, role: "user" },
            redirectTo: `${siteUrl}/reset-password`,
        })
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
        // Retorna 200 para não penalizar no Asaas
        return NextResponse.json({ ok: true, skipped: true, reason: `internal error: ${err.message}` })
    }
}

export async function GET() {
    return NextResponse.json({ ok: true, service: "AviatorPro Payment Webhook v5" })
}
