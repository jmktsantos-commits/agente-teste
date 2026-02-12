"use client"

import { useEffect, useState } from "react"
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { createClient } from "@/utils/supabase/client"

interface MultiplierChartProps {
    selectedPlatform: string
}

export function MultiplierChart({ selectedPlatform }: MultiplierChartProps) {
    const [data, setData] = useState<{ time: string, value: number }[]>([])
    const supabase = createClient()

    useEffect(() => {
        const fetchData = async () => {
            const { data: history } = await supabase
                .from('crash_history')
                .select('multiplier, round_time')
                .eq('platform', selectedPlatform)
                .order('round_time', { ascending: false })
                .limit(20)

            if (history) {
                const formatted = history.reverse().map(item => ({
                    time: formatTimeSafe(item.round_time),
                    value: parseFloat(item.multiplier.toFixed(2))
                }))
                setData(formatted)
            }
        }

        const formatTimeSafe = (isoString: string) => {
            if (!isoString) return '--:--'
            const date = new Date(isoString)
            if (isNaN(date.getTime())) return '--:--'
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }

        fetchData()

        // Realtime subscription
        const channel = supabase
            .channel(`multiplier_chart_${selectedPlatform}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'crash_history'
            }, (payload) => {
                const newItem = payload.new as { platform: string, multiplier: number, round_time: string }
                if (newItem.platform === selectedPlatform) {
                    setData(prev => {
                        const newData = [...prev, {
                            time: formatTimeSafe(newItem.round_time),
                            value: parseFloat(newItem.multiplier.toFixed(2))
                        }]
                        return newData.slice(-20)
                    })
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [selectedPlatform])

    return (
        <Card className="col-span-1 md:col-span-2 lg:col-span-3 bg-slate-900 border-slate-800 text-white">
            <CardHeader>
                <CardTitle>Ao Vivo</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#E94560" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#E94560" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2D2D44" />
                            <XAxis dataKey="time" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}x`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: "#1a1a2e", border: "none" }}
                                itemStyle={{ color: "#E94560" }}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#E94560"
                                fillOpacity={1}
                                fill="url(#colorValue)"
                                strokeWidth={2}
                                animationDuration={1000}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
