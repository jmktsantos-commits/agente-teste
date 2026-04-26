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

// ── Determina o slug do plano pelo valor (deve bater com PAID_PLANS do middleware)
function getPlanSlug(value?: number, productName?: string): string {
    // Tenta detectar pelo nome do produto primeiro
    if (productName) {
        const n = productName.toLowerCase()
        if (n.includes("black") || n.includes("elite")) return "black"
        if (n.includes("anual") || n.includes("annual") || n.includes("year")) return "anual"
        if (n.includes("mensal") || n.includes("starter") || n.includes("monthly")) return "starter"
    }
    // Fallback pelo valor
    if (!value) return "anual"
    if (value <= 150) return "starter"
    return "anual"
}

// ── Detecta pagamento confirmado ──────────────────────────────────────────────
function isPaymentConfirmed(event: string): boolean {
    const confirmed = [
        // Asaas
        "PAYMENT_CONFIRMED", "PAYMENT_RECEIVED",
        // Lastlink
        "purchase.approved", "purchase.complete", "PURCHASE_APPROVED", "PURCHASE_COMPLETE",
        // Hotmart
        "PURCHASE_APPROVED", "purchase_approved",
        // Kiwify
        "order_approved", "ORDER_APPROVED",
        // Genérico
        "payment_success", "PAYMENT_SUCCESS",
    ]
    return confirmed.some(e => e.toLowerCase() === event.toLowerCase())
}

// ── Validação de token ─────────────────────────────────────────────────────────
function isAuthorized(req: NextRequest): boolean {
    if (!WEBHOOK_SECRET) return true
    const tokens = [
        req.headers.get("asaas-access-token"),
        req.headers.get("x-kiwify-token"),
        req.headers.get("x-webhook-token"),
        req.headers.get("x-lastlink-signature"),
        req.headers.get("authorization")?.replace("Bearer ", ""),
        req.nextUrl.searchParams.get("token"),
        req.nextUrl.searchParams.get("accessToken"),
    ]
    return tokens.some(t => t === WEBHOOK_SECRET)
}

// ── Busca pagamento pelo ID na Asaas ──────────────────────────────────────────
async function fetchPaymentFromAsaas(paymentId: string): Promise<BuyerInfo | null> {
    const bases = ["https://sandbox.asaas.com/api/v3", "https://api.asaas.com/v3"]
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
            const planName = getPlanSlug(planValue)

            if (pay.customer?.email) {
                return { email: pay.customer.email, name: pay.customer.name ?? "Membro", phone: pay.customer.mobilePhone ?? pay.customer.phone ?? undefined, planName, planValue }
            }
            if (pay.customer) {
                const cRes = await fetch(`${base}/customers/${pay.customer}`, { headers: { "access_token": ASAAS_API_KEY } })
                if (cRes.ok) {
                    const cData = await cRes.json()
                    if (cData.email) return { email: cData.email, name: cData.name ?? "Membro", phone: cData.mobilePhone ?? cData.phone ?? undefined, planName, planValue }
                }
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e)
            console.warn(`[webhook] Erro ao buscar ${base}/payments/${paymentId}:`, msg)
        }
    }
    return null
}

// ── Extrai buyer de qualquer plataforma ───────────────────────────────────────
function extractBuyer(body: Record<string, unknown>): BuyerInfo | null {
    // ── Lastlink ──────────────────────────────────────────────────────────────
    // Formato: { event, data: { customer: { email, name, phone }, product: { name, price } } }
    const llData = body?.data as Record<string, unknown> | undefined
    if (llData?.customer) {
        const c = llData.customer as Record<string, unknown>
        if (c?.email) {
            const product = llData.product as Record<string, unknown> | undefined
            const planValue = (product?.price ?? llData?.amount) as number | undefined
            return {
                email: String(c.email),
                name: String(c.name ?? c.full_name ?? "Membro"),
                phone: c.phone ? String(c.phone) : undefined,
                planName: getPlanSlug(planValue, product?.name as string | undefined),
                planValue,
            }
        }
    }
    // Lastlink alternativo: { event, customer_email, customer_name, amount, product_name }
    if (body?.customer_email) {
        return {
            email: String(body.customer_email),
            name: String(body.customer_name ?? "Membro"),
            phone: body.customer_phone ? String(body.customer_phone) : undefined,
            planName: getPlanSlug(body.amount as number | undefined, body.product_name as string | undefined),
            planValue: body.amount as number | undefined,
        }
    }

    // ── Kiwify ────────────────────────────────────────────────────────────────
    const kiwify = body?.Customer as Record<string, unknown> | undefined
    if (kiwify?.email) {
        return {
            email: String(kiwify.email),
            name: String(kiwify.full_name ?? "Membro"),
            phone: kiwify.phone ? String(kiwify.phone) : undefined,
            planName: getPlanSlug(undefined, (body?.Product as Record<string, unknown>)?.name as string | undefined),
        }
    }

    // ── Hotmart ───────────────────────────────────────────────────────────────
    const hotmart = (body?.data as Record<string, unknown>)?.buyer as Record<string, unknown> | undefined
    if (hotmart?.email) {
        return {
            email: String(hotmart.email),
            name: String(hotmart.name ?? "Membro"),
            phone: hotmart.phone ? String(hotmart.phone) : undefined,
            planName: getPlanSlug(undefined, ((body?.data as Record<string, unknown>)?.product as Record<string, unknown>)?.name as string | undefined),
        }
    }

    // ── Asaas fallback (sem API key) ──────────────────────────────────────────
    const pay = body?.payment as Record<string, unknown> | undefined
    if (pay?.customerEmail) {
        return {
            email: String(pay.customerEmail),
            name: String(pay.customerName ?? "Membro"),
            phone: pay.customerPhone ? String(pay.customerPhone) : undefined,
            planName: getPlanSlug(pay.value as number | undefined),
            planValue: pay.value as number | undefined,
        }
    }

    return null
}

