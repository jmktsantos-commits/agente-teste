"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { getAffiliateLeads } from "@/app/actions/affiliate-actions"
import { AffiliateNewLeadDialog } from "@/components/affiliate/new-lead-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Loader2, Search, Users } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

const STATUS_COLORS: Record<string, string> = {
    new: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    contacted: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    interested: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    converted: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    lost: "bg-red-500/10 text-red-500 border-red-500/20",
}

const STATUS_LABELS: Record<string, string> = {
    new: "Novo", contacted: "Contactado", interested: "Interessado",
    converted: "Convertido", lost: "Perdido",
}

export default function AffiliateLeadsPage() {
    const [leads, setLeads] = useState<any[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState("")
    const [affiliateId, setAffiliateId] = useState<string>("")
    const supabase = createClient()
    const limit = 20

    const loadLeads = async (userId: string) => {
        setLoading(true)
        const { leads: data, total: t } = await getAffiliateLeads(userId, page, limit)
        setLeads(data)
        setTotal(t)
        setLoading(false)
    }

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            setAffiliateId(user.id)
            loadLeads(user.id)
        }
        init()
    }, [page])

    const filtered = search
        ? leads.filter((l: any) =>
            l.full_name?.toLowerCase().includes(search.toLowerCase()) ||
            l.phone?.includes(search) ||
            l.email?.toLowerCase().includes(search.toLowerCase())
        )
        : leads

    const totalPages = Math.ceil(total / limit)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Meus Leads</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Leads captados via link ou adicionados manualmente.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 bg-card text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{total}</span>
                    </div>
                    {affiliateId && (
                        <AffiliateNewLeadDialog
                            affiliateId={affiliateId}
                            onLeadCreated={() => loadLeads(affiliateId)}
                        />
                    )}
                </div>
            </div>

            <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    className="pl-8"
                    placeholder="Buscar por nome, telefone ou email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead>Nome</TableHead>
                                <TableHead>Contato</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Origem</TableHead>
                                <TableHead>Cadastrado em</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        {search ? "Nenhum lead encontrado." : "Nenhum lead ainda. Compartilhe seu link ou adicione manualmente!"}
                                    </TableCell>
                                </TableRow>
                            ) : filtered.map((lead) => (
                                <TableRow key={lead.id} className="hover:bg-muted/20 transition-colors">
                                    <TableCell className="font-medium">{lead.full_name}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {lead.phone || lead.email || "—"}
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={STATUS_COLORS[lead.status] || ""}>
                                            {STATUS_LABELS[lead.status] || lead.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground capitalize">
                                        {lead.source || "—"}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {format(new Date(lead.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                        Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                        Próxima
                    </Button>
                </div>
            )}
        </div>
    )
}
