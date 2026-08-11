import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const TIPMINER_API_BASE = 'https://api.core.public.tipminer.com/v1/crash/rounds'
const ROUNDS_LIMIT = 200

// Apenas plataformas com gameId confirmado funcionam via API direta
const PLATFORMS = [
    {
        name: 'bravobet',
        gameId: 'dddfce2b-42dc-4fd5-afd8-a5ee0ef36f89',
    },
]

// ===== FETCH DA API TIPMINER =====
async function fetchFromTipMiner(gameId: string): Promise<{ result: number; instant: string }[]> {
    const url = `${TIPMINER_API_BASE}/${gameId}/history?limit=${ROUNDS_LIMIT}&timezone=America%2FSao_Paulo`
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Referer': 'https://www.tipminer.com/',
            'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(15000),
        cache: 'no-store',
    })

    if (!res.ok) throw new Error(`TipMiner API retornou ${res.status}`)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any[] = await res.json()
    if (!Array.isArray(data) || data.length === 0) throw new Error('Resposta vazia da API')
    return data.filter(r => typeof r.result === 'number' && r.result > 0 && r.instant)
}

// ===== BUSCAR O TIMESTAMP MAIS RECENTE NO BANCO =====
async function getLatestTimestamp(platformName: string): Promise<Date | null> {
    const res = await fetch(
        `${SUPABASE_URL}/rest/v1/crash_history?platform=eq.${platformName}&order=round_time.desc&limit=1&select=round_time`,
        {
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
            },
            signal: AbortSignal.timeout(10000),
            cache: 'no-store',
        }
    )
    if (!res.ok) return null
    const data: { round_time: string }[] = await res.json()
    return data.length > 0 ? new Date(data[0].round_time) : null
}

// ===== SALVAR NO SUPABASE =====
async function saveToSupabase(records: { multiplier: number; platform: string; round_time: string }[]): Promise<number> {
    if (records.length === 0) return 0

    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/crash_history`, {
        method: 'POST',
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=ignore-duplicates,return=minimal',
        },
        body: JSON.stringify(records),
    })

    return insertRes.ok ? records.length : 0
}

export async function GET(req: NextRequest) {
    // Auth check
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results: Record<string, { fetched: number; new: number; saved: number; error?: string }> = {}
    let totalSaved = 0

    for (const platform of PLATFORMS) {
        try {
            // 1. Buscar rounds do TipMiner
            const data = await fetchFromTipMiner(platform.gameId)

            // 2. Buscar último timestamp no banco para filtrar apenas novos
            const latestInDb = await getLatestTimestamp(platform.name)

            // 3. Filtrar apenas rounds mais novos que o banco
            const newRounds = latestInDb
                ? data.filter(r => new Date(r.instant) > latestInDb)
                : data

            if (newRounds.length === 0) {
                results[platform.name] = { fetched: data.length, new: 0, saved: 0 }
                continue
            }

            // 4. Converter e inserir
            const records = newRounds.map(r => ({
                multiplier: r.result,
                platform: platform.name,
                round_time: r.instant,
            }))

            const saved = await saveToSupabase(records)
            results[platform.name] = { fetched: data.length, new: newRounds.length, saved }
            totalSaved += saved

        } catch (err) {
            results[platform.name] = { fetched: 0, new: 0, saved: 0, error: String(err) }
        }
    }

    return NextResponse.json({
        ok: true,
        timestamp: new Date().toISOString(),
        totalSaved,
        platforms: results,
    })
}
