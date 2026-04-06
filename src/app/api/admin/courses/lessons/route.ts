import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/utils/supabase/server'

const adminSupabase = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function isAdmin() {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    return data?.role === 'admin'
}

// POST /api/admin/courses/lessons — create new lesson
export async function POST(request: NextRequest) {
    if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { module_id, title, video_url, duration } = body

    if (!module_id) return NextResponse.json({ error: 'module_id obrigatório' }, { status: 400 })
    if (!title?.trim()) return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 })

    const supabase = adminSupabase()

    // Get max position within module
    const { data: maxPos } = await supabase
        .from('course_lessons')
        .select('position')
        .eq('module_id', module_id)
        .order('position', { ascending: false })
        .limit(1)

    const position = (maxPos?.[0]?.position ?? -1) + 1

    const { data, error } = await supabase
        .from('course_lessons')
        .insert({
            module_id,
            title: title.trim(),
            video_url: video_url?.trim() || null,
            duration: duration?.trim() || null,
            position,
        })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
}
