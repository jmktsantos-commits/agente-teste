import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// API direta do TipMiner (mais confiável que scraping HTML)
// URL base: https://api.core.public.tipminer.com/v1/crash/rounds/{gameId}/history
const PLATFORMS = [
    {
        name: 'bravobet',
        gameId: 'dddfce2b-42dc-4fd5-afd8-a5ee0ef36f89',
        // URL atualizada: /br/cassinos/bravobet/aviator (era /br/historico/bravobet/aviator)
        tipminerUrl: 'https://www.tipminer.com/br/cassinos/bravobet/aviator',
    },
    {
        name: 'esportivabet',
        gameId: null, // UUID não confirmado — usar fallback HTML
        tipminerUrl: 'https://www.tipminer.com/br/cassinos/sortenabet/aviator',
    },
    {
        name: 'superbet',
        gameId: null, // Usar fallback de scraping HTML se não tiver gameId
        tipminerUrl: 'https://www.tipminer.com/br/cassinos/betou/aviator',
    },
]

const TIPMINER_API_BASE = 'https://api.core.public.tipminer.com/v1/crash/rounds'
const ROUNDS_LIMIT = 200

// ===== FETCH VIA API DIRETA DO TIPMINER =====
async function fetchFromTipMinerAPI(gameId: string): Promise<{ multiplier: number; round_time: string }[]> {
    const url = `${TIPMINER_API_BASE}/${gameId}/history?limit=${ROUNDS_LIMIT}&timezone=America%2FSao_Paulo`
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Referer': 'https://www.tipminer.com/',
            'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(15000),
        next: { revalidate: 0 },
    })

    if (!res.ok) throw new Error(`API retornou ${res.status} para gameId ${gameId}`)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any[] = await res.json()

    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Resposta da API vazia ou inválida')
    }

    return data
        .filter(r => typeof r.result === 'number' && r.result > 0 && r.instant)
        .map(r => ({
            multiplier: r.result,
            round_time: r.instant, // já é ISO 8601 UTC
        }))
}

// ===== FALLBACK: PARSE HTML (para plataformas sem gameId) =====
function parseHtml(html: string): { multiplier: number; gameTime: string | null }[] {
    const results: { multiplier: number; gameTime: string | null }[] = []

    // Strategy 1: Extract from __NEXT_DATA__ JSON
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (nextDataMatch) {
        try {
            const json = JSON.parse(nextDataMatch[1])
            const found = extractFromJson(json)
            if (found.length > 0) return found
        } catch { /* fall through */ }
    }

    // Strategy 2: Regex em texto visível — padrões "2,34x" ou "10.00x" perto de horários
    const cellRegex = /(\d+)[,.](\d+)x[^]*?(\d{2}:\d{2}:\d{2})/g
    let m: RegExpExecArray | null
    while ((m = cellRegex.exec(html)) !== null && results.length < 50) {
        const multiplier = parseFloat(`${m[1]}.${m[2]}`)
        if (multiplier > 0 && multiplier < 10000) {
            results.push({ multiplier, gameTime: m[3] })
        }
    }

    if (results.length > 0) return results

    // Strategy 3: Apenas multiplicadores (sem horário)
    const multRegex = /(\d+)[,.](\d+)x/g
    while ((m = multRegex.exec(html)) !== null && results.length < 50) {
        const multiplier = parseFloat(`${m[1]}.${m[2]}`)
        if (multiplier > 0 && multiplier < 10000) {
            results.push({ multiplier, gameTime: null })
        }
    }

    return results
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractFromJson(obj: any, depth = 0): { multiplier: number; gameTime: string | null }[] {
    if (depth > 20) return []
    const results: { multiplier: number; gameTime: string | null }[] = []

    if (Array.isArray(obj)) {
        for (const item of obj) {
            if (item && typeof item === 'object') {
                const mult = item.multiplier ?? item.value ?? item.crash_point ?? item.result ?? item.odd
                const time = item.round_time ?? item.created_at ?? item.time ?? item.game_time ?? item.instant ?? null
                if (typeof mult === 'number' && mult > 0 && mult < 10000) {
                    results.push({ multiplier: mult, gameTime: time ? String(time).substring(11, 19) || null : null })
                } else {
                    results.push(...extractFromJson(item, depth + 1))
                }
            }
        }
    } else if (obj && typeof obj === 'object') {
        for (const key of Object.keys(obj)) {
            results.push(...extractFromJson(obj[key], depth + 1))
        }
    }

    return results
}

async function scrapePlatformFallback(platform: { name: string; tipminerUrl: string }) {
    const res = await fetch(platform.tipminerUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9',
            'Cache-Control': 'no-cache',
        },
        next: { revalidate: 0 },
    })

    if (!res.ok) throw new Error(`HTTP ${res.status} para ${platform.tipminerUrl}`)
    const html = await res.text()
    return parseHtml(html)
}

