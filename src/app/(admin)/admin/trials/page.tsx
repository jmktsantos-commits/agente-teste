"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface TrialUser {
    id: string
    email: string
    full_name: string
    plan: string
    trial_expires_at: string | null
    trial_activated_at: string | null
    partner_ref: string | null
}

interface Partner {
    code: string
    name: string
    trials_generated: number
    conversions: number
}

export default function TrialsAdminPage() {
    const [trialUsers, setTrialUsers] = useState<TrialUser[]>([])
    const [partners, setPartners] = useState<Partner[]>([])
    const [loading, setLoading] = useState(true)
    const [grantEmail, setGrantEmail] = useState("")
    const [grantRef, setGrantRef] = useState("")
    const [grantLoading, setGrantLoading] = useState(false)
    const [grantMessage, setGrantMessage] = useState("")
    const [filter, setFilter] = useState<"all" | "active" | "expired">("all")

    const fetchData = useCallback(async () => {
        const supabase = createClient()

        const { data: users } = await supabase
            .from("profiles")
            .select("id, email, full_name, plan, trial_expires_at, trial_activated_at, partner_ref")
            .in("plan", ["trial", "pro", "vip"])
            .order("trial_activated_at", { ascending: false })
            .limit(100)

        const { data: parts } = await supabase
            .from("trial_partners")
            .select("code, name, trials_generated, conversions")
            .order("trials_generated", { ascending: false })

        setTrialUsers(users || [])
        setPartners(parts || [])
        setLoading(false)
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    const handleGrantTrial = async () => {
        if (!grantEmail.trim()) return
        setGrantLoading(true)
        setGrantMessage("")

        const supabase = createClient()

        // Buscar o user_id pelo email
        const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", grantEmail.trim())
            .single()

        if (!profile) {
            setGrantMessage("❌ Usuário não encontrado com este email.")
            setGrantLoading(false)
            return
        }

        // Chamar a função SQL de ativação
        const { data, error } = await supabase.rpc("activate_trial", {
            p_user_id: profile.id,
            p_partner_ref: grantRef || "admin",
            p_activated_by: "admin"
        })

        if (error || !data?.success) {
            setGrantMessage(`❌ ${data?.error || error?.message || "Erro ao ativar trial"}`)
        } else {
            setGrantMessage(`✅ Trial ativado! Expira em: ${new Date(data.expires_at).toLocaleString("pt-BR")}`)
            setGrantEmail("")
            setGrantRef("")
            fetchData()
        }
        setGrantLoading(false)
    }

    const now = new Date()

    const filteredUsers = trialUsers.filter(u => {
        if (filter === "all") return u.plan === "trial"
        if (filter === "active") return u.plan === "trial" && u.trial_expires_at && new Date(u.trial_expires_at) > now
        if (filter === "expired") return u.plan === "trial" && u.trial_expires_at && new Date(u.trial_expires_at) <= now
        return true
    })

    const activeCount = trialUsers.filter(u => u.plan === "trial" && u.trial_expires_at && new Date(u.trial_expires_at) > now).length
    const expiredCount = trialUsers.filter(u => u.plan === "trial" && u.trial_expires_at && new Date(u.trial_expires_at) <= now).length
    const totalTrials = trialUsers.filter(u => u.plan === "trial").length

    const getPlanBadge = (user: TrialUser) => {
        if (user.plan !== "trial") return <Badge variant="default">{user.plan.toUpperCase()}</Badge>
        const isActive = user.trial_expires_at && new Date(user.trial_expires_at) > now
        return isActive
            ? <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Trial Ativo</Badge>
            : <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Trial Expirado</Badge>
    }

    const getHoursLeft = (expiresAt: string | null) => {
        if (!expiresAt) return "—"
        const diff = new Date(expiresAt).getTime() - now.getTime()
        if (diff <= 0) return "Expirado"
        const h = Math.floor(diff / (1000 * 60 * 60))
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        return `${h}h ${m}m restantes`
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Gestão de Trials</h1>
                <p className="text-muted-foreground mt-1 text-sm">Acompanhe e gerencie os acessos gratuitos de 24h.</p>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                {[
                    { label: "Total de Trials", value: totalTrials, color: "text-blue-400" },
                    { label: "Trials Ativos", value: activeCount, color: "text-emerald-400" },
                    { label: "Trials Expirados", value: expiredCount, color: "text-red-400" },
                    { label: "Taxa de Conversão", value: `${totalTrials > 0 ? Math.round(((trialUsers.length - totalTrials) / trialUsers.length) * 100) : 0}%`, color: "text-purple-400" },
                ].map((s, i) => (
                    <Card key={i}>
                        <CardContent className="pt-6">
                            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                            <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Dar Trial Manualmente */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">🎁 Ativar Trial Manualmente</CardTitle>
                    <CardDescription>Dê acesso gratuito de 24h a um usuário pelo email.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Input
                            placeholder="Email do usuário"
                            value={grantEmail}
                            onChange={e => setGrantEmail(e.target.value)}
                            className="flex-1"
                        />
                        <Input
                            placeholder="Código parceiro (opcional)"
                            value={grantRef}
                            onChange={e => setGrantRef(e.target.value)}
                            className="w-full sm:w-48"
                        />
                        <Button onClick={handleGrantTrial} disabled={grantLoading || !grantEmail}>
                            {grantLoading ? "Ativando..." : "Ativar Trial"}
                        </Button>
                    </div>
                    {grantMessage && (
                        <p className="mt-3 text-sm text-muted-foreground">{grantMessage}</p>
                    )}
                </CardContent>
            </Card>

            {/* Lista de Trials */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                            <CardTitle className="text-base">Usuários em Trial</CardTitle>
                            <CardDescription>Lista de todos os trials gerados</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            {(["all", "active", "expired"] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${filter === f
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "border-border text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    {f === "all" ? "Todos" : f === "active" ? "Ativos" : "Expirados"}
                                </button>
                            ))}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
                    ) : filteredUsers.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">Nenhum trial encontrado.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                                        <th className="text-left pb-3 pr-4">Usuário</th>
                                        <th className="text-left pb-3 pr-4">Status</th>
                                        <th className="text-left pb-3 pr-4">Tempo Restante</th>
                                        <th className="text-left pb-3 pr-4">Parceiro</th>
                                        <th className="text-left pb-3">Ativado em</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredUsers.map(u => (
                                        <tr key={u.id} className="hover:bg-accent/30 transition-colors">
                                            <td className="py-3 pr-4">
                                                <div className="font-medium">{u.full_name || "Sem nome"}</div>
                                                <div className="text-xs text-muted-foreground">{u.email}</div>
                                            </td>
                                            <td className="py-3 pr-4">{getPlanBadge(u)}</td>
                                            <td className="py-3 pr-4 text-xs text-muted-foreground">{getHoursLeft(u.trial_expires_at)}</td>
                                            <td className="py-3 pr-4">
                                                {u.partner_ref ? (
                                                    <Badge variant="outline" className="text-xs">{u.partner_ref}</Badge>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="py-3 text-xs text-muted-foreground">
                                                {u.trial_activated_at
                                                    ? new Date(u.trial_activated_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
                                                    : "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Parceiros */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">🤝 Parceiros</CardTitle>
                    <CardDescription>Trials gerados e conversões por parceiro</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {partners.map((p, i) => (
                            <div key={i} className="bg-accent/20 border border-border rounded-xl p-4">
                                <div className="font-semibold">{p.name}</div>
                                <div className="text-xs text-muted-foreground mb-3">{p.code}</div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <div className="text-lg font-bold text-blue-400">{p.trials_generated}</div>
                                        <div className="text-xs text-muted-foreground">Trials</div>
                                    </div>
                                    <div>
                                        <div className="text-lg font-bold text-emerald-400">{p.conversions}</div>
                                        <div className="text-xs text-muted-foreground">Conversões</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Link de exemplo */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">🔗 Links de Trial por Parceiro</CardTitle>
                    <CardDescription>Compartilhe estes links com seus parceiros para rastrear cadastros</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {partners.slice(0, 5).map((p, i) => (
                            <div key={i} className="flex items-center gap-3 bg-accent/10 rounded-lg px-3 py-2">
                                <span className="text-xs text-muted-foreground w-24 flex-shrink-0">{p.name}:</span>
                                <code className="text-xs text-emerald-400 flex-1 truncate">
                                    {typeof window !== "undefined" ? window.location.origin : "https://seusite.com"}/ativar-trial?ref={p.code}
                                </code>
                                <button
                                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/ativar-trial?ref=${p.code}`)}
                                    className="text-xs text-muted-foreground hover:text-foreground flex-shrink-0"
                                >
                                    Copiar
                                </button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
