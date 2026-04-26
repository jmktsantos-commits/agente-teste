"use client"

import { useState, useEffect } from "react"
import { getUsers, updateUserRole, updateUserStatus, deleteUser } from "@/app/actions/admin-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Loader2, MoreHorizontal, Search, Trash, Shield, ShieldOff,
    Ban, CheckCircle, Eye, Users, UserPlus, X, Check
} from "lucide-react"
import { formatDistanceToNow, format, differenceInHours, differenceInDays, isPast } from "date-fns"
import { ptBR } from "date-fns/locale"

function isOnline(lastSeen: string | null): boolean {
    if (!lastSeen) return false
    return Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000
}

// Live countdown HH:MM:SS para trial < 24h
function TrialCountdown({ expiresAt }: { expiresAt: string }) {
    const [, forceUpdate] = useState(0)
    useEffect(() => {
        const t = setInterval(() => forceUpdate(n => n + 1), 1000)
        return () => clearInterval(t)
    }, [])
    const diff = new Date(expiresAt).getTime() - Date.now()
    if (diff <= 0) return <span className="text-red-400 font-mono font-bold">Expirado</span>
    const h = Math.floor(diff / 3600000).toString().padStart(2, '0')
    const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0')
    const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0')
    return (
        <span className="inline-flex items-center gap-1.5 font-mono font-bold text-yellow-400">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-ping shrink-0" />
            {h}:{m}:{s}
        </span>
    )
}

// Helper: exibe status do trial com cor
function TrialBadge({ trialExpiresAt }: { trialExpiresAt: string | null }) {
    if (!trialExpiresAt) {
        return <span className="text-xs text-muted-foreground">—</span>
    }
    const expiry = new Date(trialExpiresAt)
    const expired = isPast(expiry)
    const hoursLeft = differenceInHours(expiry, new Date())
    const daysLeft  = differenceInDays(expiry, new Date())

    if (expired) {
        return (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                Expirado
            </span>
        )
    }
    // < 24h → contador ao vivo
    if (hoursLeft < 24) {
        return <TrialCountdown expiresAt={trialExpiresAt} />
    }
    return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {daysLeft}d restante{daysLeft !== 1 ? 's' : ''}
        </span>
    )
}