async function saveToSupabaseFromAPI(platformName: string, records: { multiplier: number; round_time: string }[]) {
    if (records.length === 0) return 0

    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/crash_history`, {
        method: 'POST',
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=ignore-duplicates,return=minimal',
        },
        body: JSON.stringify(
            records.map(r => ({
                multiplier: r.multiplier,
                platform: platformName,
                round_time: r.round_time,
            }))
        ),
    })

    return insertRes.ok ? records.length : 0
}

async function saveToSupabaseFromHtml(platformName: string, records: { multiplier: number; gameTime: string | null }[]) {
    if (records.length === 0) return 0

    const now = new Date()
    const recentTime = new Date(now.getTime() - 60000).toISOString()
    const checkRes = await fetch(
        `${SUPABASE_URL}/rest/v1/crash_history?platform=eq.${platformName}&round_time=gte.${recentTime}&select=multiplier,round_time`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    )
    const recent: { multiplier: number; round_time: string }[] = checkRes.ok ? await checkRes.json() : []

    const toInsert = []
    for (let i = 0; i < records.length; i++) {
        const r = records[i]
        let roundDate: Date

        if (r.gameTime) {
            const [h, m, s] = r.gameTime.split(':').map(Number)
            roundDate = new Date(now)
            roundDate.setHours(h, m, s, 999 - i)
            if (roundDate > now) roundDate.setDate(roundDate.getDate() - 1)
        } else {
            roundDate = new Date(now.getTime() - i * 1000)
        }

        const isDup = recent.some(rec => {
            const diff = Math.abs(new Date(rec.round_time).getTime() - roundDate.getTime())
            return rec.multiplier === r.multiplier && diff < 60000
        })

        if (!isDup) {
            toInsert.push({
                multiplier: r.multiplier,
                platform: platformName,
                round_time: roundDate.toISOString(),
            })
        }
    }

    if (toInsert.length === 0) return 0

    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/crash_history`, {
        method: 'POST',
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=ignore-duplicates,return=minimal',
        },
        body: JSON.stringify(toInsert),
    })

    return insertRes.ok ? toInsert.length : 0
}

export async function GET(req: NextRequest) {
    // Auth check: Vercel cron sends Authorization header automatically
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results: Record<string, { scraped: number; saved: number; method: string; error?: string }> = {}
    let totalSaved = 0

    for (const platform of PLATFORMS) {
        try {
            if (platform.gameId) {
                // ✅ Método preferido: API direta do TipMiner
                const data = await fetchFromTipMinerAPI(platform.gameId)
                const saved = await saveToSupabaseFromAPI(platform.name, data)
                results[platform.name] = { scraped: data.length, saved, method: 'api-direta' }
                totalSaved += saved
            } else {
                // ⚠️ Fallback: scraping HTML (menos confiável)
                const data = await scrapePlatformFallback(platform)
                const saved = await saveToSupabaseFromHtml(platform.name, data)
                results[platform.name] = { scraped: data.length, saved, method: 'html-scraping' }
                totalSaved += saved
            }
        } catch (err) {
            results[platform.name] = { scraped: 0, saved: 0, method: 'error', error: String(err) }
        }
    }

    return NextResponse.json({
        ok: true,
        timestamp: new Date().toISOString(),
        totalSaved,
        platforms: results,
    })
}
