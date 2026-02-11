"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { TrendingUp, Zap, Sparkles, Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type StatsGridProps = {
    selectedPlatform: string
}

export function StatsGrid({ selectedPlatform }: StatsGridProps) {
    const [stats, setStats] = useState({
        maxToday: 0,
        maxTime: '',
        pinkCount: 0,
        pinkPercent: 0,
        purpleCount: 0,
        purplePercent: 0,
        blueCount: 0,
        bluePercent: 0
    })
    const supabase = createClient()

    useEffect(() => {
        const fetchStats = async () => {
            const now = new Date()
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

            // 1. Maior do Dia (full day data)
            const { data: maxData } = await supabase
                .from('crash_history')
                .select('multiplier, round_time')
                .eq('platform', selectedPlatform)
                .gte('round_time', startOfDay)
                .order('multiplier', { ascending: false })
                .limit(1)

            // 2. Last 200 rounds for percentages
            const { data: last200 } = await supabase
                .from('crash_history')
                .select('multiplier')
                .eq('platform', selectedPlatform)
                .order('round_time', { ascending: false })
                .limit(200)

            if (last200) {
                const total = last200.length

                // Rosas (10x+)
                const pinks = last200.filter(d => d.multiplier >= 10).length
                const pinkPercent = total > 0 ? (pinks / total) * 100 : 0

                // Vela Roxa (2x-10x)
                const purples = last200.filter(d => d.multiplier >= 2 && d.multiplier < 10).length
                const purplePercent = total > 0 ? (purples / total) * 100 : 0

                // Vela Azul (<2x)
                const blues = last200.filter(d => d.multiplier < 2).length
                const bluePercent = total > 0 ? (blues / total) * 100 : 0

                setStats({
                    maxToday: maxData?.[0]?.multiplier || 0,
                    maxTime: maxData?.[0]?.round_time || '',
                    pinkCount: pinks,
                    pinkPercent,
                    purpleCount: purples,
                    purplePercent,
                    blueCount: blues,
                    bluePercent
                })
            }
        }

        fetchStats()

        // Subscribe to updates
        const channel = supabase
            .channel('realtime_stats')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crash_history' }, (payload) => {
                const newItem = payload.new as { platform: string }
                // Only refetch if it's for the current platform
                if (newItem.platform === selectedPlatform) {
                    fetchStats()
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [selectedPlatform])

    const formatTime = (isoString: string) => {
        if (!isoString) return '--:--:--'
        const date = new Date(isoString)
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-slate-900 border-slate-800 text-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">
                        Maior do Dia
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-pink-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-pink-500">{stats.maxToday.toFixed(2)}x</div>
                    <p className="text-xs text-muted-foreground">
                        {formatTime(stats.maxTime)}
                    </p>
                </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800 text-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">
                        Rosas (10x+)
                    </CardTitle>
                    <Zap className="h-4 w-4 text-pink-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-pink-400">{stats.pinkCount}</div>
                    <p className="text-xs text-muted-foreground">
                        {stats.pinkPercent.toFixed(1)}% das últimas 200
                    </p>
                </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800 text-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">
                        Vela Roxa (2x-10x)
                    </CardTitle>
                    <Sparkles className="h-4 w-4 text-purple-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-purple-400">{stats.purpleCount}</div>
                    <p className="text-xs text-muted-foreground">
                        {stats.purplePercent.toFixed(1)}% das últimas 200
                    </p>
                </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800 text-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">
                        Vela Azul (&lt;2x)
                    </CardTitle>
                    <Activity className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-blue-400">{stats.blueCount}</div>
                    <p className="text-xs text-muted-foreground">
                        {stats.bluePercent.toFixed(1)}% das últimas 200
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
