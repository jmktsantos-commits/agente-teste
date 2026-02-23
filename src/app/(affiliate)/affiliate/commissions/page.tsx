"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { getAffiliateCommissions } from "@/app/actions/affiliate-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { DollarSign, Loader2, TrendingUp, Clock } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export default function AffiliateCommissionsPage() {
    const [commissions, setCommissions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { commissions: data } = await getAffiliateCommissions(user.id)
            setCommissions(data)
            setLoading(false)
        }
        load()
    }, [])

    const totalPending = commissions
        .filter(c => c.status === "pending")
        .reduce((sum, c) => sum + Number(c.amount), 0)

    const totalPaid = commissions
        .filter(c => c.status === "paid")
        .reduce((sum, c) => sum + Number(c.amount), 0)

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Minhas Comissões</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Histórico de comissões acumuladas pelas suas conversões.
                </p>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    {
                        label: "Total de Comissões",
                        value: `R$ ${(totalPending + totalPaid).toFixed(2)}`,
                        icon: TrendingUp,
                        color: "text-blue-500",
                        bg: "bg-blue-500/10",
                    },
                    {
                        label: "A Receber (Pendente)",
                        value: `R$ ${totalPending.toFixed(2)}`,
                        icon: Clock,
                        color: "text-yellow-500",
                        bg: "bg-yellow-500/10",
                    },
                    {
                        label: "Já Recebido",
                        value: `R$ ${totalPaid.toFixed(2)}`,
                        icon: DollarSign,
                        color: "text-emerald-500",
                        bg: "bg-emerald-500/10",
                    },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                    <Card key={label}>
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

            {/* Commissions Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Histórico de Comissões</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead>Lead</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead>Pago em</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : commissions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        Nenhuma comissão ainda. Continue captando leads!
                                    </TableCell>
                                </TableRow>
                            ) : commissions.map((c) => (
                                <TableRow key={c.id} className="hover:bg-muted/20">
                                    <TableCell className="font-medium">
                                        {c.lead?.full_name || "Lead removido"}
                                    </TableCell>
                                    <TableCell className="text-emerald-500 font-bold">
                                        R$ {Number(c.amount).toFixed(2)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            className={c.status === "paid"
                                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                                : c.status === "cancelled"
                                                    ? "bg-red-500/10 text-red-500 border-red-500/20"
                                                    : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                                            }
                                        >
                                            {c.status === "paid" ? "Pago" : c.status === "cancelled" ? "Cancelado" : "Pendente"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {c.paid_at ? format(new Date(c.paid_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
