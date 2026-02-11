"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Mock 24h x 7d grid
// Rows: Days (Mon-Sun), Cols: Hours (00-23)
const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
const hours = Array.from({ length: 24 }, (_, i) => i)

export function Heatmap() {
    // Generate random intensity for demo
    const getIntensity = (day: number, hour: number) => {
        // Higher intensity overlapping with "peak" hours (e.g., 18-22h)
        const base = Math.random()
        const isPeak = hour >= 18 && hour <= 22
        const intensity = isPeak ? base + 0.5 : base
        return Math.min(1, intensity)
    }

    const getColor = (intensity: number) => {
        if (intensity < 0.2) return "bg-slate-800"
        if (intensity < 0.4) return "bg-blue-900"
        if (intensity < 0.6) return "bg-blue-700"
        if (intensity < 0.8) return "bg-blue-500"
        return "bg-blue-300"
    }

    return (
        <Card className="bg-slate-900 border-slate-800 text-white overflow-hidden">
            <CardHeader>
                <CardTitle>Mapa de Calor (Horários Pagantes)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <div className="grid grid-cols-[auto_repeat(24,minmax(20px,1fr))] gap-1 min-w-[600px]">
                        <div className="h-6"></div> {/* CORNER */}
                        {hours.map((h) => (
                            <div key={h} className="text-[10px] text-center text-muted-foreground">
                                {h}h
                            </div>
                        ))}

                        {days.map((day, dayIndex) => (
                            <>
                                <div key={day} className="text-xs text-muted-foreground self-center pr-2">
                                    {day}
                                </div>
                                {hours.map((h) => (
                                    <div
                                        key={`${day}-${h}`}
                                        className={`h-6 w-full rounded-sm ${getColor(getIntensity(dayIndex, h))} transition-colors hover:opacity-80`}
                                        title={`${day} ${h}:00 - Alta probabilidade`}
                                    />
                                ))}
                            </>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
