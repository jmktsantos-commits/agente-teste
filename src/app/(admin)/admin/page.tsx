"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, Activity, Signal, UserPlus, TrendingUp } from "lucide-react"
import { getDashboardStats, getOnlineUsers, getRegistrationStats, getActivityStats } from "@/app/actions/admin-actions"
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

export default function AdminDashboardPage() {
    const [stats, setStats] = useState({ totalUsers: 0, active24h: 0, onlineNow: 0, newToday: 0 })
    const [onlineUsers, setOnlineUsers] = useState<any[]>([])
    const [regStats, setRegStats] = useState<any[]>([])
    const [activityStats, setActivityStats] = useState<any[]>([])

    useEffect(() => {
        const fetchAll = async () => {
            const [dashStats, online, reg, activity] = await Promise.all([
                getDashboardStats(),
                getOnlineUsers(),
                getRegistrationStats(),
                getActivityStats()
            ])
            setStats(dashStats)
            setOnlineUsers(online.users)
            setRegStats(reg.stats)
            setActivityStats(activity.stats)
        }

        fetchAll()
        const interval = setInterval(fetchAll, 30000)
        return () => clearInterval(interval)
    }, [])

    const statCards = [
        {
            title: "Total de Usuários",
            value: stats.totalUsers,
            icon: Users,
            description: "Cadastrados na plataforma",
            gradient: "from-blue-500/10 to-blue-600/5",
            iconColor: "text-blue-500",
            borderColor: "border-blue-500/20"
        },
        {
            title: "Ativos (24h)",
            value: stats.active24h,
            icon: Activity,
            description: "Acessaram no último dia",
            gradient: "from-emerald-500/10 to-emerald-600/5",
            iconColor: "text-emerald-500",
            borderColor: "border-emerald-500/20"
        },
        {
            title: "Online Agora",
            value: stats.onlineNow,
            icon: Signal,
            description: "Ativos nos últimos 5 min",
            gradient: "from-green-500/10 to-green-600/5",
            iconColor: "text-green-500",
            borderColor: "border-green-500/20"
        },
        {
            title: "Novos Hoje",
            value: stats.newToday,
            icon: UserPlus,
            description: "Registrados hoje",
            gradient: "from-purple-500/10 to-purple-600/5",
            iconColor: "text-purple-500",
            borderColor: "border-purple-500/20"
        }
    ]

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard Administrativo</h1>
                <p className="text-muted-foreground mt-1">Visão geral do sistema e usuários em tempo real.</p>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((card, i) => (
                    <Card key={i} className={`relative overflow-hidden border ${card.borderColor}`}>
                        <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient}`} />
                        <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                            <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                        </CardHeader>
                        <CardContent className="relative">
                            <div className="text-3xl font-bold">{card.value}</div>
                            <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Registration Trend */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-blue-500" />
                            <div>
                                <CardTitle className="text-base">Registros (7 dias)</CardTitle>
                                <CardDescription>Novos usuários por dia</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={regStats}>
                                    <defs>
                                        <linearGradient id="regGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "hsl(var(--card))",
                                            border: "1px solid hsl(var(--border))",
                                            borderRadius: "8px",
                                            color: "hsl(var(--foreground))"
                                        }}
                                    />
                                    <Area type="monotone" dataKey="count" stroke="hsl(217, 91%, 60%)" fill="url(#regGradient)" strokeWidth={2} name="Registros" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Activity by Hour */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-emerald-500" />
                            <div>
                                <CardTitle className="text-base">Atividade (24h)</CardTitle>
                                <CardDescription>Acessos por hora</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={activityStats}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" interval={2} />
                                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "hsl(var(--card))",
                                            border: "1px solid hsl(var(--border))",
                                            borderRadius: "8px",
                                            color: "hsl(var(--foreground))"
                                        }}
                                    />
                                    <Bar dataKey="count" fill="hsl(152, 69%, 53%)" radius={[4, 4, 0, 0]} name="Acessos" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Online Users Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Signal className="h-5 w-5 text-green-500" />
                                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                                </span>
                            </div>
                            <div>
                                <CardTitle className="text-base">Usuários Online Agora</CardTitle>
                                <CardDescription>{onlineUsers.length} usuário(s) ativo(s) nos últimos 5 minutos</CardDescription>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {onlineUsers.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">Nenhum usuário online no momento.</p>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {onlineUsers.map((user) => (
                                <div key={user.id} className="flex items-center gap-3 rounded-lg border p-3 bg-card hover:bg-accent/50 transition-colors">
                                    <div className="relative">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-white text-sm font-semibold">
                                            {(user.full_name || user.email || "?").charAt(0).toUpperCase()}
                                        </div>
                                        <span className="absolute bottom-0 right-0 flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-background" />
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{user.full_name || "Sem nome"}</p>
                                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
