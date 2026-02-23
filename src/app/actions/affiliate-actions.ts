"use server"

import { createClient } from "@supabase/supabase-js"
import { headers } from "next/headers"

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
)

// ======= GET ALL AFFILIATES (for admin) =======
export async function getAffiliates(status?: string) {
    try {
        let query = supabaseAdmin
            .from("affiliate_stats")
            .select("*")
            .order("created_at", { ascending: false })

        if (status && status !== "all") {
            query = query.eq("status", status)
        }

        const { data, error } = await query
        if (error) throw error
        return { affiliates: data || [], error: null }
    } catch (error: any) {
        return { affiliates: [], error: error.message }
    }
}

// ======= CREATE AFFILIATE (admin creates manually) =======
export async function createAffiliate({
    email,
    password,
    fullName,
    btag,
    commissionRate,
    adminId,
}: {
    email: string
    password: string
    fullName: string
    btag: string
    commissionRate: number
    adminId: string
}) {
    try {
        // 1. Check btag uniqueness
        const { data: existing } = await supabaseAdmin
            .from("affiliates")
            .select("id")
            .eq("btag", btag)
            .single()

        if (existing) return { success: false, error: "Este btag já está em uso." }

        // 2. Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName, role: "affiliate" },
        })

        if (authError) return { success: false, error: authError.message }

        const userId = authData.user.id

        // 3. Update profile role and btag
        await supabaseAdmin
            .from("profiles")
            .update({ role: "affiliate", btag, full_name: fullName })
            .eq("id", userId)

        // 4. Create affiliate record
        const { error: affiliateError } = await supabaseAdmin.from("affiliates").insert({
            id: userId,
            btag,
            commission_rate: commissionRate,
            status: "active",
            approved_by: adminId,
            approved_at: new Date().toISOString(),
        })

        if (affiliateError) {
            await supabaseAdmin.auth.admin.deleteUser(userId)
            return { success: false, error: affiliateError.message }
        }

        return { success: true, userId }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// ======= UPDATE AFFILIATE STATUS =======
export async function updateAffiliateStatus(
    affiliateId: string,
    status: "active" | "suspended" | "pending",
    adminId: string
) {
    try {
        const updateData: any = { status, updated_at: new Date().toISOString() }
        if (status === "active") {
            updateData.approved_by = adminId
            updateData.approved_at = new Date().toISOString()
        }

        const { error } = await supabaseAdmin
            .from("affiliates")
            .update(updateData)
            .eq("id", affiliateId)

        if (error) throw error
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// ======= UPDATE COMMISSION RATE =======
export async function updateCommissionRate(affiliateId: string, commissionRate: number) {
    try {
        const { error } = await supabaseAdmin
            .from("affiliates")
            .update({ commission_rate: commissionRate, updated_at: new Date().toISOString() })
            .eq("id", affiliateId)

        if (error) throw error
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// ======= GET AFFILIATE LEADS (admin sees all, affiliate sees own) =======
export async function getAffiliateLeads(affiliateId: string, page = 1, limit = 20) {
    try {
        const { data, error, count } = await supabaseAdmin
            .from("crm_leads")
            .select("*", { count: "exact" })
            .eq("affiliate_id", affiliateId)
            .order("created_at", { ascending: false })
            .range((page - 1) * limit, page * limit - 1)

        if (error) throw error
        return { leads: data || [], total: count || 0 }
    } catch (error: any) {
        return { leads: [], total: 0, error: error.message }
    }
}

// ======= GET AFFILIATE COMMISSIONS =======
export async function getAffiliateCommissions(affiliateId: string) {
    try {
        const { data, error } = await supabaseAdmin
            .from("affiliate_commissions")
            .select("*, lead:crm_leads(full_name, email, phone)")
            .eq("affiliate_id", affiliateId)
            .order("created_at", { ascending: false })

        if (error) throw error
        return { commissions: data || [], error: null }
    } catch (error: any) {
        return { commissions: [], error: error.message }
    }
}

// ======= MARK COMMISSION AS PAID =======
export async function payCommission(commissionId: string) {
    try {
        const { error } = await supabaseAdmin
            .from("affiliate_commissions")
            .update({ status: "paid", paid_at: new Date().toISOString() })
            .eq("id", commissionId)

        if (error) throw error
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// ======= GET CURRENT USER'S AFFILIATE DATA (self) =======
export async function getMyAffiliateData(userId: string) {
    try {
        const { data, error } = await supabaseAdmin
            .from("affiliate_stats")
            .select("*")
            .eq("id", userId)
            .single()

        if (error) throw error
        return { affiliate: data, error: null }
    } catch (error: any) {
        return { affiliate: null, error: error.message }
    }
}

// ======= DELETE AFFILIATE =======
export async function deleteAffiliate(affiliateId: string) {
    try {
        await supabaseAdmin.auth.admin.deleteUser(affiliateId)
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
