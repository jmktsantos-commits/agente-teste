import { NextResponse } from "next/server"

/**
 * GET /api/webhooks/debug
 * Verifica o status das env vars críticas para o webhook de pagamento.
 * REMOVER em produção após o debug!
 */
export async function GET() {
    const apiKey = process.env.ASAAS_API_KEY ?? ""
    const apiUrl = process.env.ASAAS_API_URL ?? ""
    const webhookSecret = process.env.WEBHOOK_SECRET ?? ""
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""

    // Testa chamada real à API do Asaas (sandbox)
    let asaasTest: string = "não testado"
    if (apiKey) {
        try {
            const base = apiUrl || "https://sandbox.asaas.com/api/v3"
            const res = await fetch(`${base}/customers?limit=1`, {
                headers: { "access_token": apiKey },
            })
            asaasTest = `${base} → HTTP ${res.status}`
        } catch (e: any) {
            asaasTest = `erro: ${e.message}`
        }
    }

    return NextResponse.json({
        envVars: {
            ASAAS_API_KEY: apiKey ? `✅ definido (${apiKey.length} chars, começa com "${apiKey.slice(0, 8)}...")` : "❌ VAZIO",
            ASAAS_API_URL: apiUrl || "❌ VAZIO (vai usar sandbox por padrão)",
            WEBHOOK_SECRET: webhookSecret ? `✅ definido (${webhookSecret.length} chars)` : "⚠️ não definido (aceitará qualquer chamada)",
            NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? `✅ ${supabaseUrl}` : "❌ VAZIO",
            SUPABASE_SERVICE_ROLE_KEY: serviceKey ? `✅ definido (${serviceKey.length} chars)` : "❌ VAZIO",
        },
        asaasApiTest: asaasTest,
    })
}
