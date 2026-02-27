import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Utility: extract YouTube/Vimeo embed info from any URL
function parseVideoUrl(url: string): { type: 'youtube' | 'vimeo' | 'unknown'; id: string } | null {
    if (!url?.trim()) return null
    // YouTube
    const ytMatch = url.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    )
    if (ytMatch) return { type: 'youtube', id: ytMatch[1] }
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
    if (vimeoMatch) return { type: 'vimeo', id: vimeoMatch[1] }
    return null
}

// GET /api/admin/site-settings?key=welcome_video_url
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const key = request.nextUrl.searchParams.get('key')

        const query = supabase.from('site_settings').select('key, value, updated_at')
        if (key) query.eq('key', key)

        const { data, error } = await query

        if (error) throw error

        // If requesting a single key, return it with parsed video info
        if (key && data?.[0]) {
            const parsed = parseVideoUrl(data[0].value)
            return NextResponse.json({ ...data[0], parsed })
        }

        return NextResponse.json(data ?? [])
    } catch (err) {
        console.error('[site-settings GET]', err)
        return NextResponse.json({ error: 'Erro ao buscar configuração' }, { status: 500 })
    }
}

// PUT /api/admin/site-settings  body: { key, value }
export async function PUT(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Verify admin
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
        }

        const body = await request.json()
        const { key, value } = body

        if (!key) {
            return NextResponse.json({ error: 'key obrigatório' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('site_settings')
            .upsert({ key, value, updated_at: new Date().toISOString(), updated_by: user.id })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (err) {
        console.error('[site-settings PUT]', err)
        return NextResponse.json({ error: 'Erro ao salvar configuração' }, { status: 500 })
    }
}
