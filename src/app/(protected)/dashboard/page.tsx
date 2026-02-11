"use client"

import { useState } from "react"
import { MultiplierChart } from "@/components/features/dashboard/multiplier-chart"
import { RecentHistoryTable } from "@/components/features/dashboard/recent-history"
import { SignalCard } from "@/components/features/dashboard/signal-card"
import { StatsGrid } from "@/components/features/dashboard/stats-grid"
import { PredictionCard } from "@/components/features/dashboard/prediction-card"

export default function DashboardPage() {
    const [selectedPlatform, setSelectedPlatform] = useState<string>("bravobet")

    // Mock active prediction for SignalCard
    const activePrediction = {
        id: "pred-1",
        time: "14:45",
        confidence: "high" as const,
        platform: "BravoBet",
        target_multiplier: 8.5
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Main Section */}
                <div className="md:col-span-8 lg:col-span-9 space-y-6">
                    <MultiplierChart />
                    <StatsGrid selectedPlatform={selectedPlatform} />
                    <PredictionCard selectedPlatform={selectedPlatform as 'bravobet' | 'superbet'} />
                    <RecentHistoryTable
                        selectedPlatform={selectedPlatform}
                        setSelectedPlatform={setSelectedPlatform}
                    />
                </div>

                {/* Sidebar Section */}
                <div className="md:col-span-4 lg:col-span-3 space-y-6">
                    <SignalCard prediction={activePrediction} />
                </div>
            </div>
        </div>
    )
}
