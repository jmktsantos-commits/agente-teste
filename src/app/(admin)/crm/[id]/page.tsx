"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { CRMService, DBLead } from "@/services/crm"
import { UnifiedChat } from "@/components/admin/crm/unified-chat"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"

import { LeadProfileHeader } from "@/components/admin/crm/lead-profile-header"
import { LeadInsightsSidebar } from "@/components/admin/crm/lead-insights-sidebar"
import { LeadActivityFeed } from "@/components/admin/crm/lead-activity-feed"

export default function LeadDetailPage() {
    const params = useParams()
    const id = params?.id as string
    const [lead, setLead] = useState<DBLead | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchLead = async () => {
            if (!id) return
            try {
                const data = await CRMService.getLead(id)
                setLead(data)
            } catch (err) {
                console.error("Failed to fetch lead", err)
            } finally {
                setLoading(false)
            }
        }
        fetchLead()
    }, [id])

    if (loading) {
        return (
            <div className="flex h-[400px] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!lead) {
        return (
            <div className="flex h-[400px] w-full items-center justify-center text-destructive">
                <p>Lead não encontrado.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <LeadProfileHeader lead={lead} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Info & Insights */}
                <div className="space-y-6">
                    <LeadInsightsSidebar lead={lead} />
                </div>

                {/* Right Column: Unified Chat & Timeline */}
                <div className="lg:col-span-2">
                    <Tabs defaultValue="timeline" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="timeline">Timeline</TabsTrigger>
                            <TabsTrigger value="chat">Conversas</TabsTrigger>
                        </TabsList>

                        <TabsContent value="timeline" className="space-y-4">
                            <LeadActivityFeed leadId={lead.id} />
                        </TabsContent>

                        <TabsContent value="chat">
                            <UnifiedChat lead={lead} />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}
