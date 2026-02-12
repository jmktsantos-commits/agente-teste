"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { History } from "lucide-react"
import { cn } from "@/lib/utils"

type HistoryItem = {
    id: number
    multiplier: number
    platform: string
    round_time: string
}

type RecentHistoryTableProps = {
    selectedPlatform: string
}

export function RecentHistoryTable({ selectedPlatform }: RecentHistoryTableProps) {
    const [history, setHistory] = useState<HistoryItem[]>([])
    const supabase = createClient()

    useEffect(() => {
        setHistory([]) // Clear on switch

        const fetchHistory = async () => {
            const { data } = await supabase
                .from('crash_history')
                .select('*')
                .eq('platform', selectedPlatform)
                .order('round_time', { ascending: false })
                .limit(200)

            if (data) setHistory(data)
        }

        fetchHistory()

        // Realtime Subscription
        const channel = supabase
            .channel(`realtime_history_${selectedPlatform}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crash_history' }, (payload) => {
                const newItem = payload.new as HistoryItem
                if (newItem.platform === selectedPlatform) {
                    setHistory(prev => {
                        // Prevent duplicates
                        if (prev.some(item => item.id === newItem.id)) return prev;
                        return [newItem, ...prev].slice(0, 200)
                    })
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [selectedPlatform])

    const formatTimeSafe = (isoString: string) => {
        if (!isoString) return '--:--'
        const date = new Date(isoString)
        if (isNaN(date.getTime())) return '--:--'
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const getMultiplierColor = (multiplier: number) => {
        // Pink/Hot Pink for 10x+ (high multipliers)
        if (multiplier >= 10) return "bg-pink-600 border-pink-500 text-white shadow-[0_0_10px_rgba(236,72,153,0.3)]"

        // Purple/Violet for 2x-9.99x (medium multipliers)
        if (multiplier >= 2) return "bg-purple-600 border-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]"

        // Blue for 1x-1.99x (low multipliers)
        return "bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]"
    }

    return (
        <Card className="bg-slate-900/60 backdrop-blur-xl border-white/10 text-white shadow-xl">
            <CardHeader className="pb-4 border-b border-white/5">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <History className="w-5 h-5 text-slate-400" />
                    Histórico - <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 uppercase">{selectedPlatform}</span>
                    <span className="text-[10px] font-bold text-slate-400 ml-auto bg-white/5 border border-white/10 px-2 py-1 rounded-full">200 VELAS</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
                <div className="pr-2 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                        {history.map((row) => (
                            <div
                                key={row.id}
                                className={cn(
                                    "relative flex flex-col items-center justify-center p-2 rounded-lg border transition-all duration-300 hover:scale-105 hover:z-10 cursor-default",
                                    getMultiplierColor(row.multiplier)
                                )}
                            >
                                <span className="text-sm font-black drop-shadow-sm">
                                    {row.multiplier.toFixed(2)}x
                                </span>
                                <span className="text-[9px] opacity-80 font-mono font-medium">
                                    {formatTimeSafe(row.round_time)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
