"use client"

import { useState } from "react"
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    Brush
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const mockHistoryData = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    time: `${Math.floor(i / 4).toString().padStart(2, '0')}:00`,
    value: Math.max(1, (Math.random() * 20 + (Math.random() > 0.95 ? 50 : 0))).toFixed(2),
    platform: i % 2 === 0 ? "Superbet" : "Bravobet"
}))

export function HistoryChart() {
    const [data] = useState(mockHistoryData)

    return (
        <Card className="bg-slate-900 border-slate-800 text-white">
            <CardHeader>
                <CardTitle>Histórico de Multiplicadores</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorHistory" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2D2D44" />
                            <XAxis dataKey="time" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}x`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: "#1a1a2e", border: "none" }}
                                itemStyle={{ color: "#8884d8" }}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#8884d8"
                                fillOpacity={1}
                                fill="url(#colorHistory)"
                                strokeWidth={2}
                            />
                            <Brush dataKey="time" height={30} stroke="#8884d8" fill="#1a1a2e" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
