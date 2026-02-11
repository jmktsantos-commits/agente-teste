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

const mockData = Array.from({ length: 20 }, (_, i) => ({
    time: `${12 + Math.floor(i / 60)}:${(i % 60).toString().padStart(2, "0")}`,
    value: Math.max(1, (Math.random() * 10 + (Math.random() > 0.9 ? 20 : 0))).toFixed(2),
}))

export function MultiplierChart() {
    const [data, setData] = useState(mockData)

    useEffect(() => {
        const interval = setInterval(() => {
            setData((prev) => {
                const newData = [...prev.slice(1)]
                const lastTime = prev[prev.length - 1].time
                const [h, m] = lastTime.split(":").map(Number)
                let newM = m + 1
                let newH = h
                if (newM >= 60) {
                    newM = 0
                    newH = (newH + 1) % 24
                }
                newData.push({
                    time: `${newH}:${newM.toString().padStart(2, "0")}`,
                    value: Math.max(1, (Math.random() * 10 + (Math.random() > 0.9 ? 20 : 0))).toFixed(2),
                })
                return newData
            })
        }, 5000)
        return () => clearInterval(interval)
    }, [])

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
