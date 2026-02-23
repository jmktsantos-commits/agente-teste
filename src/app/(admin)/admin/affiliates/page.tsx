"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import {
    getAffiliates,
    createAffiliate,
    updateAffiliateStatus,
    updateCommissionRate,
    getAffiliateLeads,
    getAffiliateCommissions,
    payCommission,
    deleteAffiliate,
} from "@/app/actions/affiliate-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Users,
    Plus,
    MoreHorizontal,
    CheckCircle,
    Ban,
    Trash2,
    Eye,
    TrendingUp,
    DollarSign,
    UserCheck,
    Link,
    Copy,
    Loader2,
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

const STATUS_MAP: Record<string, { label: string; className: string }> = {
    active: { label: "Ativo", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
    pending: { label: "Pendente", className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
    suspended: { label: "Suspenso", className: "bg-red-500/10 text-red-500 border-red-500/20" },
}

export default function AffiliatesPage() {
    const [affiliates, setAffiliates] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState("all")
    const [showCreateDialog, setShowCreateDialog] = useState(false)
    const [selectedAffiliate, setSelectedAffiliate] = useState<any>(null)
    const [selectedAffLeads, setSelectedAffLeads] = useState<any[]>([])
    const [selectedAffCommissions, setSelectedAffCommissions] = useState<any[]>([])
    const [detailLoading, setDetailLoading] = useState(false)
    const [adminId, setAdminId] = useState<string>("")

    // Form state
    const [form, setForm] = useState({
        fullName: "",
        email: "",
        password: "",
        btag: "",
        commissionRate: "10",
    })
    const [formError, setFormError] = useState<string | null>(null)
    const [formLoading, setFormLoading] = useState(false)

    const supabase = createClient()

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user) setAdminId(data.user.id)
        })
    }, [])

    const loadAffiliates = async () => {
        setLoading(true)
        const { affiliates: data } = await getAffiliates(statusFilter === "all" ? undefined : statusFilter)
        setAffiliates(data)
        setLoading(false)
    }

    useEffect(() => {
        loadAffiliates()
    }, [statusFilter])

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setFormLoading(true)
        setFormError(null)

        const result = await createAffiliate({
            email: form.email,
            password: form.password,
            fullName: form.fullName,
            btag: form.btag.toLowerCase().trim(),
            commissionRate: parseFloat(form.commissionRate),
            adminId,
        })

        if (result.success) {
            setShowCreateDialog(false)
            setForm({ fullName: "", email: "", password: "", btag: "", commissionRate: "10" })
            loadAffiliates()
        } else {
            setFormError(result.error || "Erro ao criar afiliado")
        }
        setFormLoading(false)
    }

    const handleStatusChange = async (affiliateId: string, status: "active" | "suspended" | "pending") => {
        if (!confirm(`Tem certeza que deseja ${status === "active" ? "ativar" : "suspender"} este afiliado?`)) return
        await updateAffiliateStatus(affiliateId, status, adminId)
        loadAffiliates()
    }

    const handleDelete = async (affiliateId: string) => {
        if (!confirm("Tem certeza que deseja EXCLUIR permanentemente este afiliado? Esta ação não pode ser desfeita.")) return
        await deleteAffiliate(affiliateId)
        loadAffiliates()
    }

    const handleViewDetails = async (affiliate: any) => {
        setSelectedAffiliate(affiliate)
        setDetailLoading(true)
        const [{ leads }, { commissions }] = await Promise.all([
            getAffiliateLeads(affiliate.id, 1, 50),
            getAffiliateCommissions(affiliate.id),
        ])
        setSelectedAffLeads(leads)
        setSelectedAffCommissions(commissions)
        setDetailLoading(false)
    }

    const copyLink = (btag: string) => {
        navigator.clipboard.writeText(`${window.location.origin}/registro?btag=${btag}`)
    }

    const stats = {
        total: affiliates.length,
        active: affiliates.filter(a => a.status === "active").length,
        pending: affiliates.filter(a => a.status === "pending").length,
        totalLeads: affiliates.reduce((sum, a) => sum + (a.total_leads || 0), 0),
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gerenciar Afiliados</h1>
                    <p className="text-muted-foreground mt-1">Crie e gerencie sub-afiliados da plataforma.</p>
                </div>
                <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Novo Afiliado
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Total", value: stats.total, icon: Users, color: "text-blue-500" },
                    { label: "Ativos", value: stats.active, icon: UserCheck, color: "text-emerald-500" },
                    { label: "Pendentes", value: stats.pending, icon: TrendingUp, color: "text-yellow-500" },
                    { label: "Leads Totais", value: stats.totalLeads, icon: DollarSign, color: "text-purple-500" },
                ].map(({ label, value, icon: Icon, color }) => (
                    <Card key={label} className="bg-card border-border">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-muted ${color}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{value}</p>
                                    <p className="text-xs text-muted-foreground">{label}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filter Tabs + Table */}
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                <TabsList className="bg-muted/50">
                    <TabsTrigger value="all">Todos</TabsTrigger>
                    <TabsTrigger value="active">Ativos</TabsTrigger>
                    <TabsTrigger value="pending">Pendentes</TabsTrigger>
                    <TabsTrigger value="suspended">Suspensos</TabsTrigger>
                </TabsList>

                <TabsContent value={statusFilter} className="mt-4">
                    <div className="rounded-lg border bg-card overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead>Afiliado</TableHead>
                                    <TableHead>B-Tag</TableHead>
                                    <TableHead>Comissão</TableHead>
                                    <TableHead>Leads</TableHead>
                                    <TableHead>Conversões</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                        </TableCell>
                                    </TableRow>
                                ) : affiliates.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                            Nenhum afiliado encontrado.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    affiliates.map((aff) => (
                                        <TableRow key={aff.id} className="hover:bg-muted/20 transition-colors">
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{aff.full_name || "Sem nome"}</span>
                                                    <span className="text-xs text-muted-foreground">{aff.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <code className="text-xs bg-muted px-2 py-0.5 rounded">{aff.btag}</code>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={() => copyLink(aff.btag)}
                                                        title="Copiar link de indicação"
                                                    >
                                                        <Copy className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-medium text-emerald-500">{aff.commission_rate}%</span>
                                            </TableCell>
                                            <TableCell>{aff.total_leads || 0}</TableCell>
                                            <TableCell>{aff.total_conversions || 0}</TableCell>
                                            <TableCell>
                                                <Badge className={STATUS_MAP[aff.status]?.className}>
                                                    {STATUS_MAP[aff.status]?.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleViewDetails(aff)}>
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            Ver Detalhes / Leads
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => copyLink(aff.btag)}>
                                                            <Link className="mr-2 h-4 w-4" />
                                                            Copiar Link de Indicação
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        {aff.status !== "active" && (
                                                            <DropdownMenuItem onClick={() => handleStatusChange(aff.id, "active")}>
                                                                <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" />
                                                                Ativar
                                                            </DropdownMenuItem>
                                                        )}
                                                        {aff.status === "active" && (
                                                            <DropdownMenuItem onClick={() => handleStatusChange(aff.id, "suspended")}>
                                                                <Ban className="mr-2 h-4 w-4 text-yellow-500" />
                                                                Suspender
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-red-600"
                                                            onClick={() => handleDelete(aff.id)}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Excluir
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Create Affiliate Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Criar Novo Afiliado</DialogTitle>
                        <DialogDescription>
                            O afiliado receberá acesso ao painel de afiliado com a b-tag configurada.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 col-span-2">
                                <Label>Nome Completo</Label>
                                <Input
                                    placeholder="João da Silva"
                                    value={form.fullName}
                                    onChange={(e) => setForm(f => ({ ...f, fullName: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    placeholder="afiliado@email.com"
                                    value={form.email}
                                    onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label>Senha Inicial</Label>
                                <Input
                                    type="password"
                                    placeholder="Mínimo 8 caracteres"
                                    value={form.password}
                                    onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                                    required
                                    minLength={8}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>B-Tag (código único)</Label>
                                <Input
                                    placeholder="joao2024"
                                    value={form.btag}
                                    onChange={(e) => setForm(f => ({ ...f, btag: e.target.value.replace(/[^a-z0-9_-]/gi, '').toLowerCase() }))}
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    Link: /registro?btag={form.btag || "..."}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label>Comissão (%)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    value={form.commissionRate}
                                    onChange={(e) => setForm(f => ({ ...f, commissionRate: e.target.value }))}
                                    required
                                />
                            </div>
                        </div>
                        {formError && <p className="text-sm text-red-500">{formError}</p>}
                        <div className="flex gap-2 justify-end">
                            <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={formLoading}>
                                {formLoading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                                Criar Afiliado
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Affiliate Detail Dialog */}
            <Dialog open={!!selectedAffiliate} onOpenChange={(open) => !open && setSelectedAffiliate(null)}>
                <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedAffiliate?.full_name} — <code className="text-sm font-mono bg-muted px-1 rounded">{selectedAffiliate?.btag}</code>
                        </DialogTitle>
                        <DialogDescription>
                            Leads e comissões deste afiliado
                        </DialogDescription>
                    </DialogHeader>
                    {detailLoading ? (
                        <div className="flex items-center justify-center h-32">
                            <Loader2 className="w-6 h-6 animate-spin" />
                        </div>
                    ) : (
                        <Tabs defaultValue="leads">
                            <TabsList>
                                <TabsTrigger value="leads">Leads ({selectedAffLeads.length})</TabsTrigger>
                                <TabsTrigger value="commissions">Comissões ({selectedAffCommissions.length})</TabsTrigger>
                            </TabsList>
                            <TabsContent value="leads">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nome</TableHead>
                                            <TableHead>Telefone</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Data</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedAffLeads.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center text-muted-foreground h-16">
                                                    Nenhum lead ainda.
                                                </TableCell>
                                            </TableRow>
                                        ) : selectedAffLeads.map((lead) => (
                                            <TableRow key={lead.id}>
                                                <TableCell>{lead.full_name}</TableCell>
                                                <TableCell>{lead.phone || "-"}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{lead.status}</Badge>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {format(new Date(lead.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TabsContent>
                            <TabsContent value="commissions">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Lead</TableHead>
                                            <TableHead>Valor</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Data</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedAffCommissions.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center text-muted-foreground h-16">
                                                    Nenhuma comissão ainda.
                                                </TableCell>
                                            </TableRow>
                                        ) : selectedAffCommissions.map((c) => (
                                            <TableRow key={c.id}>
                                                <TableCell>{c.lead?.full_name || "-"}</TableCell>
                                                <TableCell className="text-emerald-500 font-medium">
                                                    R$ {Number(c.amount).toFixed(2)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={c.status === "paid"
                                                        ? "bg-emerald-500/10 text-emerald-500"
                                                        : "bg-yellow-500/10 text-yellow-500"
                                                    }>
                                                        {c.status === "paid" ? "Pago" : "Pendente"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                                </TableCell>
                                                <TableCell>
                                                    {c.status === "pending" && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={async () => {
                                                                await payCommission(c.id)
                                                                const { commissions } = await getAffiliateCommissions(selectedAffiliate.id)
                                                                setSelectedAffCommissions(commissions)
                                                            }}
                                                        >
                                                            Marcar como Pago
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TabsContent>
                        </Tabs>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
