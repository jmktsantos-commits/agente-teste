"use client"

import { useState } from "react"
import { ExternalLink } from "lucide-react"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { RecentHistoryTable } from "@/components/features/dashboard/recent-history"
import { SignalCard } from "@/components/features/dashboard/signal-card"
import { StatsGrid } from "@/components/features/dashboard/stats-grid"
import type { Platform } from "@/lib/prediction-engine"

const CASINO_URL = "https://1pra1.bet.br/Jean"

export default function DashboardPage() {
    const selectedPlatform: Platform = "bravobet"
    const [iframeLoading, setIframeLoading] = useState(true)
    const [iframeError, setIframeError] = useState(false)

    return (
        <div className="flex flex-col gap-6">
            {/* Top Section: Title + Badge */}
            <div className="flex flex-col items-center gap-6 py-6">
                <h1 className="text-3xl md:text-4xl font-black uppercase tracking-wider bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent text-center">
                    Plataforma de Análise
                </h1>

                <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-5 py-2">
                    <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                    <span className="text-sm font-bold text-purple-300 tracking-widest uppercase">1PARA1</span>
                </div>
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

            {/* 4. Iframe 1PARA1 — tela cheia */}
            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-purple-500/10 flex flex-col" style={{ height: "calc(100vh - 80px)", minHeight: "600px" }}>
                {/* Header da seção */}
                <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30">
                            <span className="text-base">🎯</span>
                        </div>
                        <div>
                            <p className="text-xs text-purple-400/70 uppercase tracking-widest font-semibold">Parceira Oficial</p>
                            <p className="text-white font-bold text-sm leading-tight">1PARA1 — Jogar Aqui</p>
                        </div>
                    </div>
                    <a
                        href={CASINO_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors border border-purple-500/30 hover:border-purple-400/50 rounded-lg px-3 py-1.5"
                    >
                        <ExternalLink className="h-3 w-3" />
                        Abrir em nova aba
                    </a>
                </div>

                {/* Iframe */}
                <div className="relative bg-slate-950 flex-1" style={{ minHeight: "500px" }}>
                    {/* Loading skeleton */}
                    {iframeLoading && !iframeError && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950">
                            <div className="w-12 h-12 rounded-full border-2 border-purple-500/30 border-t-purple-400 animate-spin" />
                            <p className="text-sm text-muted-foreground">Carregando 1PARA1...</p>
                        </div>
                    )}

                    {/* Fallback se iframe for bloqueado */}
                    {iframeError && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-slate-950 px-6 text-center">
                            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                                <span className="text-3xl">🎯</span>
                            </div>
                            <div>
                                <p className="text-white font-bold text-lg mb-1">Abrir 1PARA1</p>
                                <p className="text-sm text-muted-foreground max-w-xs">
                                    A plataforma bloqueou o carregamento embutido. Clique abaixo para acessar diretamente.
                                </p>
                            </div>
                            <a
                                href={CASINO_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-3 rounded-xl transition-all"
                            >
                                <ExternalLink className="h-4 w-4" />
                                Acessar 1PARA1 Agora
                            </a>
                        </div>
                    )}

                    <iframe
                        src={CASINO_URL}
                        title="1PARA1 — Aviator"
                        className={`w-full h-full border-0 transition-opacity duration-500 ${iframeLoading || iframeError ? "opacity-0" : "opacity-100"}`}
                        style={{ display: "block", overflow: "hidden" }}
                        onLoad={() => setIframeLoading(false)}
                        onError={() => { setIframeError(true); setIframeLoading(false) }}
                        allow="fullscreen"
                        scrolling="no"
                    />
                </div>

                {/* Rodapé */}
                <div className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900/80 border-t border-white/5">
                    <span className="text-xs text-gray-600">🔒 Jogue com responsabilidade · +18 · Parceria oficial 1PARA1</span>
                </div>
            </div>
        </div>
    )
}
