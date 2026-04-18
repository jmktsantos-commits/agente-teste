"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, RefreshCw, UserCheck, UserX, Trash2, ShieldAlert, Clock, Users, LogOut } from "lucide-react"

interface TrialUser {
    id: string
    email: string
    full_name: string
    plan: string
    role: string
    trial_expires_at: string | null
    trial_activated_at: string | null
    partner_ref: string | null
}

export default function TrialsAdminPage() {
    const [trialUsers, setTrialUsers] = useState<TrialUser[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [grantEmail, setGrantEmail] = useState("")
    const [grantRef, setGrantRef] = useState("")
    const [grantLoading, setGrantLoading] = useState(false)
    const [grantMessage, setGrantMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null)
    const [filter, setFilter] = useState<"all" | "active" | "expired">("all")
    const [search, setSearch] = useState("")
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [bulkLoading, setBulkLoading] = useState(false)
    const [toast, setToast] = useState<string | null>(null)

    const showToast = (msg: string) => {
        setToast(msg)
        setTimeout(() => setToast(null), 3500)
    }

    // ── Fetch: busca TODOS que tiveram trial (trial_expires_at não nulo)
    //    + plano 'trial' mesmo sem data
    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true)
        else setRefreshing(true)

        const supabase = createClient()
        const { data: users } = await supabase
            .from("profiles")
            .select("id, email, full_name, plan, role, trial_expires_at, trial_activated_at, partner_ref")
            .or("trial_expires_at.not.is.null,plan.eq.trial")
            .not("role", "in", '("admin","affiliate")')
            .order("trial_activated_at", { ascending: false })
            .limit(200)

        setTrialUsers(users || [])
        setLoading(false)
        setRefreshing(false)
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    // ── API helper (service_role)
    const callAdminAction = async (action: string, userId: string) => {
        const res = await fetch("/api/admin/trials", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, userId }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Erro desconhecido")
        return data
    }

    // ── Ativar trial via email
    const handleGrantTrial = async () => {
        if (!grantEmail.trim()) return
        setGrantLoading(true)
        setGrantMessage(null)
        const supabase = createClient()
        const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", grantEmail.trim())
            .single()

        if (!profile) {
            setGrantMessage({ type: "err", text: "Usuário não encontrado com este email." })
            setGrantLoading(false)
            return
        }
        const { data, error } = await supabase.rpc("activate_trial", {
            p_user_id: profile.id,
            p_partner_ref: grantRef || "admin",
            p_activated_by: "admin",
        })
        if (error || !data?.success) {
            setGrantMessage({ type: "err", text: data?.error || error?.message || "Erro ao ativar trial" })
        } else {
            setGrantMessage({ type: "ok", text: `Trial ativado! Expira em: ${new Date(data.expires_at).toLocaleString("pt-BR")}` })
            setGrantEmail("")
            setGrantRef("")
            fetchData(true)
        }
        setGrantLoading(false)
    }

    // ── Ações individuais
    const handleGrantAccess = async (userId: string, name: string) => {
        if (!confirm(`Liberar acesso PRO permanente para ${name}?`)) return
        setActionLoading(userId + "_grant")
        try {
            await callAdminAction("grant", userId)
            showToast(`✅ ${name} liberado com acesso PRO.`)
            fetchData(true)
        } catch (e: unknown) {
            alert(`Erro: ${e instanceof Error ? e.message : e}`)
        }
        setActionLoading(null)
    }

    const handleBlock = async (userId: string, name: string) => {
        if (!confirm(`Bloquear acesso de ${name} imediatamente?`)) return
        setActionLoading(userId + "_block")
        try {
            await callAdminAction("block", userId)
            showToast(`⛔ ${name} bloqueado com sucesso.`)
            fetchData(true)
        } catch (e: unknown) {
            alert(`Erro ao bloquear: ${e instanceof Error ? e.message : e}`)
        }
        setActionLoading(null)
    }

    const handleDelete = async (userId: string, email: string) => {
        if (!confirm(`EXCLUIR o usuário ${email}? Esta ação não pode ser desfeita.`)) return
        setActionLoading(userId + "_delete")
        try {
            await callAdminAction("delete", userId)
            showToast(`🗑 Usuário ${email} excluído.`)
            fetchData(true)
        } catch (e: unknown) {
            alert(`Erro ao excluir: ${e instanceof Error ? e.message : e}`)
        }
        setActionLoading(null)
    }

    // ── Forçar logout imediato (revogar JWT mesmo estando navegando)
    const handleForceLogout = async (userId: string, name: string) => {
        if (!confirm(`Encerrar sessão de ${name} imediatamente? Ele será deslogado agora.`)) return
        setActionLoading(userId + "_logout")
        try {
            await callAdminAction("force_logout", userId)
            showToast(`🔒 Sessão de ${name} encerrada — ele foi deslogado.`)
            fetchData(true)
        } catch (e: unknown) {
            alert(`Erro ao encerrar sessão: ${e instanceof Error ? e.message : e}`)
        }
        setActionLoading(null)
    }

    // ── Bloquear TODOS expirados pelo tempo (trial_expires_at <= now)
    const handleBlockAllExpired = async () => {
        const expired = trialUsers.filter(u => u.trial_expires_at && new Date(u.trial_expires_at) <= now)
        if (expired.length === 0) { showToast("Nenhum trial expirado para bloquear."); return }
        if (!confirm(`Bloquear ${expired.length} usuários com trial expirado?`)) return
        setBulkLoading(true)
        let ok = 0
        for (const u of expired) {
            try { await callAdminAction("block", u.id); ok++ } catch { /* skip */ }
        }
        showToast(`⛔ ${ok} usuários bloqueados.`)
        await fetchData(true)
        setBulkLoading(false)
    }

    // ── Corrigir ativados há mais de 7 dias que ainda aparecem como ativos
    const handleBlockAllOverdue = async () => {
        if (!confirm("Bloquear todos os usuários cujo trial foi ativado há mais de 7 dias? Isso corrige quem foi re-ativado por engano.")) return
        setBulkLoading(true)
        try {
            const res = await fetch('/api/admin/trials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'block_all_overdue' }),
            })
            const data = await res.json()
            showToast(`⛔ ${data.blocked ?? 0} usuários com trial vencido (> 7 dias desde ativação) foram bloqueados.`)
            await fetchData(true)
        } catch (e: unknown) {
            alert(`Erro: ${e instanceof Error ? e.message : e}`)
        }
        setBulkLoading(false)
    }

    const now = new Date()

    // ── Filtros + busca
    const filteredUsers = trialUsers.filter(u => {
        const matchSearch = !search ||
            u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
            u.email?.toLowerCase().includes(search.toLowerCase())

        const isActive = u.trial_expires_at && new Date(u.trial_expires_at) > now
        const isExpired = !u.trial_expires_at || new Date(u.trial_expires_at) <= now

        if (filter === "active" && !isActive) return false
        if (filter === "expired" && !isExpired) return false
        return matchSearch
    })

    const activeCount = trialUsers.filter(u => u.trial_expires_at && new Date(u.trial_expires_at) > now).length
    const expiredCount = trialUsers.filter(u => !u.trial_expires_at || new Date(u.trial_expires_at) <= now).length
    // Ativados há mais de 7 dias mas ainda aparecem com trial_expires_at > now (dados errados)
    const overdueCount = trialUsers.filter(u => {
        if (!u.trial_activated_at) return false
        const activatedMoreThan7DaysAgo = new Date(u.trial_activated_at).getTime() < now.getTime() - 7 * 24 * 3600 * 1000
        const appearsActive = u.trial_expires_at && new Date(u.trial_expires_at) > now
        return activatedMoreThan7DaysAgo && appearsActive
    }).length

    const getStatusBadge = (u: TrialUser) => {
        if (!u.trial_expires_at) {
            return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 whitespace-nowrap">⚠️ Sem data</Badge>
        }
        const isActive = new Date(u.trial_expires_at) > now
        return isActive
            ? <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 whitespace-nowrap">✅ Trial Ativo</Badge>
            : <Badge className="bg-red-500/20 text-red-400 border-red-500/30 whitespace-nowrap">🔴 Expirado</Badge>
    }

    const getTimeInfo = (u: TrialUser) => {
        if (!u.trial_expires_at) return <span className="text-yellow-500 text-xs">— congelado</span>
        const diff = new Date(u.trial_expires_at).getTime() - now.getTime()
        if (diff <= 0) {
            const ago = Math.abs(Math.floor(diff / (1000 * 60 * 60)))
            return <span className="text-red-400 text-xs">Expirado há {ago}h</span>
        }
        const h = Math.floor(diff / (1000 * 60 * 60))
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        return <span className="text-emerald-400 text-xs">{h}h {m}m restantes</span>
    }

    return (
        <div className="space-y-6 relative">

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-50 bg-slate-800 border border-slate-700 text-white text-sm px-5 py-3 rounded-xl shadow-2xl animate-in slide-in-from-bottom-3">
                    {toast}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Gestão de Trials</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Gerencie os acessos gratuitos de 7 dias.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-xs"
                        onClick={() => fetchData(true)}
                        disabled={refreshing}
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                        Atualizar
                    </Button>
                    {overdueCount > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 text-xs text-orange-400 border-orange-500/30 hover:bg-orange-500/10"
                            onClick={handleBlockAllOverdue}
                            disabled={bulkLoading}
                        >
                            <ShieldAlert className="h-3.5 w-3.5" />
                            {bulkLoading ? "Corrigindo..." : `Corrigir dados errados (${overdueCount})`}
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10"
                        onClick={handleBlockAllExpired}
                        disabled={bulkLoading || expiredCount === 0}
                    >
                        <ShieldAlert className="h-3.5 w-3.5" />
                        {bulkLoading ? "Bloqueando..." : `Bloquear expirados (${expiredCount})`}
                    </Button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                {[
                    { label: "Total", value: trialUsers.length, color: "text-blue-400", icon: Users },
                    { label: "Ativos", value: activeCount, color: "text-emerald-400", icon: UserCheck },
                    { label: "Expirados", value: expiredCount, color: "text-red-400", icon: UserX },
                    { label: "Dados errados (⚠️ ativado > 7 dias)", value: overdueCount, color: overdueCount > 0 ? "text-orange-400" : "text-muted-foreground", icon: ShieldAlert },
                ].map((s, i) => (
                    <Card key={i} className="border-slate-800">
                        <CardContent className="pt-5 pb-4">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-xs text-muted-foreground">{s.label}</p>
                                <s.icon className={`h-4 w-4 ${s.color} opacity-60`} />
                            </div>
                            <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Ativar Trial Manualmente */}
            <Card className="border-slate-800">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">🎁 Ativar Trial Manualmente</CardTitle>
                    <CardDescription>Dê acesso gratuito de 7 dias a um usuário pelo email.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Input
                            placeholder="Email do usuário"
                            value={grantEmail}
                            onChange={e => setGrantEmail(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleGrantTrial()}
                            className="flex-1 bg-slate-900 border-slate-700"
                        />
                        <Input
                            placeholder="Código parceiro (opcional)"
                            value={grantRef}
                            onChange={e => setGrantRef(e.target.value)}
                            className="w-full sm:w-48 bg-slate-900 border-slate-700"
                        />
                        <Button onClick={handleGrantTrial} disabled={grantLoading || !grantEmail} className="shrink-0">
                            {grantLoading ? "Ativando..." : "Ativar Trial"}
                        </Button>
                    </div>
                    {grantMessage && (
                        <p className={`mt-3 text-sm ${grantMessage.type === "ok" ? "text-emerald-400" : "text-red-400"}`}>
                            {grantMessage.type === "ok" ? "✅" : "❌"} {grantMessage.text}
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Lista de Usuários */}
            <Card className="border-slate-800">
                <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <CardTitle className="text-base">Usuários em Trial</CardTitle>
                            <CardDescription>{filteredUsers.length} de {trialUsers.length} registros</CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar usuário..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="pl-8 h-8 text-xs w-44 bg-slate-900 border-slate-700"
                                />
                            </div>
                            {/* Filter tabs */}
                            <div className="flex gap-1">
                                {(["all", "active", "expired"] as const).map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap ${filter === f
                                            ? "bg-purple-600 text-white border-purple-600"
                                            : "border-slate-700 text-muted-foreground hover:text-foreground hover:border-slate-500"
                                        }`}
                                    >
                                        {f === "all" ? `Todos (${trialUsers.length})` : f === "active" ? `Ativos (${activeCount})` : `Expirados (${expiredCount})`}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <RefreshCw className="h-6 w-6 text-muted-foreground animate-spin" />
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
                            <Users className="h-8 w-8 opacity-30" />
                            <p className="text-sm">Nenhum usuário encontrado.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-800 text-muted-foreground text-xs uppercase tracking-wider">
                                        <th className="text-left px-6 py-3">Usuário</th>
                                        <th className="text-left px-4 py-3">Status</th>
                                        <th className="text-left px-4 py-3">Tempo</th>
                                        <th className="text-left px-4 py-3 hidden md:table-cell">Ativado em</th>
                                        <th className="text-left px-4 py-3 hidden lg:table-cell">Expira em</th>
                                        <th className="text-right px-6 py-3">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {filteredUsers.map(u => {
                                        const isExpired = !u.trial_expires_at || new Date(u.trial_expires_at) <= now
                                        return (
                                            <tr
                                                key={u.id}
                                                className={`transition-colors hover:bg-slate-800/40 ${isExpired ? "opacity-70" : ""}`}
                                            >
                                                <td className="px-6 py-3">
                                                    <div className="font-medium text-white">{u.full_name || "Sem nome"}</div>
                                                    <div className="text-xs text-muted-foreground">{u.email}</div>
                                                </td>
                                                <td className="px-4 py-3">{getStatusBadge(u)}</td>
                                                <td className="px-4 py-3">{getTimeInfo(u)}</td>
                                                <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
                                                    {u.trial_activated_at
                                                        ? new Date(u.trial_activated_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
                                                        : "—"}
                                                </td>
                                                <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                                                    {u.trial_expires_at
                                                        ? new Date(u.trial_expires_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
                                                        : "—"}
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            disabled={actionLoading !== null}
                                                            onClick={() => handleGrantAccess(u.id, u.full_name || u.email)}
                                                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-40 transition-all"
                                                        >
                                                            {actionLoading === u.id + "_grant"
                                                                ? <RefreshCw className="h-3 w-3 animate-spin" />
                                                                : <UserCheck className="h-3 w-3" />}
                                                            <span className="hidden sm:inline">Liberar</span>
                                                        </button>
                                                        <button
                                                            disabled={actionLoading !== null}
                                                            onClick={() => handleBlock(u.id, u.full_name || u.email)}
                                                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 disabled:opacity-40 transition-all"
                                                            title="Bloquear acesso"
                                                        >
                                                            {actionLoading === u.id + "_block"
                                                                ? <RefreshCw className="h-3 w-3 animate-spin" />
                                                                : <UserX className="h-3 w-3" />}
                                                            <span className="hidden sm:inline">Bloquear</span>
                                                        </button>
                                                        <button
                                                            disabled={actionLoading !== null}
                                                            onClick={() => handleForceLogout(u.id, u.full_name || u.email)}
                                                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 disabled:opacity-40 transition-all"
                                                            title="Forçar logout (encerrar sessão agora)"
                                                        >
                                                            {actionLoading === u.id + "_logout"
                                                                ? <RefreshCw className="h-3 w-3 animate-spin" />
                                                                : <LogOut className="h-3 w-3" />}
                                                            <span className="hidden sm:inline">Logout</span>
                                                        </button>
                                                        <button
                                                            disabled={actionLoading !== null}
                                                            onClick={() => handleDelete(u.id, u.email)}
                                                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-40 transition-all"
                                                        >
                                                            {actionLoading === u.id + "_delete"
                                                                ? <RefreshCw className="h-3 w-3 animate-spin" />
                                                                : <Trash2 className="h-3 w-3" />}
                                                            <span className="hidden sm:inline">Excluir</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
