import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type HistoryItem = {
    id: number
    multiplier: number
    platform: string
    round_time: string
}

type RecentHistoryTableProps = {
    selectedPlatform: string
    setSelectedPlatform: (platform: string) => void
}

export function RecentHistoryTable({ selectedPlatform, setSelectedPlatform }: RecentHistoryTableProps) {
    const [history, setHistory] = useState<HistoryItem[]>([])
    const supabase = createClient()

    useEffect(() => {
        setHistory([]) // Clear current list on switch for better UX

        // Initial Fetch
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
            .channel('realtime_history')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crash_history' }, (payload) => {
                const newItem = payload.new as HistoryItem

                // Filter incoming events based on selected platform
                if (newItem.platform !== selectedPlatform) {
                    return;
                }

                setHistory((prev) => {
                    // Prevent duplicates by checking if ID already exists
                    if (prev.some(item => item.id === newItem.id)) {
                        return prev;
                    }
                    // Add new item and sort by round_time descending to maintain chronological order
                    const updated = [newItem, ...prev];
                    updated.sort((a, b) => new Date(b.round_time).getTime() - new Date(a.round_time).getTime());
                    return updated.slice(0, 200);
                })
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [selectedPlatform])

    const getMultiplierColor = (multiplier: number) => {
        // Solid colors for better visibility
        if (multiplier >= 10) return "bg-pink-600 border-pink-500 text-white shadow-[0_0_10px_rgba(236,72,153,0.3)]"
        if (multiplier >= 2) return "bg-purple-600 border-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]"
        return "bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]"
    }

    return (
        <Card className="bg-slate-900 border-slate-800 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-xl font-bold">Histórico de Rodadas (últimas 200 velas)</CardTitle>
                <Tabs defaultValue="bravobet" className="w-[240px]" onValueChange={setSelectedPlatform}>
                    <TabsList className="grid w-full grid-cols-2 bg-slate-800">
                        <TabsTrigger value="bravobet">Bravobet</TabsTrigger>
                        <TabsTrigger value="superbet">Superbet</TabsTrigger>
                    </TabsList>
                </Tabs>
            </CardHeader>
            <CardContent>
                <div className="h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                        {history.map((row) => (
                            <div
                                key={row.id}
                                className={`
                                relative flex flex-col items-center justify-center p-2 rounded-lg border transition-all duration-300 hover:scale-105 cursor-default
                                ${getMultiplierColor(row.multiplier)}
                            `}
                            >
                                <span className="text-sm font-bold">
                                    {row.multiplier.toFixed(2)}x
                                </span>
                                <span className="text-[9px] opacity-80 font-mono">
                                    {new Date(row.round_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>

                                {/* Platform Indicator */}
                                <div
                                    className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${row.platform === 'superbet' ? 'bg-red-400' : 'bg-green-400'} border border-black/20`}
                                    title={row.platform === 'superbet' ? 'Superbet' : 'Bravobet'}
                                />
                            </div>
                        ))}
                        {history.length === 0 && (
                            <div className="col-span-full text-center text-slate-500 py-12 flex flex-col items-center gap-2">
                                <div className="w-8 h-8 border-2 border-slate-700 border-t-slate-400 rounded-full animate-spin" />
                                <p>Carregando histórico...</p>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
