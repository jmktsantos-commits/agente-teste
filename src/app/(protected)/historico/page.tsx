"use client"

import { useState } from "react"
import { History, BarChart2 } from "lucide-react"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { RecentHistoryTable } from "@/components/features/dashboard/recent-history"
import { StatsGrid } from "@/components/features/dashboard/stats-grid"
import type { Platform } from "@/lib/prediction-engine"

const PLATFORMS: { value: Platform; label: string }[] = [
    { value: "bravobet", label: "BravoBet" },
    { value: "superbet", label: "Superbet" },
    { value: "esportivabet", label: "EsportivaBet" },
]

export default function HistoricoPage() {
    const [selectedPlatform, setSelectedPlatform] = useState<Platform>("bravobet")

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col items-center gap-4 py-6">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 shadow-lg shadow-violet-500/20">
                        <History className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-wider bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                            Histórico
                        </h1>
                        <p className="text-sm text-muted-foreground">Últimas velas em tempo real</p>
                    </div>
                </div>

                {/* Platform Selector */}
                <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-900 border border-white/5">
                    {PLATFORMS.map((p) => (
                        <button
                            key={p.value}
                            onClick={() => setSelectedPlatform(p.value)}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                                selectedPlatform === p.value
                                    ? "bg-violet-600 text-white shadow-md shadow-violet-500/30"
                                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Grid */}
            <ErrorBoundary name="StatsGrid">
                <StatsGrid selectedPlatform={selectedPlatform} />
            </ErrorBoundary>

            {/* History Table */}
            <ErrorBoundary name="RecentHistoryTable">
                <RecentHistoryTable selectedPlatform={selectedPlatform} />
            </ErrorBoundary>
        </div>
    )
}
