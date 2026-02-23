"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { getMyAffiliateData, getAffiliateLeads, getAffiliateCommissions } from "@/app/actions/affiliate-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, DollarSign, TrendingUp, Link, Copy, CheckCircle, Loader2 } from "lucide-react"

export default function AffiliateDashboard() {
    const [affiliate, setAffiliate] = useState<any>(null)
    const [recentLeads, setRecentLeads] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [copied, setCopied] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const [{ affiliate: aff }, { leads }] = await Promise.all([
                getMyAffiliateData(user.id),
                getAffiliateLeads(user.id, 1, 5),
            ])
            setAffiliate(aff)
            setRecentLeads(leads)
            setLoading(false)
        }
        load()
    }, [])

    const referralLink = affiliate
        ? `${typeof window !== "undefined" ? window.location.origin : ""}/registro?btag=${affiliate.btag}`
        : ""

    const copyLink = () => {
        navigator.clipboard.writeText(referralLink)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!affiliate) {
        return (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
                Conta de afiliado não encontrada.
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    Olá, {affiliate.full_name?.split(" ")[0]}! 👋
                </h1>
                <p className="text-muted-foreground mt-1">
                    Aqui está um resumo do seu desempenho como afiliado.
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    {
                        label: "Total de Leads",
                        value: affiliate.total_leads || 0,
                        icon: Users,
                        color: "text-blue-500",
                        bg: "bg-blue-500/10",
                    },
                    {
                        label: "Conversões",
                        value: affiliate.total_conversions || 0,
                        icon: TrendingUp,
                        color: "text-emerald-500",
                        bg: "bg-emerald-500/10",
                    },
                    {
                        label: "Comissão Total",
                        value: `R$ ${Number(affiliate.total_commission || 0).toFixed(2)}`,
                        icon: DollarSign,
                        color: "text-yellow-500",
                        bg: "bg-yellow-500/10",
                    },
                    {
                        label: "Minha Comissão",
                        value: `${affiliate.commission_rate}%`,
                        icon: TrendingUp,
                        color: "text-purple-500",
                        bg: "bg-purple-500/10",
                    },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                    <Card key={label} className="border-border">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${bg} ${color}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xl font-bold">{value}</p>
                                    <p className="text-xs text-muted-foreground">{label}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Referral Link */}
            <Card className="border-emerald-500/30 bg-emerald-500/5">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Link className="w-4 h-4 text-emerald-500" />
                        Seu Link de Indicação
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2">
                        <code className="flex-1 bg-background border rounded-lg px-3 py-2 text-sm font-mono text-muted-foreground overflow-x-auto">
                            {referralLink}
                        </code>
                        <Button onClick={copyLink} variant="outline" className="gap-2 shrink-0">
                            {copied ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                            {copied ? "Copiado!" : "Copiar"}
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        Compartilhe esse link. Qualquer pessoa que se cadastrar por ele será vinculada ao seu perfil de afiliado.
                    </p>
                </CardContent>
            </Card>

            {/* Recent Leads */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Leads Recentes</CardTitle>
                    <Button variant="ghost" size="sm" asChild>
                        <a href="/affiliate/leads">Ver todos →</a>
                    </Button>
                </CardHeader>
                <CardContent>
                    {recentLeads.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">
                            Nenhum lead ainda. Compartilhe seu link para começar!
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {recentLeads.map((lead) => (
                                <div key={lead.id} className="flex items-center justify-between py-2 border-b last:border-0">
                                    <div>
                                        <p className="text-sm font-medium">{lead.full_name}</p>
                                        <p className="text-xs text-muted-foreground">{lead.phone || lead.email || "—"}</p>
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className={lead.status === "converted"
                                            ? "border-emerald-500/30 text-emerald-500"
                                            : "border-border text-muted-foreground"
                                        }
                                    >
                                        {lead.status}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
