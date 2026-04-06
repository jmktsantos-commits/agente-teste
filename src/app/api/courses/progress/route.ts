import { createClient as createServerClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/courses/progress — mark lesson as complete
export async function POST(request: NextRequest) {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { lesson_id } = await request.json()
    if (!lesson_id) return NextResponse.json({ error: 'lesson_id obrigatório' }, { status: 400 })

    const { error } = await supabase
        .from('course_progress')
        .upsert({ user_id: user.id, lesson_id }, { onConflict: 'user_id,lesson_id' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}

// GET /api/courses/progress — get user's completed lessons
export async function GET() {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
        .from('course_progress')
        .select('lesson_id, completed_at')
        .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}
