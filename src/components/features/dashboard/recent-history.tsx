"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { History } from "lucide-react"

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
        <Card className="bg-slate-900 border-slate-800 text-white">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <History className="w-5 h-5 text-slate-400" />
                    Histórico - {selectedPlatform === 'bravobet' ? 'Bravobet' : 'Superbet'}
                    <span className="text-xs font-normal text-slate-500 ml-auto bg-slate-800 px-2 py-1 rounded">200 velas</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="pr-2">
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                        {history.map((row) => (
                            <div
                                key={row.id}
                                className={`
                                    relative flex flex-col items-center justify-center p-2 rounded-md border transition-all duration-300
                                    ${getMultiplierColor(row.multiplier)}
                                `}
                            >
                                <span className="text-sm font-bold">
                                    {row.multiplier.toFixed(2)}x
                                </span>
                                <span className="text-[9px] opacity-70 font-mono">
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
