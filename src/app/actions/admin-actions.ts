"use server"

import { createClient } from "@supabase/supabase-js"

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
        // Total Users
        const { count: totalUsers } = await supabaseAdmin
            .from("profiles")
            .select("*", { count: "exact", head: true })

        // Active 24h
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const { count: active24h } = await supabaseAdmin
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .gt("last_seen", yesterday)

        // Online now (5 min)
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
        const { count: onlineNow } = await supabaseAdmin
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .gt("last_seen", fiveMinsAgo)

        // New today
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const { count: newToday } = await supabaseAdmin
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .gte("created_at", today.toISOString())

        return {
            totalUsers: totalUsers || 0,
            active24h: active24h || 0,
            onlineNow: onlineNow || 0,
            newToday: newToday || 0
        }
    } catch (error) {
        console.error("Error fetching dashboard stats:", error)
        return { totalUsers: 0, active24h: 0, onlineNow: 0, newToday: 0 }
    }
}

export async function updateUserRole(userId: string, role: 'user' | 'admin') {
    try {
        const { error } = await supabaseAdmin
            .from("profiles")
            .update({ role })
            .eq("id", userId)

        if (error) throw error
        return { success: true }
    } catch (error) {
        console.error("Error updating role:", error)
        return { success: false, error }
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
            await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: "876000h" })
        } else {
            await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: "0" })
        }

        return { success: true }
    } catch (error) {
        console.error("Error updating status:", error)
        return { success: false, error }
    }
}

export async function deleteUser(userId: string) {
    try {
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
        if (error) throw error
        return { success: true }
    } catch (error) {
        console.error("Error deleting user:", error)
        return { success: false, error }
    }
}
