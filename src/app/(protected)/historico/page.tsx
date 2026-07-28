"use client"

import { History, BarChart2 } from "lucide-react"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { RecentHistoryTable } from "@/components/features/dashboard/recent-history"
import { StatsGrid } from "@/components/features/dashboard/stats-grid"
import type { Platform } from "@/lib/prediction-engine"


export default function HistoricoPage() {
    const selectedPlatform: Platform = "bravobet"

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
