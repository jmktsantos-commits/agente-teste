import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
    const supabase = await createClient()

    // Check auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { platform, is_live, stream_url, expert_name, viewers_count } = await req.json()

    if (!platform) return NextResponse.json({ error: 'Platform required' }, { status: 400 })

    const { data, error } = await supabase
        .from('live_streams')
        .update({
            is_live: is_live ?? false,
            stream_url: stream_url ?? null,
            expert_name: expert_name,
            viewers_count: viewers_count ?? 0,
            started_at: is_live ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
        })
        .eq('platform', platform)
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, data })
}

export async function GET() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('live_streams')
        .select('*')
        .order('platform')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
}
