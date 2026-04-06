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

// GET /api/admin/courses/modules — list all modules with lesson counts
export async function GET() {
    if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = adminSupabase()
    const { data, error } = await supabase
        .from('course_modules')
        .select(`
            *,
            course_lessons (id, title, video_url, duration, position, is_published)
        `)
        .order('position', { ascending: true })
        .order('position', { referencedTable: 'course_lessons', ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

// POST /api/admin/courses/modules — create new module
export async function POST(request: NextRequest) {
    if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { title, description } = body

    if (!title?.trim()) return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 })

    const supabase = adminSupabase()

    // Get max position
    const { data: maxPos } = await supabase
        .from('course_modules')
        .select('position')
        .order('position', { ascending: false })
        .limit(1)

    const position = (maxPos?.[0]?.position ?? -1) + 1

    const { data, error } = await supabase
        .from('course_modules')
        .insert({ title: title.trim(), description: description?.trim() || null, position })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
}
