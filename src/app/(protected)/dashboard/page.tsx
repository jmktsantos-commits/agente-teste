"use client"

import { Suspense, useState } from "react"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { RecentHistoryTable } from "@/components/features/dashboard/recent-history"
import { SignalCard } from "@/components/features/dashboard/signal-card"
import { StatsGrid } from "@/components/features/dashboard/stats-grid"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Platform } from "@/lib/prediction-engine"

export default function DashboardPage() {
    const [selectedPlatform, setSelectedPlatform] = useState<Platform>("bravobet")

    return (
        <div className="space-y-6">
            {/* Top Section: Title + Selection */}
            <div className="flex flex-col items-center gap-8 py-8 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-purple-600/20 blur-[100px] rounded-full -z-10" />

                <div className="text-center space-y-2">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Painel de Controle</h2>
                    <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-white drop-shadow-xl">
                        Plataforma de <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">Análise</span>
                    </h1>
                </div>

                <Tabs defaultValue="bravobet" className="w-full max-w-[400px]" onValueChange={(v: string) => setSelectedPlatform(v as Platform)}>
                    <TabsList className="grid w-full grid-cols-2 bg-slate-900/80 backdrop-blur-md border border-white/10 h-14 p-1.5 rounded-full shadow-xl">
                        <TabsTrigger
                            value="bravobet"
                            className="text-sm font-black data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg h-full rounded-full transition-all"
                        >
                            BRAVOBET
                        </TabsTrigger>
                        <TabsTrigger
                            value="superbet"
                            className="text-sm font-black data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg h-full rounded-full transition-all"
                        >
                            SUPERBET
                        </TabsTrigger>
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