// ── Componente: Formulário de criação de usuário ──────────────────────────────
function CreateUserForm({ onCreated }: { onCreated: () => void }) {
    const [form, setForm] = useState({
        email: '', password: '', fullName: '', plan: 'trial', role: 'user'
    })
    const [loading, setLoading] = useState(false)
    const [toast, setToast] = useState<{ type: 'success' | 'error', msg: string } | null>(null)
    const [createdUser, setCreatedUser] = useState<{
        email: string
        password: string
        magicLink?: string
        magicLinkError?: string
    } | null>(null)
    const [linkLoading, setLinkLoading] = useState(false)
    const [copied, setCopied] = useState(false)

    const showToast = (type: 'success' | 'error', msg: string) => {
        setToast({ type, msg })
        setTimeout(() => setToast(null), 5000)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.email || !form.password) {
            showToast('error', 'Email e senha são obrigatórios.')
            return
        }
        if (form.password.length < 6) {
            showToast('error', 'Senha deve ter no mínimo 6 caracteres.')
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create_user', ...form }),
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.error || 'Erro ao criar usuário')

            // Gerar link mágico automaticamente
            setLinkLoading(true)
            let magicLink: string | undefined
            let magicLinkError: string | undefined
            try {
                const linkRes = await fetch('/api/admin/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'generate_magic_link', email: form.email }),
                })
                const linkData = await linkRes.json()
                if (linkData.magicLink) {
                    magicLink = linkData.magicLink
                } else {
                    magicLinkError = linkData.error || 'Não foi possível gerar o link. Use o email + senha abaixo.'
                }
            } catch {
                magicLinkError = 'Erro ao gerar link. Use o email + senha para acessar.'
            } finally {
                setLinkLoading(false)
            }

            // Sempre exibe o painel com as credenciais
            setCreatedUser({
                email: form.email,
                password: form.password,
                magicLink,
                magicLinkError,
            })

            showToast('success', `✅ Usuário ${form.email} criado! As credenciais estao exibidas abaixo.`)
            setForm({ email: '', password: '', fullName: '', plan: 'trial', role: 'user' })
            onCreated()
        } catch (err: unknown) {
            showToast('error', err instanceof Error ? err.message : 'Erro desconhecido')
        }
        setLoading(false)
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-purple-400" />
                    Adicionar Usuário Manualmente
                </CardTitle>
                <CardDescription>
                    Cria o login e o perfil do usuário. O email já é confirmado automaticamente.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {toast && (
                    <div className={`mb-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium border
                        ${toast.type === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                        }`}>
                        {toast.type === 'success' ? <Check className="h-4 w-4 shrink-0" /> : <X className="h-4 w-4 shrink-0" />}
                        {toast.msg}
                    </div>
                )}

                {/* Credenciais do usuário recém criado */}
                {createdUser && (
                    <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
                        <p className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                            <Check className="h-4 w-4" /> Usuário criado — compartilhe as credenciais abaixo:
                        </p>
                        <div className="grid grid-cols-1 gap-2 text-sm">
                            <div className="flex items-center justify-between gap-2 bg-black/20 rounded-lg px-3 py-2">
                                <div>
                                    <span className="text-xs text-muted-foreground">Email:</span>
                                    <p className="text-white font-mono">{createdUser.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between gap-2 bg-black/20 rounded-lg px-3 py-2">
                                <div>
                                    <span className="text-xs text-muted-foreground">Senha:</span>
                                    <p className="text-white font-mono">{createdUser.password}</p>
                                </div>
                            </div>
                        </div>
                        {linkLoading && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Loader2 className="h-3 w-3 animate-spin" /> Gerando link de acesso...
                            </div>
                        )}
                        {!linkLoading && createdUser.magicLink && (
                            <div className="space-y-1.5">
                                <p className="text-xs text-muted-foreground">🔗 Link de acesso direto (válido por 24h):</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-xs font-mono text-purple-300 bg-black/30 rounded px-2 py-1.5 flex-1 break-all">
                                        {createdUser.magicLink}
                                    </p>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="shrink-0 h-7 text-xs border-purple-500/30"
                                        onClick={() => copyToClipboard(createdUser.magicLink!)}
                                    >
                                        {copied ? <Check className="h-3 w-3 text-emerald-400" /> : 'Copiar'}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">💡 Envie via WhatsApp — o usuário clica e entra direto, sem digitar senha.</p>
                            </div>
                        )}
                        {!linkLoading && createdUser.magicLinkError && (
                            <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-3 py-2">
                                <p className="text-xs text-yellow-400">⚠️ {createdUser.magicLinkError}</p>
                                <p className="text-xs text-muted-foreground mt-1">Envie o email e a senha acima pelo WhatsApp.</p>
                            </div>
                        )}
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs text-muted-foreground"
                            onClick={() => setCreatedUser(null)}
                        >
                            Fechar
                        </Button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Nome */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Nome completo
                        </label>
                        <Input
                            placeholder="Ex: João Silva"
                            value={form.fullName}
                            onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                            className="bg-slate-800/50 border-slate-700"
                        />
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Email <span className="text-red-400">*</span>
                        </label>
                        <Input
                            type="email"
                            placeholder="email@exemplo.com"
                            value={form.email}
                            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                            required
                            className="bg-slate-800/50 border-slate-700"
                        />
                    </div>

                    {/* Senha */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Senha <span className="text-red-400">*</span>
                        </label>
                        <Input
                            type="password"
                            placeholder="Mínimo 6 caracteres"
                            value={form.password}
                            onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                            required
                            className="bg-slate-800/50 border-slate-700"
                        />
                    </div>

                    {/* Plano */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Plano / Acesso
                        </label>
                        <select
                            value={form.plan}
                            onChange={e => setForm(p => ({ ...p, plan: e.target.value }))}
                            className="w-full rounded-md border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-purple-500"
                        >
                            <option value="trial">🕐 Trial (7 dias)</option>
                            <option value="pro">⭐ Pro (acesso completo)</option>
                            <option value="vip">💎 VIP</option>
                            <option value="starter">🚀 Starter</option>
                        </select>
                    </div>

                    {/* Role */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Função
                        </label>
                        <select
                            value={form.role}
                            onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                            className="w-full rounded-md border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-purple-500"
                        >
                            <option value="user">👤 Usuário comum</option>
                            <option value="affiliate">🤝 Afiliado</option>
                            <option value="admin">🛡️ Admin</option>
                        </select>
                    </div>

                    {/* Botão */}
                    <div className="flex items-end">
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold gap-2"
                        >
                            {loading
                                ? <><Loader2 className="h-4 w-4 animate-spin" /> Criando...</>
                                : <><UserPlus className="h-4 w-4" /> Criar Usuário</>
                            }
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function UsersPage() {
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [selectedUser, setSelectedUser] = useState<any>(null)

    const loadUsers = async () => {
        setLoading(true)
        const { users } = await getUsers(1, 50, search)
        setUsers(users || [])
        setLoading(false)
    }

    useEffect(() => {
        const debounce = setTimeout(loadUsers, 500)
        return () => clearTimeout(debounce)
    }, [search])

    const handleAction = async (action: string, userId: string, value?: any) => {
        if (!confirm("Tem certeza que deseja realizar esta ação?")) return

        let result
        if (action === "role") result = await updateUserRole(userId, value)
        if (action === "status") result = await updateUserStatus(userId, value)
        if (action === "delete") result = await deleteUser(userId)

        if (result?.success) {
            loadUsers()
        } else {
            alert(`Erro: ${result?.error ?? "Ação falhou. Verifique as permissões."}`)
        }
    }

    const onlineCount = users.filter(u => isOnline(u.last_seen)).length

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gerenciar Usuários</h1>
                    <p className="text-muted-foreground mt-1">Visualize, crie e gerencie todos os usuários cadastrados.</p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <div className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 bg-card">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{users.length}</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full border border-green-500/30 px-3 py-1.5 bg-green-500/5">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                        </span>
                        <span className="font-medium text-green-500">{onlineCount} online</span>
                    </div>
                </div>
            </div>

            {/* ── SEÇÃO: Adicionar Usuário ── */}
            <CreateUserForm onCreated={loadUsers} />

            {/* Busca */}
            <div className="flex items-center space-x-2">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome ou email..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Tabela */}
            <div className="rounded-lg border bg-card overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30">
                            <TableHead>Usuário</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Trial</TableHead>
                            <TableHead>Visto por último</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    Nenhum usuário encontrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => {
                                const online = isOnline(user.last_seen)
                                return (
                                    <TableRow key={user.id} className="hover:bg-muted/20 transition-colors">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-semibold">
                                                        {(user.full_name || user.email || "?").charAt(0).toUpperCase()}
                                                    </div>
                                                    {online && (
                                                        <span className="absolute bottom-0 right-0 flex h-2.5 w-2.5">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 border-2 border-background" />
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{user.full_name || "Sem nome"}</span>
                                                    <span className="text-xs text-muted-foreground">{user.email}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={user.status === 'active'
                                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20'
                                                : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20'
                                            }>
                                                {user.status === 'active' ? 'Ativo' : 'Banido'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {user.role === 'admin' && <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Admin</Badge>}
                                            {user.role === 'affiliate' && <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Afiliado</Badge>}
                                            {user.role === 'user' && user.btag && (
                                                <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20" title={`Veio pelo afiliado: ${user.btag}`}>Lead Afiliado</Badge>
                                            )}
                                            {user.role === 'user' && !user.btag && (
                                                <Badge className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20">Direto</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <TrialBadge trialExpiresAt={user.trial_expires_at ?? null} />
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {online
                                                ? <span className="text-green-500 font-medium">Online agora</span>
                                                : user.last_seen
                                                    ? formatDistanceToNow(new Date(user.last_seen), { addSuffix: true, locale: ptBR })
                                                    : '-'
                                            }
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => setSelectedUser(user)}>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        Ver Detalhes
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.id)}>
                                                        Copiar ID
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => handleAction('role', user.id, user.role === 'admin' ? 'user' : 'admin')}>
                                                        {user.role === 'admin' ? <ShieldOff className="mr-2 h-4 w-4" /> : <Shield className="mr-2 h-4 w-4" />}
                                                        {user.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleAction('status', user.id, user.status === 'active' ? 'banned' : 'active')}>
                                                        {user.status === 'active' ? <Ban className="mr-2 h-4 w-4" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                                        {user.status === 'active' ? 'Banir Usuário' : 'Reativar Usuário'}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-red-600" onClick={() => handleAction('delete', user.id)}>
                                                        <Trash className="mr-2 h-4 w-4" />
                                                        Excluir Permanentemente
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* User Details Dialog */}
            <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Detalhes do Usuário</DialogTitle>
                        <DialogDescription>Informações completas do cadastro.</DialogDescription>
                    </DialogHeader>
                    {selectedUser && (
                        <div className="space-y-4">

                            {/* Avatar + nome */}
                            <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 border">
                                <div className="relative shrink-0">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-lg font-bold">
                                        {(selectedUser.full_name || selectedUser.email || "?").charAt(0).toUpperCase()}
                                    </div>
                                    {isOnline(selectedUser.last_seen) && (
                                        <span className="absolute bottom-0 right-0 flex h-3.5 w-3.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border-2 border-background" />
                                        </span>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-semibold text-base truncate">{selectedUser.full_name || "Sem nome"}</h3>
                                    <p className="text-sm text-muted-foreground truncate">{selectedUser.email}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge className={selectedUser.status === 'active'
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] px-1.5 py-0'
                                            : 'bg-red-500/10 text-red-400 border-red-500/20 text-[10px] px-1.5 py-0'}>
                                            {selectedUser.status === 'active' ? 'Ativo' : 'Banido'}
                                        </Badge>
                                        {isOnline(selectedUser.last_seen) && (
                                            <span className="text-[10px] text-green-500 font-medium">● Online agora</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ─── Linha 1: Info de Contato ─── */}
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">Contato</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="rounded-lg border bg-card p-3">
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Telefone</p>
                                        <p className="text-sm font-semibold mt-1">{selectedUser.phone || <span className="text-muted-foreground">—</span>}</p>
                                    </div>
                                    <div className="rounded-lg border bg-card p-3">
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Data Nasc.</p>
                                        <p className="text-sm font-semibold mt-1">
                                            {selectedUser.birth_date
                                                ? format(new Date(selectedUser.birth_date + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })
                                                : <span className="text-muted-foreground">—</span>}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* ─── Linha 2: IDs e Plano ─── */}
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">Plano & Identificação</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="rounded-lg border bg-card p-3">
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">ID 1PARA1</p>
                                        <p className="text-sm font-bold mt-1 font-mono ">
                                            {selectedUser.id_1para1
                                                ? <span className="text-purple-400">{selectedUser.id_1para1}</span>
                                                : <span className="text-muted-foreground">—</span>}
                                        </p>
                                    </div>
                                    <div className="rounded-lg border bg-card p-3">
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Plano</p>
                                        <p className="text-sm font-semibold mt-1 capitalize">{selectedUser.plan || <span className="text-muted-foreground">—</span>}</p>
                                    </div>
                                    <div className="rounded-lg border bg-card p-3">
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Perfil</p>
                                        <p className="text-sm font-semibold mt-1">
                                            {selectedUser.role === 'admin' && '🛡️ Admin'}
                                            {selectedUser.role === 'affiliate' && '🤝 Afiliado'}
                                            {selectedUser.role === 'user' && selectedUser.btag && <span className="text-orange-500">🔗 Lead Afiliado</span>}
                                            {selectedUser.role === 'user' && !selectedUser.btag && '👤 Direto'}
                                        </p>
                                    </div>
                                    <div className="rounded-lg border bg-card p-3">
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Cadastrado em</p>
                                        <p className="text-sm font-semibold mt-1">
                                            {selectedUser.created_at
                                                ? format(new Date(selectedUser.created_at), "dd/MM/yy HH:mm", { locale: ptBR })
                                                : <span className="text-muted-foreground">—</span>}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* ─── Linha 3: Acesso ─── */}
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">Acesso</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="rounded-lg border bg-card p-3">
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Último Acesso</p>
                                        <p className="text-sm font-semibold mt-1">
                                            {isOnline(selectedUser.last_seen)
                                                ? <span className="text-green-500">Agora</span>
                                                : selectedUser.last_seen
                                                    ? formatDistanceToNow(new Date(selectedUser.last_seen), { addSuffix: true, locale: ptBR })
                                                    : <span className="text-muted-foreground">—</span>
                                            }
                                        </p>
                                    </div>
                                    {selectedUser.partner_ref && (
                                        <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Afiliado (btag)</p>
                                            <p className="text-sm font-mono font-semibold mt-1 text-orange-400">{selectedUser.btag || selectedUser.partner_ref}</p>
                                        </div>
                                    )}
                                    {!selectedUser.partner_ref && selectedUser.btag && (
                                        <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Veio pelo Afiliado</p>
                                            <p className="text-sm font-mono font-semibold mt-1 text-orange-400">{selectedUser.btag}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ─── Trial ─── */}
                            {selectedUser.trial_expires_at && (
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">Free Trial</p>
                                    <div className={`rounded-xl border p-4 ${
                                        isPast(new Date(selectedUser.trial_expires_at))
                                            ? 'border-red-500/30 bg-red-500/5'
                                            : differenceInHours(new Date(selectedUser.trial_expires_at), new Date()) < 24
                                                ? 'border-yellow-500/30 bg-yellow-500/5'
                                                : 'border-emerald-500/30 bg-emerald-500/5'
                                    }`}>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Tempo Restante</p>
                                                <div className="mt-1 text-base font-bold">
                                                    <TrialBadge trialExpiresAt={selectedUser.trial_expires_at} />
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Expira em</p>
                                                <p className="text-sm font-semibold mt-1">
                                                    {format(new Date(selectedUser.trial_expires_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                                </p>
                                            </div>
                                        </div>
                                        {selectedUser.trial_activated_at && (
                                            <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
                                                <div>
                                                    <p className="text-muted-foreground">Ativado em</p>
                                                    <p className="font-medium">{format(new Date(selectedUser.trial_activated_at), "dd/MM/yy HH:mm", { locale: ptBR })}</p>
                                                </div>
                                                {selectedUser.trial_activated_by && (
                                                    <div>
                                                        <p className="text-muted-foreground">Aprovado por</p>
                                                        <p className="font-mono text-purple-400 truncate">{selectedUser.trial_activated_by.slice(0, 8)}…</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ─── ID Técnico ─── */}
                            <div className="rounded-lg border bg-muted/20 p-3">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">ID do Usuário (UUID)</p>
                                <p className="text-xs font-mono mt-1 text-muted-foreground break-all select-all">{selectedUser.id}</p>
                            </div>

                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
