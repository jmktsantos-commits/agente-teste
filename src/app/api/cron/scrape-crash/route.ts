import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const PLATFORMS = [
    { name: 'bravobet',     url: 'https://www.tipminer.com/br/historico/bravobet/aviator' },
    { name: 'esportivabet', url: 'https://www.tipminer.com/br/historico/sortenabet/aviator' },
    { name: 'superbet',     url: 'https://www.tipminer.com/br/historico/betou/aviator' },
]

// Parse multipliers + times from TipMiner HTML
function parseHtml(html: string): { multiplier: number; gameTime: string | null }[] {
    const results: { multiplier: number; gameTime: string | null }[] = []

    // TipMiner renders data inline in __NEXT_DATA__ or as text in cells
    // Strategy 1: Extract from __NEXT_DATA__ JSON
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (nextDataMatch) {
        try {
            const json = JSON.parse(nextDataMatch[1])
            // Walk the JSON looking for arrays with multiplier/value fields
            const found = extractFromJson(json)
            if (found.length > 0) return found
        } catch { /* fall through */ }
    }

    // Strategy 2: Regex on visible text — matches "2,34x" or "10.00x" patterns near times
    // TipMiner uses patterns like: 2,34x ... 14:23:45
    const cellRegex = /(\d+)[,.](\d+)x[^]*?(\d{2}:\d{2}:\d{2})/g
    let m: RegExpExecArray | null
    while ((m = cellRegex.exec(html)) !== null && results.length < 50) {
        const multiplier = parseFloat(`${m[1]}.${m[2]}`)
        if (multiplier > 0 && multiplier < 10000) {
            results.push({ multiplier, gameTime: m[3] })
        }
    }

    if (results.length > 0) return results

    // Strategy 3: Just multipliers (no time)
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
                // Look for objects with multiplier/value/crash_point fields
                const mult = item.multiplier ?? item.value ?? item.crash_point ?? item.result ?? item.odd
                const time = item.round_time ?? item.created_at ?? item.time ?? item.game_time ?? null
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

async function scrapePlatform(platform: { name: string; url: string }) {
    const res = await fetch(platform.url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9',
            'Cache-Control': 'no-cache',
        },
        next: { revalidate: 0 },
    })

    if (!res.ok) throw new Error(`HTTP ${res.status} for ${platform.url}`)
    const html = await res.text()
    return parseHtml(html)
}

async function saveToSupabase(platformName: string, records: { multiplier: number; gameTime: string | null }[]) {
    if (records.length === 0) return 0

    const now = new Date()

    // Fetch recent 60s to dedup
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

    const results: Record<string, { scraped: number; saved: number; error?: string }> = {}
    let totalSaved = 0

    for (const platform of PLATFORMS) {
        try {
            const data = await scrapePlatform(platform)
            const saved = await saveToSupabase(platform.name, data)
            results[platform.name] = { scraped: data.length, saved }
            totalSaved += saved
        } catch (err) {
            results[platform.name] = { scraped: 0, saved: 0, error: String(err) }
        }
    }

    return NextResponse.json({
        ok: true,
        timestamp: new Date().toISOString(),
        totalSaved,
        platforms: results,
    })
}
