"use client"

import { Suspense, useState } from "react"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { RecentHistoryTable } from "@/components/features/dashboard/recent-history"
import { SignalCard } from "@/components/features/dashboard/signal-card"
import { StatsGrid } from "@/components/features/dashboard/stats-grid"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function DashboardPage() {
    const [selectedPlatform, setSelectedPlatform] = useState<string>("bravobet")

    return (
        <div className="space-y-6">
            {/* Top Section: Title + Selection */}
            <div className="flex flex-col items-center gap-6 py-6">
                <h1 className="text-3xl md:text-4xl font-black uppercase tracking-wider bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent text-center">
                    Plataforma de Análise
                </h1>

                <Tabs defaultValue="bravobet" className="w-full max-w-[400px]" onValueChange={setSelectedPlatform}>
                    <TabsList className="grid w-full grid-cols-2 bg-slate-900 border border-slate-800 h-12 p-1">
                        <TabsTrigger value="bravobet" className="text-sm font-bold data-[state=active]:bg-purple-600 data-[state=active]:text-white h-full">BRAVOBET</TabsTrigger>
                        <TabsTrigger value="superbet" className="text-sm font-bold data-[state=active]:bg-pink-600 data-[state=active]:text-white h-full">SUPERBET</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* 1. Signal Card (Destaque Principal) */}
            <ErrorBoundary name="SignalCard">
                <SignalCard selectedPlatform={selectedPlatform} />
            </ErrorBoundary>

            {/* 2. Stats Grid (Estatísticas da Sessão) */}
            <ErrorBoundary name="StatsGrid">
                <StatsGrid selectedPlatform={selectedPlatform} />
            </ErrorBoundary>

            {/* 3. History Table (Single Filtered View) */}
            <ErrorBoundary name="RecentHistoryTable">
                <RecentHistoryTable selectedPlatform={selectedPlatform} />
            </ErrorBoundary>
        </div>
    )
}
