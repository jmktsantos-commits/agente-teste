"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { History, Wifi, WifiOff, RefreshCw } from "lucide-react"

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
    const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
    const [newItemId, setNewItemId] = useState<number | null>(null) // para flash visual
    const [loading, setLoading] = useState(true)
    const supabaseRef = useRef(createClient())

    const fetchHistory = useCallback(async () => {
        const { data, error } = await supabaseRef.current
            .from('crash_history')
            .select('*')
            .eq('platform', selectedPlatform)
            .order('round_time', { ascending: false })
            .limit(200)

        if (error) {
            console.error('[History] Fetch error:', error.message)
        }
        if (data) {
            setHistory(data)
            setLastUpdate(new Date())
        }
        setLoading(false)
    }, [selectedPlatform])

    useEffect(() => {
        setHistory([])
        setLoading(true)
        setRealtimeStatus('connecting')

        const supabase = supabaseRef.current

        // Busca inicial
        fetchHistory()

        // Polling a cada 10s como fallback robusto
        const pollInterval = setInterval(fetchHistory, 10000)

        // Realtime via Supabase Postgres Changes
        const channelName = `history_${selectedPlatform}_${Date.now()}`
        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'crash_history',
                    filter: `platform=eq.${selectedPlatform}`
                },
                (payload) => {
                    const newItem = payload.new as HistoryItem
                    setHistory(prev => {
                        if (prev.some(item => item.id === newItem.id)) return prev
                        return [newItem, ...prev].slice(0, 200)
                    })
                    setLastUpdate(new Date())
                    // Flash visual no item novo
                    setNewItemId(newItem.id)
                    setTimeout(() => setNewItemId(null), 1500)
                }
            )
            .subscribe((status) => {
                console.log(`[History] Realtime (${selectedPlatform}):`, status)
                if (status === 'SUBSCRIBED') setRealtimeStatus('connected')
                else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setRealtimeStatus('error')
                else setRealtimeStatus('connecting')
            })

        return () => {
            clearInterval(pollInterval)
            supabase.removeChannel(channel)
        }
    }, [selectedPlatform, fetchHistory])

    // Atualiza o "há X segundos" a cada segundo
    const [, setTick] = useState(0)
    useEffect(() => {
        const t = setInterval(() => setTick(n => n + 1), 1000)
        return () => clearInterval(t)
    }, [])

    const formatTimeSafe = (isoString: string) => {
        if (!isoString) return '--:--'
        const date = new Date(isoString)
        if (isNaN(date.getTime())) return '--:--'
        return date.toLocaleTimeString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        })
    }

    const getLastUpdateLabel = () => {
        if (!lastUpdate) return null
        const secs = Math.floor((Date.now() - lastUpdate.getTime()) / 1000)
        if (secs < 5) return 'agora mesmo'
        if (secs < 60) return `há ${secs}s`
        return `há ${Math.floor(secs / 60)}min`
    }

    const getMultiplierColor = (multiplier: number) => {
        if (multiplier >= 10) return "bg-pink-600 border-pink-500 text-white shadow-[0_0_10px_rgba(236,72,153,0.3)]"
        if (multiplier >= 2) return "bg-purple-600 border-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]"
        return "bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]"
    }

    return (
        <Card className="bg-slate-900 border-slate-800 text-white">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold flex flex-wrap items-center gap-2">
                    <History className="w-5 h-5 text-slate-400 shrink-0" />
                    <span>Histórico - {selectedPlatform === 'bravobet' ? '1PARA1' : selectedPlatform === 'esportivabet' ? 'EsportivaBet' : 'Superbet'}</span>

                    {/* Status Realtime */}
                    <div className="ml-auto flex items-center gap-2">
                        {realtimeStatus === 'connected' ? (
                            <span className="flex items-center gap-1.5 text-xs font-normal text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                                <Wifi className="w-3 h-3" />
                                Ao vivo
                                {lastUpdate && (
                                    <span className="text-emerald-400/60">· {getLastUpdateLabel()}</span>
                                )}
                            </span>
                        ) : realtimeStatus === 'connecting' ? (
                            <span className="flex items-center gap-1.5 text-xs font-normal text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                Conectando...
                            </span>
                        ) : (
                            <span
                                onClick={fetchHistory}
                                title="Clique para atualizar"
                                className="flex items-center gap-1.5 text-xs font-normal text-slate-400 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-full cursor-pointer hover:text-white transition-colors"
                            >
                                <WifiOff className="w-3 h-3" />
                                Polling 10s
                                {lastUpdate && (
                                    <span className="opacity-60">· {getLastUpdateLabel()}</span>
                                )}
                            </span>
                        )}
                        <span className="text-xs font-normal text-slate-500 bg-slate-800 px-2 py-1 rounded">
                            {history.length} velas
                        </span>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex items-center justify-center py-10 gap-3 text-slate-500">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Carregando histórico...</span>
                    </div>
                ) : history.length === 0 ? (
                    <div className="flex items-center justify-center py-10 text-slate-500 text-sm">
                        Nenhum dado disponível para esta plataforma.
                    </div>
                ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                        {history.map((row) => (
                            <div
                                key={row.id}
                                className={`
                                    relative flex flex-col items-center justify-center p-2 rounded-md border
                                    transition-all duration-300
                                    ${getMultiplierColor(row.multiplier)}
                                    ${newItemId === row.id ? 'scale-110 ring-2 ring-white/60 z-10' : 'scale-100'}
                                `}
                            >
                                {newItemId === row.id && (
                                    <div className="absolute inset-0 rounded-md bg-white/20 animate-ping" />
                                )}
                                <span className="text-sm font-bold relative z-10">
                                    {row.multiplier.toFixed(2)}x
                                </span>
                                <span className="text-[9px] opacity-70 font-mono relative z-10">
                                    {formatTimeSafe(row.round_time)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
