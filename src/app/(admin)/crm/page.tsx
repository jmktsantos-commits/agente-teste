"use client"

import { useCallback, useEffect, useState } from "react"
import { LeadTable } from "@/components/admin/crm/lead-table"
import { columns } from "@/components/admin/crm/lead-columns"
import { CRMService, DBLead } from "@/services/crm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { CRMOverview } from "@/components/admin/crm/overview-cards"
import { NewLeadDialog } from "@/components/admin/crm/new-lead-dialog"
import { createClient } from "@/utils/supabase/client"

export default function CRMLeadsPage() {
    const [leads, setLeads] = useState<DBLead[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClient()

    const fetchLeads = useCallback(async () => {
        setLoading(true)
        try {
            const { leads } = await CRMService.getLeads({ page: 1, limit: 100 })
            setLeads(leads)
            setError(null)
        } catch (err: any) {
            console.error("Error fetching leads:", err)
            setError("Falha ao carregar leads. Verifique se o SQL foi aplicado.")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchLeads()
    }, [fetchLeads])

    // Realtime: update last_seen_at live in the table without full refetch
    useEffect(() => {
        const channel = supabase
            .channel("crm_leads_presence")
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "crm_leads",
                },
                (payload) => {
                    const updated = payload.new as DBLead
                    setLeads(prev =>
                        prev.map(l => l.id === updated.id ? { ...l, last_seen_at: (updated as any).last_seen_at } : l)
                    )
                }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [])

    if (loading) {
        return (
            <div className="flex h-[400px] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex h-[400px] w-full items-center justify-center text-destructive">
                <p>{error}</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <CRMOverview totalLeads={leads.length} />
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Base de Leads</CardTitle>
                    <NewLeadDialog onLeadCreated={fetchLeads} />
                </CardHeader>
                <CardContent>
                    <LeadTable columns={columns} data={leads} />
                </CardContent>
            </Card>
        </div>
    )
}
