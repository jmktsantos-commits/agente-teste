"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, AlertTriangle, Activity, DollarSign } from "lucide-react"

export default function AdminPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Painel Administrativo</h1>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-slate-900 border-slate-800 text-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Total Usuários</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">1,482</div>
                        <p className="text-xs text-muted-foreground">+180 no último mês</p>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800 text-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Receita Mensal</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">R$ 42.300</div>
                        <p className="text-xs text-muted-foreground">+12% vs mês anterior</p>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800 text-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Sinais Enviados</CardTitle>
                        <Activity className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">8,234</div>
                        <p className="text-xs text-muted-foreground">94% de assertividade</p>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800 text-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Reports de Chat</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">3</div>
                        <p className="text-xs text-muted-foreground">Requer atenção</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="bg-slate-900 border-slate-800 text-white">
                    <CardHeader>
                        <CardTitle>Últimos Usuários</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-400 text-sm">Lista de usuários recentes...</p>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800 text-white">
                    <CardHeader>
                        <CardTitle>Histórico de Moderação</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-400 text-sm">Log de ações do sistema...</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