// ── Handler principal ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const body = await req.json() as Record<string, unknown>
        const event: string = String(body?.event ?? body?.Event ?? body?.order_status ?? "unknown")

        console.log(`[webhook] ===== EVENTO: "${event}" =====`)
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
        const paymentId = (body?.payment as Record<string, unknown>)?.id as string | undefined
        if (paymentId && ASAAS_API_KEY) {
            console.log(`[webhook] Buscando payment ${paymentId} via Asaas API`)
            buyer = await fetchPaymentFromAsaas(paymentId)
        }

        // Outras plataformas (Lastlink, Kiwify, Hotmart, Asaas sem API)
        if (!buyer) {
            buyer = extractBuyer(body)
        }

        if (!buyer?.email) {
            console.error(`[webhook] Não foi possível extrair email. Payload: ${JSON.stringify(body).slice(0, 400)}`)
            return NextResponse.json({ ok: true, skipped: true, reason: "could not extract email" })
        }

        console.log(`[webhook] Comprador: ${buyer.email} | Plano: ${buyer.planName} | Valor: R$${buyer.planValue ?? "?"}`)

        const supabase = getServiceClient()

        // Verifica se usuário já existe (trial que está comprando)
        const { data: existingUsers } = await supabase.auth.admin.listUsers()
        const existingUser = existingUsers?.users?.find((u: { email?: string }) => u.email === buyer!.email)

        if (existingUser) {
            // ✅ TRIAL COMPRANDO → atualiza o plano e libera acesso!
            console.log(`[webhook] Usuário existente encontrado: ${buyer.email} → atualizando para plano "${buyer.planName}"`)

            const { error: profileErr } = await supabase
                .from("profiles")
                .update({
                    plan: buyer.planName,          // 'anual' ou 'starter'
                    status: "active",              // garante que não está bloqueado
                    trial_expires_at: null,        // remove limitação de trial
                })
                .eq("id", existingUser.id)

            if (profileErr) {
                console.error("[webhook] Erro ao atualizar plano:", profileErr.message)
                return NextResponse.json({ ok: false, error: profileErr.message }, { status: 500 })
            }

            // Atualiza o lead no CRM
            await supabase.from("crm_leads").update({
                status: "converted",
                plan_name: buyer.planName,
                notes: `Plano ativado via compra. Valor: R$${buyer.planValue ?? "?"}`,
            }).eq("email", buyer.email)

            console.log(`[webhook] ✅ Plano "${buyer.planName}" ativado para ${buyer.email}`)
            return NextResponse.json({ ok: true, action: "plan_upgraded", email: buyer.email, plan: buyer.planName })
        }

        // ── Novo usuário (nunca se cadastrou) → envia convite ────────────────
        console.log(`[webhook] Novo usuário → enviando convite para ${buyer.email}`)
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://agente-teste-three.vercel.app"

        const { data: invite, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(buyer.email, {
            data: { full_name: buyer.name, role: "user" },
            redirectTo: `${siteUrl}/reset-password`,
        })
        if (inviteError) throw inviteError

        await supabase.from("profiles").upsert({
            id: invite.user.id,
            full_name: buyer.name,
            plan: buyer.planName,
            status: "active",
            role: "user",
            created_at: new Date().toISOString(),
        })

        await supabase.from("crm_leads").update({
            phone: buyer.phone ?? null,
            plan_name: buyer.planName ?? null,
            status: "converted",
            notes: `Pagamento confirmado. Plano: ${buyer.planName ?? "N/A"}. Valor: R$${buyer.planValue ?? "?"}`,
        }).eq("email", buyer.email)

        console.log(`[webhook] ✅ Convite enviado: ${buyer.email} | Plano: ${buyer.planName}`)
        return NextResponse.json({ ok: true, action: "invite_sent", email: buyer.email, plan: buyer.planName })

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error("[webhook] Erro fatal:", msg)
        return NextResponse.json({ ok: true, skipped: true, reason: `internal error: ${msg}` })
    }
}

export async function GET() {
    return NextResponse.json({ ok: true, service: "AviatorPro Payment Webhook v8 (Lastlink+Trial support)" })
}
