"use server"

import { createClient } from "@supabase/supabase-js"

// Validate environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('CRITICAL: NEXT_PUBLIC_SUPABASE_URL is not set!')
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('CRITICAL: SUPABASE_SERVICE_ROLE_KEY is not set!')
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
}

console.log('[Admin Actions] Initializing with Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

// Create a Service Role client for Admin actions
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
)

export async function getUsers(page = 1, limit = 10, search = "") {
    try {
        let query = supabaseAdmin
            .from("profiles")
            .select("*", { count: "exact" })
            .order("created_at", { ascending: false })
            .range((page - 1) * limit, page * limit - 1)

        if (search) {
            query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
        }

        const { data, count, error } = await query

        if (error) throw error

        return { users: data, total: count || 0 }
    } catch (error) {
        console.error("Error fetching users:", error)
        return { users: [], total: 0 }
    }
}

export async function getOnlineUsers() {
    try {
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
        const { data, error } = await supabaseAdmin
            .from("profiles")
            .select("id, email, full_name, last_seen")
            .gt("last_seen", fiveMinsAgo)
            .order("last_seen", { ascending: false })

        if (error) throw error
        return { users: data || [] }
    } catch (error) {
        console.error("Error fetching online users:", error)
        return { users: [] }
    }
}

export async function getRegistrationStats(days = 7) {
    try {
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
        const { data, error } = await supabaseAdmin
            .from("profiles")
            .select("created_at")
            .gte("created_at", startDate)
            .order("created_at", { ascending: true })

        if (error) throw error

        // Group by day
        const grouped: Record<string, number> = {}
        for (let i = 0; i < days; i++) {
            const d = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000)
            const key = d.toISOString().split("T")[0]
            grouped[key] = 0
        }

        data?.forEach((row: any) => {
            const key = new Date(row.created_at).toISOString().split("T")[0]
            if (grouped[key] !== undefined) grouped[key]++
        })

        return {
            stats: Object.entries(grouped).map(([date, count]) => ({
                date,
                label: new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" }),
                count
            }))
        }
    } catch (error) {
        console.error("Error fetching registration stats:", error)
        return { stats: [] }
    }
}

export async function getActivityStats() {
    try {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const { data, error } = await supabaseAdmin
            .from("profiles")
            .select("last_seen")
            .gte("last_seen", yesterday)

        if (error) throw error

        // Group by hour
        const hours: Record<number, number> = {}
        for (let i = 0; i < 24; i++) hours[i] = 0

        data?.forEach((row: any) => {
            if (row.last_seen) {
                const h = new Date(row.last_seen).getHours()
                hours[h]++
            }
        })

        return {
            stats: Object.entries(hours).map(([hour, count]) => ({
                hour: `${String(hour).padStart(2, "0")}h`,
                count
            }))
        }
    } catch (error) {
        console.error("Error fetching activity stats:", error)
        return { stats: [] }
    }
}

export async function getDashboardStats() {
    try {
        console.log('[getDashboardStats] Starting fetch...')

        // Total Users
        const { count: totalUsers, error: totalUsersError } = await supabaseAdmin
            .from("profiles")
            .select("*", { count: "exact", head: true })

        if (totalUsersError) {
            console.error('[getDashboardStats] Error fetching totalUsers:', totalUsersError)
        } else {
            console.log('[getDashboardStats] totalUsers:', totalUsers)
        }

        // Active 24h
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const { count: active24h, error: active24hError } = await supabaseAdmin
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .gt("last_seen", yesterday)

        if (active24hError) {
            console.error('[getDashboardStats] Error fetching active24h:', active24hError)
        } else {
            console.log('[getDashboardStats] active24h:', active24h)
        }

        // Online now (5 min)
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
        const { count: onlineNow, error: onlineNowError } = await supabaseAdmin
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .gt("last_seen", fiveMinsAgo)

        if (onlineNowError) {
            console.error('[getDashboardStats] Error fetching onlineNow:', onlineNowError)
        } else {
            console.log('[getDashboardStats] onlineNow:', onlineNow)
        }

        // New today
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const { count: newToday, error: newTodayError } = await supabaseAdmin
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .gte("created_at", today.toISOString())

        if (newTodayError) {
            console.error('[getDashboardStats] Error fetching newToday:', newTodayError)
        } else {
            console.log('[getDashboardStats] newToday:', newToday)
        }

        const stats = {
            totalUsers: totalUsers || 0,
            active24h: active24h || 0,
            onlineNow: onlineNow || 0,
            newToday: newToday || 0
        }

        console.log('[getDashboardStats] Final stats:', stats)
        return stats
    } catch (error) {
        console.error("[getDashboardStats] CRITICAL ERROR:", error)
        return { totalUsers: 0, active24h: 0, onlineNow: 0, newToday: 0 }
    }
}

export async function updateUserRole(userId: string, role: 'user' | 'admin' | 'affiliate') {
    try {
        const { error } = await supabaseAdmin
            .from("profiles")
            .update({ role })
            .eq("id", userId)

        if (error) throw error
        return { success: true }
    } catch (error: any) {
        console.error("Error updating role:", error)
        return { success: false, error: error?.message ?? String(error) }
    }
}

export async function updateUserStatus(userId: string, status: 'active' | 'banned') {
    try {
        const { error } = await supabaseAdmin
            .from("profiles")
            .update({ status })
            .eq("id", userId)

        if (error) throw error

        if (status === 'banned') {
            const { error: banErr } = await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: "87600h" })
            if (banErr) throw banErr
        } else {
            const { error: unbanErr } = await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: "none" })
            if (unbanErr) throw unbanErr
        }

        return { success: true }
    } catch (error: any) {
        console.error("Error updating status:", error)
        return { success: false, error: error?.message ?? String(error) }
    }
}

export async function deleteUser(userId: string) {
    try {
        // Pre-clean tables that are NOT set up with CASCADE
        // (safe even if they don't exist for this user — deletes 0 rows gracefully)
        await supabaseAdmin.from("crm_leads").update({ user_id: null }).eq("user_id", userId)
        await supabaseAdmin.from("affiliates").delete().eq("id", userId)

        // Delete the auth user FIRST.
        // With ON DELETE CASCADE on profiles (fix_delete_user_fk.sql applied),
        // profiles + any other CASCADE tables are auto-deleted.
        // If this fails, nothing else is deleted → user stays visible in panel.
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
        if (error) throw error

        return { success: true }
    } catch (error: any) {
        console.error("Error deleting user:", error)
        return { success: false, error: error?.message ?? String(error) }
    }
}
