import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/utils/supabase/server'

// GET /api/courses/modules — public (members only) reading of published modules + lessons
export async function GET() {
    // Confirm user is authenticated (any logged-in member can read)
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Use service role to bypass RLS — we manually filter to is_published only
    const adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await adminSupabase
        .from('course_modules')
        .select(`
            id, title, description, position,
            course_lessons (id, title, video_url, duration, position, module_id, is_published)
        `)
        .eq('is_published', true)
        .order('position', { ascending: true })

    if (error) {
        console.error('[GET /api/courses/modules]', error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Strip unpublished lessons — security double-check
    const filtered = (data || []).map(m => ({
        ...m,
        course_lessons: (m.course_lessons || [])
            .filter((l: { is_published: boolean }) => l.is_published)
            .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
    }))

    return NextResponse.json(filtered)
}
