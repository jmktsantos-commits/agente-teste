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

interface BuyerInfo {
    email: string
    name: string
    phone?: string
    planName?: string
    planValue?: number
}

// ── Determina nome do plano pelo valor do pagamento ────────────────────────────
function getPlanName(value?: number): string {
    if (!value) return "Assinatura"
    if (value <= 150) return "Plano Mensal"
    if (value <= 800) return "Plano Anual"
    return `Plano (R$${value})`
}

// ── Busca pagamento pelo ID (inclui email, telefone e plano do cliente) ────────
async function fetchPaymentFromAsaas(paymentId: string): Promise<BuyerInfo | null> {
    const bases = [
        "https://sandbox.asaas.com/api/v3",
        "https://api.asaas.com/v3",
    ]
    if (process.env.ASAAS_API_URL) bases.unshift(process.env.ASAAS_API_URL)

    for (const base of [...new Set(bases)]) {
        try {
            const res = await fetch(`${base}/payments/${paymentId}`, {
                headers: { "access_token": ASAAS_API_KEY },
            })
            const text = await res.text()
            console.log(`[webhook] payments/${paymentId} → ${res.status}: ${text.slice(0, 400)}`)
            if (!res.ok) continue

            const pay = JSON.parse(text)
            const planValue: number | undefined = pay.value
            const planName = getPlanName(planValue)

            // Asaas às vezes inclui o email diretamente no pagamento (customer expandido)
            if (pay.customer?.email) {
                return {
                    email: pay.customer.email,
                    name: pay.customer.name ?? "Membro",
                    phone: pay.customer.mobilePhone ?? pay.customer.phone ?? undefined,
                    planName,
                    planValue,
                }
            }

            // Caso o campo customer seja apenas uma string com o ID → busca cliente
            if (pay.customer) {
                const cRes = await fetch(`${base}/customers/${pay.customer}`, {
                    headers: { "access_token": ASAAS_API_KEY },
                })
                if (cRes.ok) {
                    const cData = await cRes.json()
                    if (cData.email) {
                        return {
                            email: cData.email,
                            name: cData.name ?? "Membro",
                            phone: cData.mobilePhone ?? cData.phone ?? undefined,
                            planName,
                            planValue,
                        }
                    }
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
        let buyer: BuyerInfo | null = null

        // Asaas: tenta pelo payment ID
        const paymentId: string | undefined = body?.payment?.id
        if (paymentId && ASAAS_API_KEY) {
            console.log(`[webhook] Buscando payment ${paymentId} via Asaas API`)
            buyer = await fetchPaymentFromAsaas(paymentId)
        }

        // Fallback: customerEmail no payload
        if (!buyer && body?.payment?.customerEmail) {
            buyer = {
                email: body.payment.customerEmail,
                name: body.payment.customerName ?? "Membro",
                phone: body.payment.customerPhone ?? undefined,
                planName: getPlanName(body.payment.value),
                planValue: body.payment.value,
            }
        }

        // Fallback: Kiwify
        if (!buyer && body?.Customer?.email) {
            buyer = {
                email: body.Customer.email,
                name: body.Customer.full_name ?? "Membro",
                phone: body.Customer.phone ?? undefined,
                planName: body.Product?.name ?? "Assinatura",
            }
        }

        // Fallback: Hotmart
        if (!buyer && body?.data?.buyer?.email) {
            buyer = {
                email: body.data.buyer.email,
                name: body.data.buyer.name ?? "Membro",
                phone: body.data.buyer.phone ?? undefined,
                planName: body.data?.product?.name ?? "Assinatura",
            }
        }

        if (!buyer?.email) {
            console.error(`[webhook] Não foi possível extrair email. ASAAS_API_KEY=${!!ASAAS_API_KEY}, paymentId=${paymentId}`)
            return NextResponse.json({ ok: true, skipped: true, reason: "could not extract email — check ASAAS_API_KEY env var" })
        }

        console.log(`[webhook] Comprador: ${buyer.email} | Telefone: ${buyer.phone ?? "N/A"} | Plano: ${buyer.planName ?? "N/A"}`)

        const supabase = getServiceClient()
        const { data: existingUsers } = await supabase.auth.admin.listUsers()
        const already = existingUsers?.users?.find((u: { email?: string }) => u.email === buyer!.email)
        if (already) {
            console.log(`[webhook] Usuário já existe: ${buyer.email}`)
            return NextResponse.json({ ok: true, skipped: true, reason: "user already exists" })
        }

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://agente-teste-three.vercel.app"
        const { data: invite, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(buyer.email, {
            data: {
                full_name: buyer.name,
                role: "user",
                phone: buyer.phone ?? null,        // → trigger lê e salva no crm_leads
                plan_name: buyer.planName ?? null, // → trigger lê e salva no crm_leads
            },
            redirectTo: `${siteUrl}/reset-password`,
        })
        if (inviteError) throw inviteError

        // Upsert profile
        await supabase.from("profiles").upsert({
            id: invite.user.id,
            full_name: buyer.name,
            role: "user",
            created_at: new Date().toISOString(),
        })

        // O trigger sync_user_to_crm cria o lead automaticamente com phone e plan_name
        // lidos do raw_user_meta_data (passado acima no campo data: {})
        console.log(`[webhook] ✅ Convite enviado: ${buyer.email} | Plano: ${buyer.planName} | Tel: ${buyer.phone}`)
        return NextResponse.json({ ok: true, email: buyer.email, phone: buyer.phone, plan: buyer.planName })

    } catch (err: any) {
        console.error("[webhook] Erro fatal:", err.message)
        return NextResponse.json({ ok: true, skipped: true, reason: `internal error: ${err.message}` })
    }
}

export async function GET() {
    return NextResponse.json({ ok: true, service: "AviatorPro Payment Webhook v6" })
}
