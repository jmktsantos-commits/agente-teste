"use client"

import { ErrorBoundary } from "@/components/ui/error-boundary"
import { RecentHistoryTable } from "@/components/features/dashboard/recent-history"
import { SignalCard } from "@/components/features/dashboard/signal-card"
import { StatsGrid } from "@/components/features/dashboard/stats-grid"
import type { Platform } from "@/lib/prediction-engine"

export default function DashboardPage() {
    const selectedPlatform: Platform = "bravobet"

    return (
        <div className="flex flex-col gap-6">
            {/* Top Section: Title */}
            <div className="flex flex-col items-center gap-6 py-6">
                <h1 className="text-3xl md:text-4xl font-black uppercase tracking-wider bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent text-center">
                    Histórico de Jogadas
                </h1>
            </div>

            {/* 1. Signal Card */}
            <ErrorBoundary name="SignalCard">
                <SignalCard selectedPlatform={selectedPlatform} />
            </ErrorBoundary>

            {/* 2. Stats Grid */}
            <ErrorBoundary name="StatsGrid">
                <StatsGrid selectedPlatform={selectedPlatform} />
            </ErrorBoundary>

            {/* 3. History Table */}
            <ErrorBoundary name="RecentHistoryTable">
                <RecentHistoryTable selectedPlatform={selectedPlatform} />
            </ErrorBoundary>
        </div>
    )
}
