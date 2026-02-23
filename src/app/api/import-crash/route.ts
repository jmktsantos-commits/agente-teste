import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL! || 'https://wufnvueiappspptdphux.supabase.co/rest/v1/crash_history'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY! || ''

export async function POST(req: NextRequest) {
    try {
        const records = await req.json()
        if (!Array.isArray(records) || records.length === 0) {
            return NextResponse.json({ error: 'Expected non-empty array' }, { status: 400 })
        }

        // Insert in batches of 100
        const batchSize = 100
        let totalSaved = 0
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize)
            const res = await fetch(SUPABASE_URL, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=ignore-duplicates'
                },
                body: JSON.stringify(batch)
            })
            if (res.ok || res.status === 201) {
                totalSaved += batch.length
            }
        }

        return NextResponse.json({ status: 'ok', totalReceived: records.length, totalSaved })
    } catch (e: unknown) {
        return NextResponse.json({ error: String(e) }, { status: 500 })
    }
}
